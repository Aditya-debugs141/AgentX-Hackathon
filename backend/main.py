import os
import hmac
import hashlib
import json
import logging
import httpx
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Load the local file for development, while preserving variables injected by
# Vercel (python-dotenv does not overwrite existing environment variables).
# Vercel does not deploy the ignored .env file, so production values must be
# configured in the Vercel project settings.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def env_value(*names: str) -> Optional[str]:
    """Return the first configured environment value, trimmed for dashboard input."""
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return None

# Configure standard logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("agentx")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] AgentX API is starting up...")
    logger.info(
        "[CONFIG] HERMES_ENDPOINT loaded=%s; HERMES_API_KEY loaded=%s; "
        "WEB_API_KEY loaded=%s; mode=%s",
        bool(env_value("HERMES_ENDPOINT", "HERMES_ENDPOINT_URL")),
        bool(env_value("HERMES_API_KEY", "API_SERVER_KEY")),
        bool(env_value("WEB_API_KEY")),
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

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    trace: List[str]
    sources: List[str]

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
        "messages": [{"role": "user", "content": request.message}]
    }

    logger.info(f"[FORWARDING] Forwarding request to Hermes Agent at {target_url}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(target_url, json=payload, headers=headers)
            logger.info(f"[HERMES RESPONSE] Status={res.status_code}")
            
            res.raise_for_status() # Raise an exception for 4xx or 5xx status codes

            data = res.json()
            
            # Extract the reply from the OpenAI-style response
            reply_text = ""
            try:
                reply_text = data["choices"][0]["message"]["content"]
            except (IndexError, KeyError, TypeError) as e:
                logger.error(f"Could not parse reply from Hermes response: {e}. Full response: {data}")
                reply_text = f"Error parsing agent response: {str(data)}"

            logger.info(f"[SUCCESS] Reply received ({len(reply_text)} chars)")

            return ChatResponse(
                reply=reply_text,
                conversation_id=request.conversation_id,
                trace=["Hermes Agent Execution"], # Simplified trace
                sources=[]
            )

        except httpx.HTTPStatusError as exc:
            # Handle 4xx/5xx errors from the Hermes Agent
            logger.error(f"[HERMES ERROR] Status={exc.response.status_code}, Body={exc.response.text}")
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Hermes Agent: {exc.response.text}")
        except httpx.RequestError as exc:
            # Handle network errors (e.g., connection refused)
            logger.error(f"[HTTP REQUEST FAILED] Connection error targeting '{target_url}': {exc}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Hermes Agent: {str(exc)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
