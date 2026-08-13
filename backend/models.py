import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    case_id: Optional[str] = Field(default=None, description="Optional custom case ID. Generated automatically if omitted.")
    status: Optional[str] = Field(default="pending", description="Case status e.g. pending, in_progress, completed")
    evidence_items: Optional[List[Any]] = Field(default_factory=list, description="JSON list of evidence items")
    agent_results: Optional[Dict[str, Any]] = Field(default_factory=dict, description="JSON object of agent results")
    human_reviews: Optional[List[Any]] = Field(default_factory=list, description="JSON list of human reviews")
    final_report: Optional[str] = Field(default=None, description="Final report summary text")


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    evidence_items: Optional[List[Any]] = None
    agent_results: Optional[Dict[str, Any]] = None
    human_reviews: Optional[List[Any]] = None
    final_report: Optional[str] = None


class CaseResponse(BaseModel):
    case_id: str
    status: str
    evidence_items: List[Any]
    agent_results: Dict[str, Any]
    human_reviews: List[Any]
    final_report: Optional[str] = None
    created_at: str


class CaseCreateResponse(BaseModel):
    case_id: str
    message: str
    case: CaseResponse


class ReviewRequest(BaseModel):
    item_id: str = Field(..., description="ID of the evidence item or finding being reviewed")
    decision: str = Field(..., description="'approved' or 'rejected'")
    reviewer: Optional[str] = Field(default="Forensic Investigator", description="Name/ID of reviewer")
    comments: Optional[str] = Field(default="", description="Reviewer comments or rationale")


class ReportGenerateResponse(BaseModel):
    case_id: str
    status: str
    final_report: str
    generated_at: str
