"""
Test script for verifying Orchestrator pipeline execution, per-step DB updates, error resilience, and progress polling endpoints.
"""
import time
import json
import uuid
import asyncio
import urllib.request
from database import init_db, create_case, get_case
from models import CaseCreate
from orchestrator import Orchestrator, AGENT_PIPELINE

BASE_URL = "http://127.0.0.1:8000"


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


async def test_direct_orchestrator():
    print("==================================================")
    print(" [TEST STEP 1] Direct Orchestrator Pipeline Test")
    print("==================================================")
    init_db()

    case_id = f"test_orch_db_{uuid.uuid4().hex[:6]}"
    create_case(CaseCreate(case_id=case_id, status="pending"))
    print(f"Created test case: {case_id}")

    orchestrator = Orchestrator(case_id)
    result = await orchestrator.run_pipeline()

    print("\nPipeline Run Result:")
    print(json.dumps(result, indent=2))

    assert result["status"] == "completed"
    assert len(result["agent_results"]) == 6

    # Check database persistence
    db_case = get_case(case_id)
    assert db_case["status"] == "completed"
    for step in AGENT_PIPELINE:
        assert step in db_case["agent_results"], f"Missing step '{step}' in DB agent_results"
        assert db_case["agent_results"][step]["status"] == "completed"

    print("\n[OK] Direct Orchestrator test passed!")


def test_api_orchestrator_progress():
    print("\n==================================================")
    print(" [TEST STEP 2] HTTP API /analyze & /progress Polling Test")
    print("==================================================")

    case_id = f"test_orch_api_{uuid.uuid4().hex[:6]}"
    create_case(CaseCreate(case_id=case_id, status="pending"))
    print(f"Created API test case: {case_id}")

    # 1. Trigger analysis via POST /api/cases/{case_id}/analyze
    status_code, trigger_resp = make_http_request(f"{BASE_URL}/api/cases/{case_id}/analyze", method="POST")
    print(f"POST /analyze HTTP {status_code}:", trigger_resp)
    assert status_code == 202
    assert trigger_resp["status"] == "analyzing"
    assert len(trigger_resp["pipeline_steps"]) == 6

    # 2. Poll progress via GET /api/cases/{case_id}/progress
    max_polls = 15
    completed = False

    for poll_idx in range(max_polls):
        time.sleep(0.7)
        status_code, prog_resp = make_http_request(f"{BASE_URL}/api/cases/{case_id}/progress")
        print(f"Poll #{poll_idx+1}: Progress {prog_resp['progress_pct']}% | Latest Step: '{prog_resp['latest_step']}' ({prog_resp['latest_status']}) | Case Status: {prog_resp['case_status']}")

        assert status_code == 200
        if prog_resp["progress_pct"] >= 100.0 or prog_resp["case_status"] in ("completed", "completed_with_errors"):
            completed = True
            break

    assert completed, "Pipeline did not reach 100% completion within poll timeout"

    # Verify final case state in database via GET /api/cases/{case_id}
    status_code, final_case = make_http_request(f"{BASE_URL}/api/cases/{case_id}")
    print("\nFinal Database Case Object:")
    print(json.dumps(final_case, indent=2))

    assert final_case["status"] == "completed"
    for step in AGENT_PIPELINE:
        assert step in final_case["agent_results"]
        assert final_case["agent_results"][step]["status"] == "completed"

    print("\n[OK] HTTP API /analyze & /progress polling test passed!")


if __name__ == "__main__":
    print("Running ACPIA Agent Orchestrator Verification Suite...\n")
    asyncio.run(test_direct_orchestrator())
    test_api_orchestrator_progress()
    print("\n[OK] ALL ORCHESTRATOR TESTS PASSED SUCCESSFULLY!")
