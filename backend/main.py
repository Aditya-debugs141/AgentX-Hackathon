"""Small FastAPI bridge between AgentX and the Hermes HTTP API."""

from __future__ import annotations

import base64
import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env", override=False)

logger = logging.getLogger("agentx")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

AUTH_TOKEN_TTL_SECONDS = 15 * 60
SYSTEM_PROMPT_PATH = ROOT_DIR / "sysprompt.txt"
DEFAULT_MODEL = "openai/gpt-oss-20b"


def env_value(*names: str) -> Optional[str]:
    """Return the first non-empty environment value."""
    for name in names:
        value = os.getenv(name)
        if value and value.strip():
            return value.strip()
    return None


def system_prompt() -> str:
    """Read the root system prompt for each request so it stays configurable."""
    try:
        prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except OSError as exc:
        logger.error("[CONFIG] Cannot read %s: %s", SYSTEM_PROMPT_PATH, exc)
        raise HTTPException(status_code=500, detail="sysprompt.txt is missing or unreadable.") from exc
    if not prompt:
        raise HTTPException(status_code=500, detail="sysprompt.txt is empty.")
    return prompt


# ---------------------------------------------------------------------------
# Browser session authentication
# ---------------------------------------------------------------------------

def auth_secret() -> str:
    secret = env_value("AUTH_SIGNING_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="AUTH_SIGNING_SECRET is not configured on the server.")
    return secret


def encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def issue_session_token() -> str:
    now = int(time.time())
    payload = {"iat": now, "exp": now + AUTH_TOKEN_TTL_SECONDS, "sid": secrets.token_urlsafe(16)}
    body = encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(auth_secret().encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{encode(signature)}"


def require_session(authorization: Optional[str] = Header(None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid session token")

    try:
        body, signature = authorization[7:].strip().split(".", 1)
        expected = hmac.new(auth_secret().encode(), body.encode(), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if not hmac.compare_digest(expected, supplied) or int(payload["exp"]) <= int(time.time()):
            raise ValueError("invalid or expired token")
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=401, detail="Invalid or expired session token")


# ---------------------------------------------------------------------------
# API models and Hermes response normalization
# ---------------------------------------------------------------------------

class ConversationTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    history: List[ConversationTurn] = Field(default_factory=list)


class AssistantMessage(BaseModel):
    role: str = "assistant"
    content: str


class AgentExecution(BaseModel):
    name: str
    status: str


class Execution(BaseModel):
    planner: Optional[str] = None
    agents: List[AgentExecution] = Field(default_factory=list)
    trace: List[str] = Field(default_factory=list)


class UICard(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class Source(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    url: Optional[str] = None


class ChatResponse(BaseModel):
    version: str = "1.0"
    conversation_id: str
    message: AssistantMessage
    execution: Execution = Field(default_factory=Execution)
    cards: List[UICard] = Field(default_factory=list)
    sources: List[Source] = Field(default_factory=list)


def unwrap(data: Any) -> Dict[str, Any]:
    """Accept Hermes envelopes that wrap the actual response under `response`."""
    current = data
    for _ in range(3):
        if isinstance(current, str):
            try:
                current = json.loads(current)
            except json.JSONDecodeError:
                return {"message": {"role": "assistant", "content": current}}
        if not isinstance(current, dict):
            return {}
        nested = current.get("response")
        if isinstance(nested, (dict, str)):
            current = nested
        else:
            return current
    return current if isinstance(current, dict) else {}


def parse_json_object(value: Any) -> Optional[Dict[str, Any]]:
    if isinstance(value, dict):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text.startswith("{"):
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def message_from(data: Dict[str, Any]) -> Dict[str, str]:
    if isinstance(data.get("message"), dict):
        message = data["message"]
        return {"role": str(message.get("role", "assistant")), "content": str(message.get("content", ""))}

    choices = data.get("choices") or []
    first = choices[0] if choices and isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first, dict) else {}
    if isinstance(message, dict) and message.get("content") is not None:
        return {"role": str(message.get("role", "assistant")), "content": str(message["content"])}

    def find_content(value: Any) -> Optional[str]:
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            nested_message = value.get("message")
            if isinstance(nested_message, dict) and nested_message.get("content") is not None:
                return str(nested_message["content"])
            for key in ("content", "text", "output", "response", "result"):
                found = find_content(value.get(key))
                if found:
                    return found
        if isinstance(value, list):
            parts = [find_content(item) for item in value]
            return "".join(part for part in parts if part)
        return None

    return {"role": "assistant", "content": find_content(data) or ""}


def normalize_response(data: Any, conversation_id: str) -> ChatResponse:
    data = unwrap(data)
    inner = parse_json_object(message_from(data).get("content"))
    if inner and any(key in inner for key in ("version", "message", "execution", "cards", "sources")):
        data = unwrap(inner)

    cards: List[UICard] = []
    for raw_card in data.get("cards", []) or []:
        if not isinstance(raw_card, dict):
            continue
        card = dict(raw_card)
        if not isinstance(card.get("payload"), dict):
            card["payload"] = {key: value for key, value in card.items() if key != "type"}
        cards.append(UICard.model_validate(card))

    sources = [Source.model_validate(item) for item in data.get("sources", []) or [] if isinstance(item, dict)]
    return ChatResponse(
        version=str(data.get("version", "1.0")),
        conversation_id=str(data.get("conversation_id", conversation_id)),
        message=AssistantMessage.model_validate(message_from(data)),
        execution=Execution.model_validate(data.get("execution") or {}),
        cards=cards,
        sources=sources,
    )


def hermes_url() -> str:
    url = env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")
    if not url:
        raise HTTPException(status_code=500, detail="HERMES_ENDPOINT is not configured on the server.")
    return url


def hermes_base_url() -> str:
    """Derive Hermes' API root from the configured OpenAI-compatible endpoint."""
    url = hermes_url().rstrip("/")
    for suffix in ("/v1/chat/completions", "/v1/responses", "/v1"):
        if url.endswith(suffix):
            return url[: -len(suffix)]
    return url


def hermes_headers(stream: bool = False) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if stream:
        headers["Accept"] = "text/event-stream"
    key = env_value("HERMES_API_KEY", "API_SERVER_KEY")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    return headers


def hermes_model() -> str:
    """Use the fast GPT-OSS model for every bridge request by default."""
    return env_value("HERMES_MODEL") or DEFAULT_MODEL


def hermes_payload(request: ChatRequest) -> Dict[str, Any]:
    history: List[Dict[str, str]] = []
    for turn in request.history[-20:]:
        role = "assistant" if turn.role == "assistant" else "user"
        content = turn.content.strip()
        if content:
            history.append({"role": role, "content": content})

    return {
        "model": hermes_model(),
        "session_id": request.conversation_id,
        "conversation_id": request.conversation_id,
        "messages": [
            {"role": "system", "content": system_prompt()},
            *history,
            {"role": "user", "content": request.message},
        ],
    }


def hermes_run_payload(request: ChatRequest) -> Dict[str, Any]:
    """Build the native Hermes Runs API request.

    Runs are preferable for the bridge because their event stream includes
    lifecycle, tool, and subagent events instead of only assistant tokens.
    """
    return {
        "model": hermes_model(),
        "input": request.message,
        "session_id": request.conversation_id,
        "instructions": system_prompt(),
    }


def sse_frame(payload: Dict[str, Any], event: Optional[str] = None) -> bytes:
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}")
    return ("\n".join(lines) + "\n\n").encode("utf-8")


def parse_sse_frame(frame: bytes) -> Tuple[Optional[str], str]:
    event_name: Optional[str] = None
    data_lines: List[str] = []
    for raw_line in frame.decode("utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(":"):
            continue
        if line.startswith("event:"):
            event_name = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].strip())
    return event_name, "\n".join(data_lines)


def openai_delta(data: Dict[str, Any]) -> str:
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first = choices[0]
    if not isinstance(first, dict):
        return ""
    delta = first.get("delta")
    if isinstance(delta, dict) and isinstance(delta.get("content"), str):
        return delta["content"]
    message = first.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"]
    return ""


def finish_reason(data: Dict[str, Any]) -> Optional[str]:
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        return None
    value = choices[0].get("finish_reason")
    return str(value) if value else None


def normalize_stream_event(event_name: Optional[str], data_text: str) -> Tuple[List[Dict[str, Any]], str, bool]:
    if not data_text:
        return [], "", False
    if data_text == "[DONE]":
        return [{"type": "stream.done"}], "", True

    try:
        parsed = json.loads(data_text)
    except json.JSONDecodeError:
        return [{"type": event_name or "message.delta", "delta": data_text}], data_text, False

    if not isinstance(parsed, dict):
        return [], "", False

    if event_name:
        event_payload = {"type": event_name, **parsed}
        if event_name == "hermes.tool.progress":
            tool_name = str(parsed.get("tool") or "Hermes tool")
            status = str(parsed.get("status") or "running")
            label = parsed.get("label")
            agent_status = "completed" if status == "completed" else "failed" if status == "failed" else "running"
            events = [
                event_payload,
                {
                    "type": "agent.status",
                    "agent": {"name": tool_name, "status": agent_status},
                    "trace": f"{tool_name}: {label}" if isinstance(label, str) and label else f"{tool_name} {status}",
                },
            ]
            return events, "", False
        return [event_payload], "", False

    delta = openai_delta(parsed)
    events: List[Dict[str, Any]] = []
    if delta:
        events.append({"type": "message.delta", "delta": delta})
    return events, delta, False


# ---------------------------------------------------------------------------
# FastAPI endpoints
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "[CONFIG] endpoint=%s hermes_key=%s auth_secret=%s system_prompt=%s",
        bool(env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")),
        bool(env_value("HERMES_API_KEY", "API_SERVER_KEY")),
        bool(env_value("AUTH_SIGNING_SECRET")),
        SYSTEM_PROMPT_PATH.is_file(),
    )
    yield


app = FastAPI(title="AgentX Hermes Bridge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/session")
async def create_session() -> Dict[str, Any]:
    return {"token": issue_session_token(), "expires_in": AUTH_TOKEN_TTL_SECONDS}


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "hermes_configured": bool(env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")),
        "mode": os.getenv("HERMES_MODE", "proxy"),
    }


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_session)])
async def chat(request: ChatRequest) -> ChatResponse:
    url = hermes_url()
    logger.info("[CHAT] conversation_id=%s", request.conversation_id)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, json=hermes_payload(request), headers=hermes_headers())
            response.raise_for_status()
        result = normalize_response(response.json(), request.conversation_id)
        logger.info("[CHAT] completed agents=%s cards=%s sources=%s", len(result.execution.agents), len(result.cards), len(result.sources))
        return result
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"Hermes error: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        logger.error("[CHAT] Hermes connection failed: %r", exc)
        raise HTTPException(status_code=502, detail="Could not connect to Hermes.") from exc


