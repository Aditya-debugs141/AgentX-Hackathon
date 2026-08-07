from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid

app = FastAPI(title="AgentX - Integration Bridge API")

# Allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down to the React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FRONTEND <-> HERMES AGENT BRIDGE ---
# The React UI will send user messages here.

class ChatRequest(BaseModel):
    conversation_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    trace: List[str]
    sources: List[str]

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    MAIN integration point for the Hermes Agent AI.
    The AI backend owns the conversation state. 
    """
    
    # Mocking the exact JSON structure the frontend expects while waiting for Hermes
    return ChatResponse(
        reply=f"Received: '{request.message}'. Waiting for Hermes Agent integration!",
        conversation_id=request.conversation_id,
        trace=[
            "Planner analyzed request",
            "Placement Agent checked eligibility",
            "Knowledge Agent consulted placement policy",
            "Events Agent registered workshop"
        ],
        sources=[
            "Placement Policy 2026",
            "Academic Handbook v2"
        ]
    )

if __name__ == "__main__":
    import uvicorn
    # Run the integration bridge server
    uvicorn.run(app, host="0.0.0.0", port=8000)
