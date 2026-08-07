import os
import hmac
import hashlib
import json
import logging
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Load local environment variables from .env file if present
load_dotenv()

# Configure standard logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("agentx")

app = FastAPI(title="AgentX - Integration Bridge API")

# Allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    """Optional security layer: check API key from frontend if WEB_API_KEY env var is configured."""
    web_api_key = os.getenv("WEB_API_KEY", "")
    if web_api_key:
        if x_api_key != web_api_key:
            logger.warning("[AUTH] Web API key verification failed!")
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")
        logger.info("[AUTH] Web API key verified successfully.")

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_frontend_api_key)])
async def chat_endpoint(request: ChatRequest):
    """
    Integration point for Hermes Agent AI.
    Routes to Hermes Proxy (OpenAI API spec) or Hermes Webhook (HMAC signed) depending on HERMES_MODE.
    """
    # Guard: Check and load env variables if they are not loaded yet
    if not os.getenv("HERMES_ENDPOINT") and not os.getenv("HERMES_ENDPOINT_URL"):
        logger.info("[ENV] HERMES_ENDPOINT not found in environment, attempting to load from .env file...")
        load_dotenv()

    # Dynamic environment variable lookup on every request
    hermes_mode = os.getenv("HERMES_MODE", "proxy").lower()
    raw_endpoint = os.getenv("HERMES_ENDPOINT") or os.getenv("HERMES_ENDPOINT_URL", "")
    hermes_hmac_secret = os.getenv("HERMES_HMAC_SECRET", "")
    hermes_api_key = os.getenv("HERMES_API_KEY") or os.getenv("API_SERVER_KEY") or ""

    logger.info(f"[REQUEST RECEIVED] conversation_id='{request.conversation_id}', message='{request.message}'")

    if not raw_endpoint:
        logger.error("[CONFIG ERROR] Neither HERMES_ENDPOINT nor HERMES_ENDPOINT_URL is set in environment!")
        raise HTTPException(
            status_code=500,
            detail="HERMES_ENDPOINT environment variable is missing on server."
        )

    # Determine full target URL
    target_url = raw_endpoint.strip()
    if hermes_mode == "proxy":
        if not target_url.endswith("/v1/chat/completions") and not target_url.endswith("/chat/completions"):
            target_url = target_url.rstrip("/") + "/v1/chat/completions"

    logger.info(f"[FORWARDING] Mode={hermes_mode}, Target URL={target_url}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        if hermes_mode == "proxy":
            headers = {"Content-Type": "application/json"}
            if hermes_api_key:
                headers["Authorization"] = f"Bearer {hermes_api_key}"
                masked_key = hermes_api_key[:4] + "..." + hermes_api_key[-4:] if len(hermes_api_key) > 8 else "***"
            else:
                masked_key = "NONE"

            # Log equivalent cURL command for debugging/verification
            curl_cmd = f"""[CURL EQUIVALENT LOG]
curl {target_url} \\
  -H "Authorization: Bearer {masked_key}" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "model": "hermes-agent",
    "messages": [
      {{
        "role": "user",
        "content": "{request.message}"
      }}
    ]
  }}'"""
            logger.info(curl_cmd)

            payload = {
                "model": "hermes-agent",
                "messages": [
                    {"role": "user", "content": request.message}
                ]
            }

            try:
                res = await client.post(target_url, json=payload, headers=headers)
                logger.info(f"[HERMES RESPONSE] Status={res.status_code}")
                
                if res.status_code != 200:
                    logger.error(f"[HERMES ERROR RESPONSE] Status={res.status_code}, Body={res.text}")
                    raise HTTPException(status_code=res.status_code, detail=f"Hermes Proxy error ({res.status_code}): {res.text}")

                data = res.json()
                
                # Parse OpenAI style choices
                reply_text = ""
                if "choices" in data and len(data["choices"]) > 0:
                    choice = data["choices"][0]
                    if "message" in choice and "content" in choice["message"]:
                        reply_text = choice["message"]["content"]
                    elif "text" in choice:
                        reply_text = choice["text"]
                elif "response" in data:
                    reply_text = data["response"]
                elif "reply" in data:
                    reply_text = data["reply"]
                else:
                    reply_text = str(data)

                logger.info(f"[SUCCESS] Reply received ({len(reply_text)} chars)")

                return ChatResponse(
                    reply=reply_text,
                    conversation_id=request.conversation_id,
                    trace=["Hermes Agent Execution"],
                    sources=[]
                )
            except httpx.RequestError as exc:
                logger.error(f"[HTTP REQUEST FAILED] Connection error targeting '{target_url}': {exc}")
                raise HTTPException(status_code=502, detail=f"Failed to connect to Hermes Agent at {target_url}: {str(exc)}")

        elif hermes_mode == "webhook":
            raw_body = json.dumps({"payload": request.message, "conversation_id": request.conversation_id}).encode('utf-8')
            signature = hmac.new(hermes_hmac_secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
            
            headers = {
                "Content-Type": "application/json",
                "X-Hub-Signature-256": f"sha256={signature}"
            }
            
            logger.info(f"[WEBHOOK SIGNATURE] Calculated signature sha256={signature[:8]}...")

            try:
                res = await client.post(target_url, data=raw_body, headers=headers)
                logger.info(f"[HERMES WEBHOOK RESPONSE] Status={res.status_code}")

                if res.status_code != 200:
                    logger.error(f"[HERMES WEBHOOK ERROR] Status={res.status_code}, Body={res.text}")
                    raise HTTPException(status_code=res.status_code, detail=f"Hermes Webhook error ({res.status_code}): {res.text}")

                return ChatResponse(
                    reply="Triggered Hermes Agent run via webhook successfully.",
                    conversation_id=request.conversation_id,
                    trace=["Hermes Webhook Triggered"],
                    sources=[]
                )
            except httpx.RequestError as exc:
                logger.error(f"[WEBHOOK FAILED] Connection error targeting '{target_url}': {exc}")
                raise HTTPException(status_code=502, detail=f"Failed to connect to Hermes Webhook at {target_url}: {str(exc)}")

        else:
            logger.error(f"[CONFIG ERROR] Unknown HERMES_MODE '{hermes_mode}'")
            raise HTTPException(status_code=500, detail=f"Invalid HERMES_MODE '{hermes_mode}' configured.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
