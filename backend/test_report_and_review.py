"""
Test script for review and report generation API endpoints.
Verifies:
  1. POST /api/cases/{case_id}/review (Approve / Reject decision recording).
  2. POST /api/cases/{case_id}/report (Markdown executive report synthesis & SQLite persistence).
"""
import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def make_req(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body_bytes = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def test_review_and_report_endpoints():
    print("==================================================")
    print(" [TEST] Review & Executive Report Endpoints Test")
    print("==================================================")

    case_id = "test_review_report_01"

    # Ensure case exists
    make_req(f"{BASE_URL}/api/cases", method="POST", data={"case_id": case_id, "status": "completed"})

    # 1. Test Human Review Submission (Approve)
    review_data = {
        "item_id": "ev_chat_suspicious_99",
        "decision": "approved",
        "reviewer": "Senior Investigator Suhail",
        "comments": "Verified authorization log mismatch; flagged item approved for escalation."
    }
    status_code, review_res = make_req(f"{BASE_URL}/api/cases/{case_id}/review", method="POST", data=review_data)
    print("\n1. Submit Human Review Decision Response (HTTP %d):" % status_code)
    print(json.dumps(review_res, indent=2))
    assert status_code == 200
    assert len(review_res["human_reviews"]) >= 1
    assert review_res["human_reviews"][0]["decision"] == "approved"

    # 2. Test Executive Report Generation
    status_code, report_res = make_req(f"{BASE_URL}/api/cases/{case_id}/report", method="POST")
    print("\n2. Generate Executive Report Response (HTTP %d):" % status_code)
    print("Generated Report Markdown Snippet:\n" + report_res["final_report"][:300] + "\n...")

    assert status_code == 200
    assert report_res["case_id"] == case_id
    assert "# ACPIA FORENSIC INVESTIGATION REPORT" in report_res["final_report"]
    assert "Senior Investigator Suhail" in report_res["final_report"]

    print("\n[OK] Review and Report API endpoint tests passed successfully!")


if __name__ == "__main__":
    test_review_and_report_endpoints()
