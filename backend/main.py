import os
import logging
import httpx
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import Any, AsyncIterator, Dict, List, Optional

# Load the local file for development, while preserving variables injected by
# Vercel (python-dotenv does not overwrite existing environment variables).
# Vercel does not deploy the ignored .env file, so production values must be
# configured in the Vercel project settings.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
SYSTEM_PROMPT_PATH = Path(__file__).resolve().parents[1] / "sysprompt.txt"


def env_value(*names: str) -> Optional[str]:
    """Return the first configured environment value, trimmed for dashboard input."""
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return None


def load_system_prompt() -> str:
    """Load the configurable Hermes system prompt from the repository root."""
    try:
        prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except OSError as exc:
        logger.error("[CONFIG ERROR] Could not load system prompt from %s: %s", SYSTEM_PROMPT_PATH, exc)
        raise HTTPException(status_code=500, detail="sysprompt.txt is missing or unreadable on the server.") from exc

    if not prompt:
        logger.error("[CONFIG ERROR] System prompt file is empty: %s", SYSTEM_PROMPT_PATH)
        raise HTTPException(status_code=500, detail="sysprompt.txt is empty on the server.")
    return prompt

# Configure standard logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("agentx")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] AgentX API is starting up...")
    logger.info(
        "[CONFIG] HERMES_ENDPOINT loaded=%s; HERMES_API_KEY loaded=%s; "
        "WEB_API_KEY loaded=%s; system_prompt_loaded=%s; mode=%s",
        bool(env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")),
        bool(env_value("HERMES_API_KEY", "API_SERVER_KEY")),
        bool(env_value("WEB_API_KEY")),
        SYSTEM_PROMPT_PATH.is_file() and SYSTEM_PROMPT_PATH.stat().st_size > 0,
        os.getenv("HERMES_MODE", "proxy"),
    )
    yield
    logger.info("[SHUTDOWN] AgentX API is shutting down...")

app = FastAPI(
    title="AgentX - Simple Integration Bridge",
    description="A simplified backend to proxy requests to a Hermes Agent.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    conversation_id: str
    message: str

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


def _hermes_message(data: Dict[str, Any]) -> Dict[str, str]:
    """Read either the AgentX envelope or an OpenAI-compatible Hermes result."""
    message = data.get("message")
    if isinstance(message, dict):
        content = message.get("content", "")
        return {"role": str(message.get("role", "assistant")), "content": str(content)}

    choices = data.get("choices") or []
    choice_message = choices[0].get("message", {}) if choices and isinstance(choices[0], dict) else {}
    content = choice_message.get("content", "") if isinstance(choice_message, dict) else ""
    return {"role": "assistant", "content": str(content)}


def _structured_response(data: Dict[str, Any], conversation_id: str) -> ChatResponse:
    """Normalize Hermes metadata without inventing agent activity on the client."""
    message = _hermes_message(data)
    execution_data = data.get("execution")
    execution = Execution.model_validate(execution_data or {})

    cards = []
    for card in (data.get("cards") or []):
        if not isinstance(card, dict):
            continue
        # Accept both the canonical {type, payload} shape and the flattened
        # shape shown in early Hermes responses.
        normalized_card = dict(card)
        if not isinstance(normalized_card.get("payload"), dict):
            normalized_card["payload"] = {
                key: value for key, value in normalized_card.items() if key != "type"
            }
        cards.append(UICard.model_validate(normalized_card))
    sources = [Source.model_validate(source) for source in (data.get("sources") or []) if isinstance(source, dict)]

    return ChatResponse(
        version=str(data.get("version", "1.0")),
        conversation_id=str(data.get("conversation_id", conversation_id)),
        message=AssistantMessage.model_validate(message),
        execution=execution,
        cards=cards,
        sources=sources,
    )

def verify_frontend_api_key(x_api_key: Optional[str] = Header(None)):
    """Optional security: check API key from frontend if WEB_API_KEY is set."""
    web_api_key = os.getenv("WEB_API_KEY")
    logger.info(
        "[CONFIG] WEB_API_KEY loaded=%s; request_key_received=%s",
        bool(web_api_key and web_api_key.strip()),
        bool(x_api_key),
    )
    if web_api_key and x_api_key != web_api_key:
        logger.warning("[AUTH] Web API key verification failed!")
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")
    logger.info("[AUTH] Web API key verified successfully.")

@app.get("/health")
async def health_check():
    """Health check endpoint for frontend status indicator."""
    has_endpoint = bool(env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL"))
    return {
        "status": "ok",
        "hermes_configured": has_endpoint,
        "mode": os.getenv("HERMES_MODE", "proxy")
    }

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_frontend_api_key)])
async def chat_endpoint(request: ChatRequest):
    """Proxies a chat message to the Hermes Agent and returns the response."""
    target_url = env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")
    hermes_api_key = env_value("HERMES_API_KEY", "API_SERVER_KEY") or ""

    logger.info(f"[REQUEST RECEIVED] conversation_id='{request.conversation_id}', message='{request.message}'")

    if not target_url:
        logger.error("[CONFIG ERROR] Neither HERMES_ENDPOINT nor HERMES_ENDPOINT_URL is set in environment!")
        raise HTTPException(
            status_code=500,
            detail="HERMES_ENDPOINT environment variable is missing on server."
        )

    # Prepare the request for the Hermes Agent (OpenAI compatible)
    headers = {"Content-Type": "application/json"}
    if hermes_api_key:
        headers["Authorization"] = f"Bearer {hermes_api_key}"

    payload = {
        "model": "hermes-agent",
        "messages": [
            {"role": "system", "content": load_system_prompt()},
            {"role": "user", "content": request.message},
        ]
    }

    logger.info(f"[FORWARDING] Forwarding request to Hermes Agent at {target_url}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(target_url, json=payload, headers=headers)
            logger.info(f"[HERMES RESPONSE] Status={res.status_code}")
            
            res.raise_for_status() # Raise an exception for 4xx or 5xx status codes

            data = res.json()
            
            response = _structured_response(data, request.conversation_id)
            logger.info(
                "[SUCCESS] Reply received (%s chars); agents=%s; cards=%s; sources=%s",
                len(response.message.content),
                len(response.execution.agents),
                len(response.cards),
                len(response.sources),
            )
            return response

        except httpx.HTTPStatusError as exc:
            # Handle 4xx/5xx errors from the Hermes Agent
            logger.error(f"[HERMES ERROR] Status={exc.response.status_code}, Body={exc.response.text}")
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Hermes Agent: {exc.response.text}")
        except httpx.RequestError as exc:
            # Handle network errors (e.g., connection refused)
            logger.error(f"[HTTP REQUEST FAILED] Connection error targeting '{target_url}': {exc}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Hermes Agent: {str(exc)}")


@app.post("/chat/stream", dependencies=[Depends(verify_frontend_api_key)])
async def chat_stream_endpoint(request: ChatRequest):
    """Proxy Hermes SSE events immediately so progress reaches the browser."""
    target_url = env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")
    hermes_api_key = env_value("HERMES_API_KEY", "API_SERVER_KEY") or ""

    if not target_url:
        raise HTTPException(status_code=500, detail="HERMES_ENDPOINT environment variable is missing on server.")

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
    if hermes_api_key:
        headers["Authorization"] = f"Bearer {hermes_api_key}"

    payload = {
        "model": "hermes-agent",
        "stream": True,
        "messages": [
            {"role": "system", "content": load_system_prompt()},
            {"role": "user", "content": request.message},
        ],
    }

    async def relay() -> AsyncIterator[bytes]:
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream("POST", target_url, json=payload, headers=headers) as response:
                    if response.status_code >= 400:
                        body = await response.aread()
                        logger.error("[HERMES STREAM ERROR] Status=%s, Body=%s", response.status_code, body.decode(errors="replace"))
                        yield f'data: {{"type":"error","status":{response.status_code}}}\n\n'.encode()
                        return

                    async for chunk in response.aiter_raw():
                        if chunk:
                            yield chunk
            except httpx.RequestError as exc:
                logger.error("[HTTP STREAM FAILED] Connection error targeting '%s': %s", target_url, exc)
                yield b'data: {"type":"error","status":502}\n\n'

    return StreamingResponse(
        relay(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
