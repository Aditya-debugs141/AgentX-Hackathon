import os
import hmac
import hashlib
import json
import logging
import httpx
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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

# Environment configuration
HERMES_MODE = os.getenv("HERMES_MODE", "proxy")  # "proxy" or "webhook"
# Read HERMES_ENDPOINT or HERMES_ENDPOINT_URL
HERMES_ENDPOINT_URL = os.getenv("HERMES_ENDPOINT") or os.getenv("HERMES_ENDPOINT_URL", "")
HERMES_HMAC_SECRET = os.getenv("HERMES_HMAC_SECRET", "")
FRONTEND_API_KEY = os.getenv("FRONTEND_API_KEY", "")

class ChatRequest(BaseModel):
    conversation_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    trace: List[str]
    sources: List[str]

def verify_frontend_api_key(x_api_key: Optional[str] = Header(None)):
    """Optional security layer: check API key from frontend if FRONTEND_API_KEY env var is configured on Vercel."""
    if FRONTEND_API_KEY:
        if x_api_key != FRONTEND_API_KEY:
            logger.warning("[AUTH] Frontend API key verification failed!")
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")
        logger.info("[AUTH] Frontend API key verified successfully.")

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_frontend_api_key)])
async def chat_endpoint(request: ChatRequest):
    """
    Integration point for Hermes Agent AI.
    Routes to Hermes Proxy (OpenAI API spec) or Hermes Webhook (HMAC signed) depending on HERMES_MODE.
    """
    logger.info(f"[REQUEST RECEIVED] conversation_id='{request.conversation_id}', message='{request.message}'")

    if not HERMES_ENDPOINT_URL:
        logger.warning("[CONFIG WARNING] HERMES_ENDPOINT / HERMES_ENDPOINT_URL is not set! Returning mock response.")
        return ChatResponse(
            reply=f"Received: '{request.message}'. (Set HERMES_ENDPOINT to connect to live Hermes Agent!)",
            conversation_id=request.conversation_id,
            trace=[
                "Planner analyzed request",
                "Placement Agent checked eligibility",
                "Knowledge Agent consulted policy"
            ],
            sources=["Placement Policy 2026"]
        )

    # Determine full target URL
    target_url = HERMES_ENDPOINT_URL.strip()
    if HERMES_MODE == "proxy":
        if not target_url.endswith("/v1/chat/completions") and not target_url.endswith("/chat/completions"):
            target_url = target_url.rstrip("/") + "/v1/chat/completions"

    logger.info(f"[FORWARDING] Mode={HERMES_MODE}, Target URL={target_url}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        if HERMES_MODE == "proxy":
            headers = {"Content-Type": "application/json"}
            hermes_api_key = os.getenv("HERMES_API_KEY") or os.getenv("API_SERVER_KEY")
            if hermes_api_key:
                headers["Authorization"] = f"Bearer {hermes_api_key}"
                masked_key = hermes_api_key[:4] + "..." + hermes_api_key[-4:] if len(hermes_api_key) > 8 else "***"
            else:
                masked_key = "NONE"

            # Print equivalent cURL command for debugging/verification in Vercel logs
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
                    raise HTTPException(status_code=res.status_code, detail=f"Hermes Proxy error: {res.text}")

                data = res.json()
                reply_text = data["choices"][0]["message"]["content"]
                logger.info(f"[SUCCESS] Reply length={len(reply_text)} chars")

                return ChatResponse(
                    reply=reply_text,
                    conversation_id=request.conversation_id,
                    trace=["Hermes Proxy Execution"],
                    sources=[]
                )
            except httpx.RequestError as exc:
                logger.error(f"[HTTP REQUEST FAILED] Connection error targeting '{target_url}': {exc}")
                raise HTTPException(status_code=502, detail=f"Failed to connect to Hermes Agent at {target_url}: {str(exc)}")

        elif HERMES_MODE == "webhook":
            raw_body = json.dumps({"payload": request.message, "conversation_id": request.conversation_id}).encode('utf-8')
            signature = hmac.new(HERMES_HMAC_SECRET.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
            
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
                    raise HTTPException(status_code=res.status_code, detail=f"Hermes Webhook error: {res.text}")

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
            logger.error(f"[CONFIG ERROR] Unknown HERMES_MODE '{HERMES_MODE}'")
            raise HTTPException(status_code=500, detail="Invalid HERMES_MODE configured.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
