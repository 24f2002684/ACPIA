import os
import json
import logging
import asyncio
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("validation")
logger.setLevel(logging.INFO)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


async def run_validation(case_data: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Validator Agent: Inspects all agent_results for a case.
    - Checks for contradictions across step outputs.
    - Flags any item/result with confidence < 0.6 for mandatory human review.
    - NEVER modifies other agents' results (read-only annotations).
    Output: {validated: bool, flags_for_human_review: [...], contradictions: [...], status: "completed"}
    """
    case_id = case_data.get("case_id", "unknown_case")
    agent_results = case_data.get("agent_results") or {}

    flags_for_human_review: List[Dict[str, str]] = []
    contradictions: List[str] = []

    # 1. Rule-based scan for low confidence (< 0.6) across all agent steps
    for step_name, step_data in agent_results.items():
        if not isinstance(step_data, dict):
            continue

        # Check item_results array in content_analysis or synthetic_detection
        item_results = step_data.get("item_results") or step_data.get("synthetic_detection_results") or []
        for item_res in item_results:
            if isinstance(item_res, dict):
                conf = item_res.get("confidence")
                item_id = item_res.get("item_id", "unknown_item")
                if conf is not None and float(conf) < 0.6:
                    flags_for_human_review.append({
                        "item_id": item_id,
                        "reason": f"Low confidence score ({conf:.2f} < 0.60) in {step_name} step requires human verification."
                    })

        # Check step-level confidence if present
        step_conf = step_data.get("confidence") or step_data.get("overall_confidence")
        if step_conf is not None and float(step_conf) < 0.6:
            flags_for_human_review.append({
                "item_id": f"step:{step_name}",
                "reason": f"Overall step confidence ({step_conf:.2f} < 0.60) for '{step_name}' requires human verification."
            })

    # 2. Rule-based scan for contradictions across agent steps
    content_step = agent_results.get("content_analysis") or {}
    corr_step = agent_results.get("correlation") or {}
    meta_step = agent_results.get("metadata_extraction") or {}
    synth_step = agent_results.get("synthetic_detection") or {}

    # Check high-risk items missing from correlation graph
    content_items = content_step.get("item_results") or []
    corr_edges = corr_step.get("edges") or []
    corr_entities = set()
    for e in corr_edges:
        if isinstance(e, dict):
            if e.get("from"): corr_entities.add(str(e.get("from")).lower())
            if e.get("to"): corr_entities.add(str(e.get("to")).lower())

    for c_item in content_items:
        if isinstance(c_item, dict) and c_item.get("risk_level") == "high":
            item_id = c_item.get("item_id")
            # Check if high-risk item entities are represented in correlation
            meta_items = meta_step.get("extracted_items") or []
            item_entities = []
            for m in meta_items:
                if isinstance(m, dict) and m.get("item_id") == item_id:
                    item_entities = [ent.get("name", "").lower() for ent in m.get("entities", [])]

            if item_entities and not any(ent in corr_entities for ent in item_entities):
                contradictions.append(
                    f"Contradiction: Item '{item_id}' was classified as high-risk in content_analysis, "
                    f"but its extracted entities {item_entities} are absent from correlation graph results."
                )

    # 3. DEMO_MODE or LLM cross-validation
    if is_demo or not GEMINI_API_KEY:
        await asyncio.sleep(0.3)
        # If no contradictions or low-confidence flags were found by rule engine, case is validated
        is_validated = (len(contradictions) == 0 and len(flags_for_human_review) == 0)
    else:
        # Real LLM cross-validation call with 20s timeout
        async def _call_llm():
            prompt = (
                "You are an expert AI forensic validator. Review the following multi-agent analytical results for a cybersecurity case. "
                "Check for any logical contradictions between step results (e.g. content risk vs correlation graph presence vs synthetic detection verdict). "
                "Identify any results that need human review. Respond ONLY with a JSON object matching this schema:\n"
                "{\n"
                '  "validated": true | false,\n'
                '  "llm_flags": [ {"item_id": "string", "reason": "string"} ],\n'
                '  "llm_contradictions": [ "string contradiction description" ]\n'
                "}\n\nMulti-Agent Results:\n" + json.dumps(agent_results)
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            loop = asyncio.get_running_loop()
            def _exec():
                with urllib.request.urlopen(req, timeout=18) as resp:
                    return json.loads(resp.read().decode("utf-8"))

            res_json = await loop.run_in_executor(None, _exec)
            parsed = json.loads(res_json["candidates"][0]["content"]["parts"][0]["text"])

            llm_flags = parsed.get("llm_flags") or []
            llm_contras = parsed.get("llm_contradictions") or []

            for flag in llm_flags:
                if isinstance(flag, dict):
                    flags_for_human_review.append(flag)
            for contra in llm_contras:
                if isinstance(contra, str):
                    contradictions.append(contra)

            return parsed.get("validated", len(contradictions) == 0 and len(flags_for_human_review) == 0)

        try:
            is_validated = await asyncio.wait_for(_call_llm(), timeout=20.0)
        except Exception as err:
            logger.error(f"Validator Agent LLM API error/timeout for case {case_id}: {str(err)}")
            is_validated = (len(contradictions) == 0 and len(flags_for_human_review) == 0)

    # Deduplicate flags and contradictions
    unique_flags = []
    seen_flags = set()
    for f in flags_for_human_review:
        key = (f.get("item_id"), f.get("reason"))
        if key not in seen_flags:
            seen_flags.add(key)
            unique_flags.append(f)

    unique_contradictions = list(dict.fromkeys(contradictions))

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "validated": is_validated and len(unique_flags) == 0 and len(unique_contradictions) == 0,
        "flags_for_human_review": unique_flags,
        "contradictions": unique_contradictions,
        "total_flags": len(unique_flags),
        "total_contradictions": len(unique_contradictions),
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
