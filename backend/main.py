import os
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from models import CaseCreate, CaseUpdate, CaseResponse, CaseCreateResponse
from database import init_db, create_case, get_case, update_case, list_all_cases, add_evidence_to_case
from orchestrator import Orchestrator, get_case_progress, AGENT_PIPELINE

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI(
    title="ACPIA API",
    description="FastAPI Backend with SQLite persistence & Evidence Upload for ACPIA",
    version="1.2.0",
)

# Mount static uploads directory for serving uploaded files (images, logs, etc.)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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
        "version": "1.2.0",
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


# ==========================================
# EVIDENCE UPLOAD ENDPOINT
# ==========================================

@app.post("/api/cases/{case_id}/evidence", status_code=status.HTTP_201_CREATED, summary="Upload Evidence to Case")
async def api_upload_evidence(
    case_id: str,
    files: Optional[List[UploadFile]] = File(None),
    chat_logs: Optional[str] = Form(None),
):
    """
    Uploads evidence (images and/or mock chat log JSON) for a case.
    Stores files in /backend/uploads/{case_id}/ and updates the database record.
    """
    # Ensure case exists; create it if missing
    existing_case = get_case(case_id)
    if not existing_case:
        existing_case = create_case(CaseCreate(case_id=case_id, status="pending"))

    case_upload_dir = os.path.join(UPLOADS_DIR, case_id)
    os.makedirs(case_upload_dir, exist_ok=True)

    added_items: List[Dict[str, Any]] = []
    now_iso = datetime.utcnow().isoformat() + "Z"

    # 1. Process File Uploads (Images / Documents)
    if files:
        for file in files:
            if not file.filename:
                continue

            # Save file to disk
            safe_filename = os.path.basename(file.filename)
            file_path = os.path.join(case_upload_dir, safe_filename)

            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            file_size = len(content)
            file_url = f"/uploads/{case_id}/{safe_filename}"

            is_image = file.content_type and file.content_type.startswith("image")
            item_type = "image" if is_image else "file"

            added_items.append({
                "id": f"ev_file_{uuid.uuid4().hex[:8]}",
                "type": item_type,
                "filename": safe_filename,
                "url": file_url,
                "size_bytes": file_size,
                "mime_type": file.content_type or "application/octet-stream",
                "uploaded_at": now_iso,
            })

    # 2. Process Chat Logs JSON Payload
    if chat_logs and chat_logs.strip():
        try:
            chat_data = json.loads(chat_logs)
            if isinstance(chat_data, dict) and "logs" in chat_data:
                parsed_logs = chat_data["logs"]
            elif isinstance(chat_data, list):
                parsed_logs = chat_data
            else:
                parsed_logs = [chat_data]

            added_items.append({
                "id": f"ev_chat_{uuid.uuid4().hex[:8]}",
                "type": "chat_log",
                "count": len(parsed_logs),
                "logs": parsed_logs,
                "uploaded_at": now_iso,
            })
        except json.JSONDecodeError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON payload in chat_logs field: {str(err)}",
            )

    if not added_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid files or chat logs provided in request",
        )

    updated_case = add_evidence_to_case(case_id, added_items)

    return {
        "message": "Evidence uploaded successfully",
        "case_id": case_id,
        "added_count": len(added_items),
        "added_evidence": added_items,
        "case": updated_case,
    }


# ==========================================
# ORCHESTRATOR PIPELINE ENDPOINTS
# ==========================================

@app.post("/api/cases/{case_id}/analyze", status_code=status.HTTP_202_ACCEPTED, summary="Trigger Agent Analysis Pipeline")
async def api_trigger_analysis(case_id: str, background_tasks: BackgroundTasks):
    """
    Triggers the sequential 6-step agent analysis pipeline for a case in the background.
    """
    case_obj = get_case(case_id)
    if not case_obj:
        case_obj = create_case(CaseCreate(case_id=case_id, status="pending"))

    orchestrator = Orchestrator(case_id)
    background_tasks.add_task(orchestrator.run_pipeline)

    return {
        "message": "Analysis pipeline initiated",
        "case_id": case_id,
        "status": "analyzing",
        "pipeline_steps": AGENT_PIPELINE,
    }


@app.get("/api/cases/{case_id}/progress", summary="Poll Agent Pipeline Progress")
def api_get_analysis_progress(case_id: str):
    """
    Returns the current in-memory progress event history, completion percentage, and agent results for a case.
    """
    case_obj = get_case(case_id)
    if not case_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )

    return get_case_progress(case_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

