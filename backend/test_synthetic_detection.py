"""
Standalone test script for synthetic_detection agent.
Verifies:
  - Hugging Face API deepfake detection format.
  - Output schema {item_id, is_likely_synthetic, confidence, method}.
  - DEMO_MODE & error handling.
"""
import asyncio
import json
from synthetic_detection import run_synthetic_detection, detect_synthetic_image


async def test_synthetic_agent():
    print("==================================================")
    print(" [TEST 4] Synthetic Detection Agent Test")
    print("==================================================")

    dummy_image = {
        "id": "ev_img_synthetic_01",
        "type": "image",
        "filename": "deepfake_face_scan.png",
        "url": "/uploads/case_01/deepfake_face_scan.png"
    }

    res = await detect_synthetic_image(dummy_image, is_demo=True)
    print("\nImage Synthetic Detection Result:")
    print(json.dumps(res, indent=2))

    assert res["item_id"] == "ev_img_synthetic_01"
    assert "is_likely_synthetic" in res
    assert isinstance(res["is_likely_synthetic"], bool)
    assert "confidence" in res
    assert "method" in res
    assert res["error"] == False

    full_case_res = await run_synthetic_detection({"evidence_items": [dummy_image]})
    print("\nFull Case Synthetic Detection Output:")
    print(json.dumps(full_case_res, indent=2))

    assert full_case_res["status"] == "completed"
    assert full_case_res["analyzed_images_count"] == 1

    print("\n[OK] Synthetic Detection Agent test passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_synthetic_agent())
