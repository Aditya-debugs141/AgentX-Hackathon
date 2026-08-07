import os
import hmac
import hashlib
import json
import httpx
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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
    if FRONTEND_API_KEY and x_api_key != FRONTEND_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_frontend_api_key)])
async def chat_endpoint(request: ChatRequest):
    """
    Integration point for Hermes Agent AI.
    Routes to Hermes Proxy (OpenAI API spec) or Hermes Webhook (HMAC signed) depending on HERMES_MODE.
    """
    if not HERMES_ENDPOINT_URL:
        # Fallback mock response for testing before tunnel connection
        return ChatResponse(
            reply=f"Received: '{request.message}'. (Set HERMES_ENDPOINT_URL to connect to live Hermes Agent!)",
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

    async with httpx.AsyncClient(timeout=60.0) as client:
        if HERMES_MODE == "proxy":
            # 1. Hermes OpenAI-compatible Proxy / API Server endpoint
            headers = {"Content-Type": "application/json"}
            hermes_api_key = os.getenv("HERMES_API_KEY") or os.getenv("API_SERVER_KEY")
            if hermes_api_key:
                headers["Authorization"] = f"Bearer {hermes_api_key}"
            
            payload = {
                "model": "hermes-agent",
                "messages": [
                    {"role": "user", "content": request.message}
                ]
            }
            res = await client.post(target_url, json=payload, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Hermes Proxy error: {res.text}")
            
            data = res.json()
            reply_text = data["choices"][0]["message"]["content"]
            return ChatResponse(
                reply=reply_text,
                conversation_id=request.conversation_id,
                trace=["Hermes Proxy Execution"],
                sources=[]
            )

        elif HERMES_MODE == "webhook":
            # 2. Hermes Webhook endpoint with HMAC-SHA256 signature
            raw_body = json.dumps({"payload": request.message, "conversation_id": request.conversation_id}).encode('utf-8')
            signature = hmac.new(HERMES_HMAC_SECRET.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
            
            headers = {
                "Content-Type": "application/json",
                "X-Hub-Signature-256": f"sha256={signature}"
            }
            
            res = await client.post(HERMES_ENDPOINT_URL, data=raw_body, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Hermes Webhook error: {res.text}")
                
            return ChatResponse(
                reply="Triggered Hermes Agent run via webhook successfully.",
                conversation_id=request.conversation_id,
                trace=["Hermes Webhook Triggered"],
                sources=[]
            )
            
        else:
            raise HTTPException(status_code=500, detail="Invalid HERMES_MODE configured.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
