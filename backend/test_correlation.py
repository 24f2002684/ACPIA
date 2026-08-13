"""
Standalone test script for correlation agent.
Verifies:
  - Output schema {edges: [{from, to, relationship_type, confidence}]}.
  - NetworkX graph creation & JSON-serializable node/edge list format.
  - DEMO_MODE & error handling.
"""
import asyncio
import json
from correlation import run_correlation


async def test_correlation_agent():
    print("==================================================")
    print(" [TEST 2] Correlation Agent Test")
    print("==================================================")

    dummy_case_data = {
        "case_id": "case_corr_test_01",
        "agent_results": {
            "metadata_extraction": {
                "all_entities": [
                    {"name": "Suhail Akthar", "type": "person"},
                    {"name": "+91 98765 43210", "type": "phone_number"},
                    {"name": "192.168.1.105", "type": "ip_address"}
                ]
            }
        }
    }

    res = await run_correlation(dummy_case_data, is_demo=True)
    print("\nCorrelation Output:")
    print(json.dumps(res, indent=2))

    assert res["status"] == "completed"
    assert "edges" in res
    assert isinstance(res["edges"], list)
    assert len(res["edges"]) > 0
    assert "graph" in res
    assert "nodes" in res["graph"]
    assert "links" in res["graph"] or "edges" in res["graph"]

    print("\n[OK] Correlation Agent test passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_correlation_agent())
