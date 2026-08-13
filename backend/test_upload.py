"""
Test script for verifying POST /api/cases/{case_id}/evidence endpoint.
Uploads:
  1. Image file
  2. Mock chat log JSON array of {sender, message, timestamp}
Verifies:
  1. File saved in /backend/uploads/{case_id}/
  2. SQLite database updated with evidence_items metadata.
"""
import os
import json
import uuid
import urllib.request
from database import init_db, get_case, create_case
from models import CaseCreate

BASE_URL = "http://127.0.0.1:8000"


def test_upload_endpoint():
    print("Running Evidence Upload Verification Test...")
    init_db()

    case_id = f"case_upload_test_{uuid.uuid4().hex[:6]}"
    create_case(CaseCreate(case_id=case_id, status="in_progress"))
    print(f"Created test case: {case_id}")

    # Prepare multipart/form-data payload manually
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = []

    # 1. Add image file (dummy 1x1 PNG)
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
    ])

    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="files"; filename="evidence_screenshot_01.png"'.encode("utf-8"))
    body.append(b"Content-Type: image/png")
    body.append(b"")
    body.append(png_bytes)

    # 2. Add mock chat log JSON payload
    chat_logs = [
        {"sender": "user102", "message": "Can you verify this transaction?", "timestamp": "2026-08-13T16:00:00Z"},
        {"sender": "agent_bot", "message": "Suspicious login attempt flagged from IP 192.168.1.50", "timestamp": "2026-08-13T16:01:05Z"}
    ]

    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="chat_logs"'.encode("utf-8"))
    body.append(b"Content-Type: text/plain")
    body.append(b"")
    body.append(json.dumps(chat_logs).encode("utf-8"))

    body.append(f"--{boundary}--".encode("utf-8"))
    body.append(b"")

    payload_bytes = b"\r\n".join(body)

    # Send POST request
    url = f"{BASE_URL}/api/cases/{case_id}/evidence"
    req = urllib.request.Request(
        url,
        data=payload_bytes,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        res_json = json.loads(resp.read().decode("utf-8"))
        print("\nPOST /api/cases/{case_id}/evidence Response:")
        print(json.dumps(res_json, indent=2))

    # Verify file saved on disk
    expected_path = os.path.join(os.path.dirname(__file__), "uploads", case_id, "evidence_screenshot_01.png")
    assert os.path.exists(expected_path), f"File not found on disk at {expected_path}"
    print(f"\n[OK] Image file verified on disk: {expected_path}")

    # Verify SQLite database update
    updated_case = get_case(case_id)
    assert len(updated_case["evidence_items"]) == 2
    types = [item["type"] for item in updated_case["evidence_items"]]
    assert "image" in types
    assert "chat_log" in types
    print("\n[OK] Evidence items verified in database:")
    print(json.dumps(updated_case["evidence_items"], indent=2))

    print("\n[OK] ALL EVIDENCE UPLOAD TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_upload_endpoint()