@app.post("/chat/stream", dependencies=[Depends(require_session)])
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    completions_url = hermes_url()

    async def relay() -> AsyncIterator[bytes]:
        async def frames_with_heartbeats(response: httpx.Response) -> AsyncIterator[bytes]:
            """Flush each upstream SSE frame independently.

            Hermes or a reverse proxy may place many SSE frames in one HTTP
            chunk. Forwarding that chunk unchanged makes the browser render
            all tool activity at once, so split on the SSE record delimiter.
            """
            iterator = response.aiter_raw().__aiter__()
            pending = asyncio.create_task(iterator.__anext__())
            buffer = b""
            try:
                while True:
                    done, _ = await asyncio.wait({pending}, timeout=10)
                    if not done:
                        yield b": upstream run still active\n\n"
                        continue
                    try:
                        chunk = pending.result()
                    except StopAsyncIteration:
                        if buffer.strip():
                            yield buffer
                        return
                    if chunk:
                        buffer += chunk
                        while b"\n\n" in buffer:
                            frame, buffer = buffer.split(b"\n\n", 1)
                            if frame.strip():
                                yield frame + b"\n\n"
                    pending = asyncio.create_task(iterator.__anext__())
            finally:
                    if not pending.done():
                        pending.cancel()

        yield b': stream connected; waiting for Hermes events\n\n'
        yield sse_frame({"type": "stream.connected", "message": "Connected to Hermes"})

        accumulated_text = ""
        execution = Execution(planner="Venturi")
        cards: List[UICard] = []
        sources: List[Source] = []

        try:
            timeout = httpx.Timeout(connect=15.0, read=None, write=30.0, pool=15.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                payload = dict(hermes_payload(request), stream=True)
                async with client.stream("POST", completions_url, json=payload, headers=hermes_headers(stream=True)) as response:
                    if response.status_code >= 400:
                        body = await response.aread()
                        logger.error("[STREAM] Hermes SSE returned status=%s body=%s", response.status_code, body[:500])
                        yield sse_frame({"type": "error", "status": response.status_code, "message": "Hermes stream request failed"})
                        return

                    async for frame in frames_with_heartbeats(response):
                        event_name, data_text = parse_sse_frame(frame)
                        events, delta, done = normalize_stream_event(event_name, data_text)
                        accumulated_text += delta
                        for event in events:
                            trace = event.get("trace")
                            if isinstance(trace, str) and trace not in execution.trace:
                                execution.trace.append(trace)
                            agent = event.get("agent")
                            if isinstance(agent, dict) and isinstance(agent.get("name"), str):
                                status = str(agent.get("status") or "running")
                                execution.agents = [item for item in execution.agents if item.name != agent["name"]]
                                execution.agents.append(AgentExecution(name=str(agent["name"]), status=status))
                            yield sse_frame(event)
                        if done:
                            break

                final = normalize_response(
                    {
                        "version": "1.0",
                        "conversation_id": request.conversation_id,
                        "message": {"role": "assistant", "content": accumulated_text.strip()},
                        "execution": execution.model_dump(),
                        "cards": [card.model_dump() for card in cards],
                        "sources": [source.model_dump() for source in sources],
                    },
                    request.conversation_id,
                )
                yield sse_frame({"type": "run.completed", "response": final.model_dump()})
        except httpx.RequestError as exc:
            logger.error("[STREAM] Hermes connection failed: %r", exc)
            yield sse_frame({"type": "error", "status": 502, "message": "Hermes connection failed"})

    return StreamingResponse(
        relay(),
        status_code=200,
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Vary": "Accept",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
