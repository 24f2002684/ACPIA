import os
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="ACPIA API",
    description="FastAPI Backend for ACPIA Application",
    version="1.0.0",
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"  # Allow all origins in dev environment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str


class SystemInfoResponse(BaseModel):
    name: str
    version: str
    status: str
    timestamp: str


@app.get("/api/health", response_model=HealthResponse, summary="Health Check Endpoint")
def get_health():
    """
    Returns the health status of the backend API.
    """
    return {"status": "ok"}


@app.get("/", response_model=SystemInfoResponse, summary="Root Endpoint")
def get_root():
    """
    Returns API info and status.
    """
    return {
        "name": "ACPIA API Backend",
        "version": "1.0.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
