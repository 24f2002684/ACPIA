"""
Test script for verifying ACPIA SQLite persistence & /api/cases CRUD endpoints.
Executes:
  1. Direct database layer verification (create, fetch, patch update in SQLite).
  2. HTTP API endpoints verification (POST /api/cases, GET /api/cases/{case_id}, PATCH /api/cases/{case_id}).
"""
import sys
import json
import uuid
import urllib.request
import urllib.parse
from database import init_db, create_case, get_case, update_case
from models import CaseCreate, CaseUpdate

BASE_URL = "http://127.0.0.1:8000"


def print_step(title):
    print(f"\n{'='*50}\n [TEST STEP] {title}\n{'='*50}")


def test_direct_database_layer():
    print_step("1. Testing SQLite Database Layer Directly")
    init_db()

    # 1. Create a test case
    test_id = f"test_case_db_{uuid.uuid4().hex[:8]}"
    create_input = CaseCreate(
        case_id=test_id,
        status="created",
        evidence_items=[{"id": "ev1", "type": "log", "source": "auth_service"}],
        agent_results={"security_agent": {"risk_score": 0.85, "recommendation": "flag"}},
        human_reviews=[],
        final_report="Initial investigation opened."
    )

    created = create_case(create_input)
    print("Direct Create Result:", json.dumps(created, indent=2))
    assert created["case_id"] == test_id
    assert created["status"] == "created"
    assert len(created["evidence_items"]) == 1
    assert created["agent_results"]["security_agent"]["risk_score"] == 0.85

    # 2. Fetch the test case
    fetched = get_case(test_id)
    print("\nDirect Fetch Result:", json.dumps(fetched, indent=2))
    assert fetched is not None
    assert fetched["case_id"] == test_id

    # 3. Update the test case
    update_input = CaseUpdate(
        status="in_review",
        human_reviews=[{"reviewer": "alice", "decision": "approved", "timestamp": "2026-08-13T16:50:00Z"}],
        final_report="Reviewed by analyst Alice. Security alert validated."
    )
    updated = update_case(test_id, update_input)
    print("\nDirect Update Result:", json.dumps(updated, indent=2))
    assert updated["status"] == "in_review"
    assert len(updated["human_reviews"]) == 1
    assert updated["final_report"] == "Reviewed by analyst Alice. Security alert validated."

    print("\n[OK] Direct SQLite Database Layer tests passed successfully!")


def make_http_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body_bytes = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body)
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        return e.code, json.loads(resp_body) if resp_body else {}


def test_api_endpoints():
    print_step("2. Testing FastAPI Endpoints via HTTP")

    # 1. Health check
    status_code, health = make_http_request(f"{BASE_URL}/api/health")
    print(f"Health Check HTTP {status_code}:", health)
    assert status_code == 200
    assert health["status"] == "ok"

    # 2. POST /api/cases
    api_case_id = f"test_case_api_{uuid.uuid4().hex[:8]}"
    post_payload = {
        "case_id": api_case_id,
        "status": "pending",
        "evidence_items": [
            {"id": "ev_file_1", "filename": "suspicious_payload.bin", "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
        ],
        "agent_results": {
            "threat_detector": {"malware_detected": True, "confidence": 0.94}
        },
        "human_reviews": [],
        "final_report": "Automated threat detection triggered."
    }

    status_code, post_resp = make_http_request(f"{BASE_URL}/api/cases", method="POST", data=post_payload)
    print(f"\nPOST /api/cases HTTP {status_code}:", json.dumps(post_resp, indent=2))
    assert status_code == 201
    assert post_resp["case_id"] == api_case_id
    assert post_resp["case"]["status"] == "pending"

    # 3. GET /api/cases/{case_id}
    status_code, get_resp = make_http_request(f"{BASE_URL}/api/cases/{api_case_id}")
    print(f"\nGET /api/cases/{api_case_id} HTTP {status_code}:", json.dumps(get_resp, indent=2))
    assert status_code == 200
    assert get_resp["case_id"] == api_case_id
    assert len(get_resp["evidence_items"]) == 1

    # 4. PATCH /api/cases/{case_id}
    patch_payload = {
        "status": "resolved",
        "final_report": "Incident resolved. False positive confirmed after manual sandbox inspection."
    }
    status_code, patch_resp = make_http_request(f"{BASE_URL}/api/cases/{api_case_id}", method="PATCH", data=patch_payload)
    print(f"\nPATCH /api/cases/{api_case_id} HTTP {status_code}:", json.dumps(patch_resp, indent=2))
    assert status_code == 200
    assert patch_resp["status"] == "resolved"
    assert "False positive confirmed" in patch_resp["final_report"]

    print("\n[OK] All HTTP API Endpoint tests passed successfully!")


if __name__ == "__main__":
    print("Running ACPIA Database & API Verification Test...")
    test_direct_database_layer()
    test_api_endpoints()
    print("\n[OK] ALL TESTS PASSED SUCCESSFULLY!")
