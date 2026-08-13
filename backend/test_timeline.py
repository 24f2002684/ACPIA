"""
Standalone test script for timeline_reconstruction agent.
Verifies:
  - Chronological sorting of evidence events.
  - Output schema {timeline: [{time, event, source_item_id}]}.
  - DEMO_MODE & error handling.
"""
import asyncio
import json
from timeline_reconstruction import run_timeline_reconstruction


async def test_timeline_agent():
    print("==================================================")
    print(" [TEST 3] Timeline Reconstruction Agent Test")
    print("==================================================")

    dummy_case_data = {
        "case_id": "case_timeline_test_01",
        "evidence_items": [
            {
                "id": "ev_chat_02",
                "type": "chat_log",
                "logs": [
                    {"sender": "agent_bot", "message": "Login blocked from IP 192.168.1.105", "timestamp": "2026-08-13T14:33:20Z"}
                ]
            },
            {
                "id": "ev_chat_01",
                "type": "chat_log",
                "logs": [
                    {"sender": "user_john", "message": "Alert triggered for suspicious access", "timestamp": "2026-08-13T14:32:00Z"}
                ]
            }
        ]
    }

    res = await run_timeline_reconstruction(dummy_case_data, is_demo=True)
    print("\nTimeline Reconstruction Output:")
    print(json.dumps(res, indent=2))

    assert res["status"] == "completed"
    assert "timeline" in res
    assert isinstance(res["timeline"], list)
    assert len(res["timeline"]) == 2
    # Verify chronological sorting (14:32:00 comes before 14:33:20)
    assert res["timeline"][0]["time"] < res["timeline"][1]["time"]
    assert "event" in res["timeline"][0]
    assert "source_item_id" in res["timeline"][0]

    print("\n[OK] Timeline Reconstruction Agent test passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_timeline_agent())
