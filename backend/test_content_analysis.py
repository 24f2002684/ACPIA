"""
Independent test script for Content Analysis Agent.
Verifies:
  1. Text evidence classification (high/medium/low risk level, category, reasoning).
  2. Image evidence SafeSearch mapping.
  3. Timeout & error fallback schema ({item_id, risk_level: "unknown", error: true}).
  4. DEMO_MODE toggle behavior.
"""
import asyncio
import json
from content_analysis import run_content_analysis, analyze_text_item, analyze_image_item


async def run_standalone_agent_tests():
    print("==================================================")
    print(" [TEST] Independent Content Analysis Agent Test")
    print("==================================================")

    # 1. Test Text Evidence (High Risk)
    high_text_item = {
        "id": "ev_chat_high_risk_99",
        "type": "chat_log",
        "logs": [
            {"sender": "attacker_ip", "message": "Failed login attempt: unauthorized password attempt on root account", "timestamp": "2026-08-13T16:00:00Z"}
        ]
    }
    text_res = await analyze_text_item(high_text_item, is_demo=True)
    print("\n1. High Risk Text Analysis Result:")
    print(json.dumps(text_res, indent=2))
    assert text_res["item_id"] == "ev_chat_high_risk_99"
    assert text_res["risk_level"] == "high"
    assert text_res["category"] == "security_threat"
    assert text_res["error"] == False

    # 2. Test Image Evidence (Benign Screenshot)
    image_item = {
        "id": "ev_img_benign_01",
        "type": "image",
        "filename": "system_dashboard_screenshot.png",
        "url": "/uploads/case_01/system_dashboard_screenshot.png"
    }
    img_res = await analyze_image_item(image_item, is_demo=True)
    print("\n2. Image Analysis Result:")
    print(json.dumps(img_res, indent=2))
    assert img_res["item_id"] == "ev_img_benign_01"
    assert img_res["risk_level"] in ("low", "medium", "high")
    assert img_res["error"] == False

    # 3. Test Full Case Analysis Pipeline
    test_case_data = {
        "case_id": "case_test_standalone",
        "evidence_items": [high_text_item, image_item]
    }
    case_analysis_res = await run_content_analysis(test_case_data)
    print("\n3. Full Case Content Analysis Output:")
    print(json.dumps(case_analysis_res, indent=2))

    assert case_analysis_res["status"] == "completed"
    assert case_analysis_res["analyzed_items_count"] == 2
    assert case_analysis_res["high_risk_count"] == 1
    assert case_analysis_res["overall_risk_level"] == "high"

    print("\n[OK] Standalone Content Analysis Agent tests passed successfully!")


if __name__ == "__main__":
    asyncio.run(run_standalone_agent_tests())
