"""
Test script for verifying backend resilience:
  1. FastAPI Global Exception Handler (returns clean JSON error without 500 stack traces).
  2. Live Demo Mode toggle API (/api/config/demo).
  3. Mock JSON data file loader resilience.
"""
import json
import urllib.request
from mock_helper import load_mock_json

BASE_URL = "http://127.0.0.1:8000"


def make_req(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body_bytes = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {}


def test_resilience():
    print("==================================================")
    print(" [TEST] System Resilience & Demo Mode API Test")
    print("==================================================")

    # 1. Test Mock JSON Data File Loader
    content_mock = load_mock_json("content_analysis_mock.json")
    print("\n1. Loaded Mock Data File (content_analysis_mock.json):")
    print("Status:", content_mock.get("status"), "| Items:", content_mock.get("analyzed_items_count"))
    assert content_mock.get("status") == "completed"
    assert "item_results" in content_mock

    # 2. Test Live Demo Mode Config GET/POST Endpoints
    status_code, demo_get = make_req(f"{BASE_URL}/api/config/demo")
    print("\n2. GET /api/config/demo (HTTP %d):" % status_code, demo_get)
    assert status_code == 200
    assert "demo_mode" in demo_get

    status_code, demo_post = make_req(f"{BASE_URL}/api/config/demo", method="POST", data={"demo_mode": True})
    print("\n3. POST /api/config/demo (HTTP %d):" % status_code, demo_post)
    assert status_code == 200
    assert demo_post["demo_mode"] == True

    # 3. Test Global Exception Handler (trigger non-existent item/path error)
    status_code, err_res = make_req(f"{BASE_URL}/api/cases/invalid_case_id_xyz", method="GET")
    print("\n4. Clean JSON Error Response (HTTP %d):" % status_code, err_res)
    assert status_code == 404
    assert "detail" in err_res

    print("\n[OK] Backend resilience tests passed successfully!")


if __name__ == "__main__":
    test_resilience()
