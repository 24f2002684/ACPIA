import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from models import CaseCreate, CaseUpdate, CaseResponse

DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "acpia.db"))


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the SQLite database and create the cases table if it does not exist."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    case_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    evidence_items JSON NOT NULL,
                    agent_results JSON NOT NULL,
                    human_reviews JSON NOT NULL,
                    final_report TEXT,
                    created_at TIMESTAMP NOT NULL
                )
                """
            )
    finally:
        conn.close()


def row_to_case_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to deserialize SQLite row into a dict with parsed JSON fields."""
    return {
        "case_id": row["case_id"],
        "status": row["status"],
        "evidence_items": json.loads(row["evidence_items"]) if row["evidence_items"] else [],
        "agent_results": json.loads(row["agent_results"]) if row["agent_results"] else {},
        "human_reviews": json.loads(row["human_reviews"]) if row["human_reviews"] else [],
        "final_report": row["final_report"],
        "created_at": row["created_at"],
    }


def create_case(case_input: CaseCreate) -> Dict[str, Any]:
    case_id = case_input.case_id or f"case_{uuid.uuid4().hex[:12]}"
    created_at = datetime.utcnow().isoformat() + "Z"
    status = case_input.status or "pending"
    evidence_json = json.dumps(case_input.evidence_items or [])
    agent_json = json.dumps(case_input.agent_results or {})
    human_json = json.dumps(case_input.human_reviews or [])
    final_report = case_input.final_report

    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cases (case_id, status, evidence_items, agent_results, human_reviews, final_report, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (case_id, status, evidence_json, agent_json, human_json, final_report, created_at),
            )
    finally:
        conn.close()

    return get_case(case_id)


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return row_to_case_dict(row)
    finally:
        conn.close()


def update_case(case_id: str, case_update: CaseUpdate) -> Optional[Dict[str, Any]]:
    existing = get_case(case_id)
    if not existing:
        return None

    update_fields = []
    params = []

    if case_update.status is not None:
        update_fields.append("status = ?")
        params.append(case_update.status)

    if case_update.evidence_items is not None:
        update_fields.append("evidence_items = ?")
        params.append(json.dumps(case_update.evidence_items))

    if case_update.agent_results is not None:
        update_fields.append("agent_results = ?")
        params.append(json.dumps(case_update.agent_results))

    if case_update.human_reviews is not None:
        update_fields.append("human_reviews = ?")
        params.append(json.dumps(case_update.human_reviews))

    if case_update.final_report is not None:
        update_fields.append("final_report = ?")
        params.append(case_update.final_report)

    if not update_fields:
        return existing

    params.append(case_id)
    query = f"UPDATE cases SET {', '.join(update_fields)} WHERE case_id = ?"

    conn = get_db_connection()
    try:
        with conn:
            conn.execute(query, params)
    finally:
        conn.close()

    return get_case(case_id)


def list_all_cases(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.execute("SELECT * FROM cases ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        return [row_to_case_dict(r) for r in rows]
    finally:
        conn.close()
