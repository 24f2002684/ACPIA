"""
Standalone test script for Validator Agent (validation.py).
Tests:
  1. Deliberately contradictory mock input (high-risk item missing from correlation graph).
  2. Low confidence (< 0.6) item flagging for mandatory human review.
  3. Clean/consistent mock input validation.
"""
import asyncio
import json
from validation import run_validation


async def test_validator_agent():
    print("==================================================")
    print(" [TEST] Standalone Validator Agent Test")
    print("==================================================")

    # 1. Deliberately Contradictory Mock Input
    contradictory_case = {
        "case_id": "case_contradictory_001",
        "agent_results": {
            "content_analysis": {
                "item_results": [
                    {
                        "item_id": "ev_chat_suspicious_99",
                        "risk_level": "high",
                        "category": "security_threat",
                        "confidence": 0.45,  # Low confidence (< 0.6)
                        "reasoning": "Suspicious login attempt detected."
                    }
                ]
            },
            "metadata_extraction": {
                "extracted_items": [
                    {
                        "item_id": "ev_chat_suspicious_99",
                        "entities": [{"name": "attacker_ip_192", "type": "ip_address"}]
                    }
                ]
            },
            "correlation": {
                "edges": [
                    # Entirely different entities — attacker_ip_192 is completely absent!
                    {"from": "benign_user", "to": "support_agent", "relationship_type": "chat", "confidence": 0.9}
                ]
            }
        }
    }

    res_contradictory = await run_validation(contradictory_case, is_demo=True)
    print("\n1. Validation Result on Contradictory Mock Input:")
    print(json.dumps(res_contradictory, indent=2))

    assert res_contradictory["status"] == "completed"
    assert res_contradictory["validated"] == False, "Expected validated=False on contradictory case"
    assert len(res_contradictory["flags_for_human_review"]) >= 1, "Expected low-confidence flag"
    assert res_contradictory["flags_for_human_review"][0]["item_id"] == "ev_chat_suspicious_99"
    assert len(res_contradictory["contradictions"]) >= 1, "Expected high-risk missing from correlation contradiction"
    assert "ev_chat_suspicious_99" in res_contradictory["contradictions"][0]

    print("\n[OK] Contradictory Mock Input correctly identified and flagged!")

    # 2. Clean Consistent Mock Input
    clean_case = {
        "case_id": "case_clean_001",
        "agent_results": {
            "content_analysis": {
                "item_results": [
                    {
                        "item_id": "ev_chat_clean_01",
                        "risk_level": "low",
                        "confidence": 0.95,
                        "reasoning": "Routine conversation."
                    }
                ]
            },
            "metadata_extraction": {
                "extracted_items": [
                    {
                        "item_id": "ev_chat_clean_01",
                        "entities": [{"name": "user_john", "type": "person"}]
                    }
                ]
            },
            "correlation": {
                "edges": [
                    {"from": "user_john", "to": "server_auth", "relationship_type": "login", "confidence": 0.95}
                ]
            }
        }
    }

    res_clean = await run_validation(clean_case, is_demo=True)
    print("\n2. Validation Result on Clean Mock Input:")
    print(json.dumps(res_clean, indent=2))

    assert res_clean["status"] == "completed"
    assert res_clean["validated"] == True, "Expected validated=True on clean case"
    assert len(res_clean["flags_for_human_review"]) == 0
    assert len(res_clean["contradictions"]) == 0

    print("\n[OK] Clean Mock Input correctly validated!")
    print("\n[OK] All Validator Agent tests passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_validator_agent())
