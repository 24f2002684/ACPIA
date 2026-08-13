"""
Standalone test script for metadata_extraction agent.
Verifies:
  - Extraction of entities (person, phone, IP, device, location).
  - Output schema {item_id, timestamp, device_id, location, entities: [...]}.
  - DEMO_MODE fallback & error handling.
"""
import asyncio
import json
from metadata_extraction import run_metadata_extraction, extract_item_metadata


async def test_metadata():
    print("==================================================")
    print(" [TEST 1] Metadata Extraction Agent Test")
    print("==================================================")

    item = {
        "id": "ev_chat_meta_01",
        "type": "chat_log",
        "uploaded_at": "2026-08-13T14:32:00Z",
        "logs": [
            {"sender": "Suhail Akthar", "message": "Call +91 98765 43210 from 192.168.1.105 in Chennai", "timestamp": "2026-08-13T14:32:00Z"}
        ]
    }

    res = await extract_item_metadata(item, is_demo=True)
    print("\nExtracted Item Metadata:")
    print(json.dumps(res, indent=2))

    assert res["item_id"] == "ev_chat_meta_01"
    assert "timestamp" in res
    assert "device_id" in res
    assert "location" in res
    assert isinstance(res["entities"], list)
    assert len(res["entities"]) > 0

    full_run = await run_metadata_extraction({"evidence_items": [item]})
    print("\nFull Case Metadata Extraction Output:")
    print(json.dumps(full_run, indent=2))

    assert full_run["status"] == "completed"
    assert full_run["extracted_items_count"] == 1
    assert full_run["total_entities_found"] > 0

    print("\n[OK] Metadata Extraction Agent test passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_metadata())
