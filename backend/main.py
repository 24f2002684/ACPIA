import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import CaseCreate, CaseUpdate, CaseResponse, CaseCreateResponse
from database import init_db, create_case, get_case, update_case, list_all_cases

load_dotenv()

app = FastAPI(
    title="ACPIA API",
    description="FastAPI Backend with SQLite persistence for ACPIA Application",
    version="1.1.0",
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initialize database tables on FastAPI startup."""
    init_db()


@app.get("/api/health", summary="Health Check Endpoint")
def get_health():
    """Returns the health status of the backend API."""
    return {"status": "ok"}


@app.get("/", summary="Root Endpoint")
def get_root():
    """Returns API info and status."""
    return {
        "name": "ACPIA API Backend",
        "version": "1.1.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ==========================================
# CASES ENDPOINTS
# ==========================================

@app.post("/api/cases", response_model=CaseCreateResponse, status_code=status.HTTP_201_CREATED, summary="Create a new Case")
def api_create_case(case_input: CaseCreate):
    """
    Creates a new case in the SQLite database and returns the generated case_id and full case object.
    """
    try:
        created = create_case(case_input)
        return {
            "case_id": created["case_id"],
            "message": "Case created successfully",
            "case": created,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create case: {str(e)}",
        )


@app.get("/api/cases/{case_id}", response_model=CaseResponse, summary="Get Case by ID")
def api_get_case(case_id: str):
    """
    Fetches the full case object by case_id. Returns HTTP 404 if not found.
    """
    case_obj = get_case(case_id)
    if not case_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )
    return case_obj


@app.patch("/api/cases/{case_id}", response_model=CaseResponse, summary="Update Case")
def api_update_case(case_id: str, case_update: CaseUpdate):
    """
    Updates any field of the case object by case_id. Returns updated case object or 404 if not found.
    """
    updated_obj = update_case(case_id, case_update)
    if not updated_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )
    return updated_obj


@app.get("/api/cases", response_model=List[CaseResponse], summary="List Cases")
def api_list_cases(limit: int = 50):
    """
    Lists existing cases from SQLite database sorted by creation time descending.
    """
    return list_all_cases(limit=limit)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
