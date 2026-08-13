import os
import json
import base64
import logging
import asyncio
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("content_analysis")
logger.setLevel(logging.INFO)

# Config options from environment
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
VISION_API_KEY = os.getenv("VISION_API_KEY") or GEMINI_API_KEY


async def analyze_text_item(item: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Analyzes text / chat log evidence items using Gemini/Claude API or DEMO_MODE fallback.
    Returns structured dict: {item_id, risk_level, category, confidence, reasoning, error}
    """
    item_id = item.get("id", "unknown_text_item")

    # If DEMO_MODE or no API key configured, use realistic mock analysis
    if is_demo or (not GEMINI_API_KEY and not CLAUDE_API_KEY):
        await asyncio.sleep(0.3)  # Brief simulated latency
        logs = item.get("logs") or []
        combined_text = " ".join([f"{l.get('sender')}: {l.get('message')}" for l in logs]).lower()

        if any(k in combined_text for k in ["failed", "unauthorized", "hack", "exploit", "suspicious", "password"]):
            risk_level = "high"
            category = "security_threat"
            confidence = 0.92
            reasoning = "Chat transcript contains high-risk threat indicators and unauthorized authentication activity."
        elif any(k in combined_text for k in ["warning", "verify", "alert", "check"]):
            risk_level = "medium"
            category = "operational_alert"
            confidence = 0.78
            reasoning = "Chat transcript mentions operational alerts or account verification requests."
        else:
            risk_level = "low"
            category = "benign_chat"
            confidence = 0.95
            reasoning = "Chat transcript contains routine communications with no threat keywords detected."

        return {
            "item_id": item_id,
            "risk_level": risk_level,
            "category": category,
            "confidence": confidence,
            "reasoning": reasoning,
            "error": False,
        }

    # Real API call with 20-second timeout
    async def _call_text_api():
        logs = item.get("logs") or []
        transcript = "\n".join([f"[{l.get('timestamp')}] {l.get('sender')}: {l.get('message')}" for l in logs])

        system_prompt = (
            "You are a cybersecurity evidence classifier. Analyze the following transcript. "
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "risk_level": "low" | "medium" | "high",\n'
            '  "category": "security_threat" | "operational_alert" | "benign_chat",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "reasoning": "brief explanation"\n'
            "}"
        )

        if GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {"parts": [{"text": f"{system_prompt}\n\nTranscript:\n{transcript}"}]}
                ],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            loop = asyncio.get_running_loop()
            def _execute_req():
                with urllib.request.urlopen(req, timeout=18) as resp:
                    return json.loads(resp.read().decode("utf-8"))

            res_json = await loop.run_in_executor(None, _execute_req)
            text_resp = res_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text_resp)
            return {
                "item_id": item_id,
                "risk_level": parsed.get("risk_level", "medium"),
                "category": parsed.get("category", "text_analysis"),
                "confidence": float(parsed.get("confidence", 0.85)),
                "reasoning": str(parsed.get("reasoning", "Gemini classified transcript.")),
                "error": False,
            }
        else:
            raise ValueError("No valid API key available")

    try:
        return await asyncio.wait_for(_call_text_api(), timeout=20.0)
    except Exception as err:
        logger.error(f"Text analysis failed/timed out for item {item_id}: {str(err)}")
        return {
            "item_id": item_id,
            "risk_level": "unknown",
            "category": "error",
            "confidence": 0.0,
            "reasoning": f"API call error or timeout: {str(err)}",
            "error": True,
        }


async def analyze_image_item(item: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Analyzes image evidence using Google Cloud Vision SafeSearch API or DEMO_MODE fallback.
    Maps SafeSearch likelihood scores to risk_level schema.
    """
    item_id = item.get("id", "unknown_image_item")

    # If DEMO_MODE or no Vision API key, return realistic SafeSearch mapped result
    if is_demo or not VISION_API_KEY:
        await asyncio.sleep(0.3)
        filename = (item.get("filename") or "").lower()

        if "exploit" in filename or "spoof" in filename or "fake" in filename:
            risk_level = "high"
            category = "image_manipulation"
            confidence = 0.91
            reasoning = "SafeSearch & heuristics flagged potential image spoofing or sensitive manipulation."
        elif "screenshot" in filename or "log" in filename:
            risk_level = "low"
            category = "system_screenshot"
            confidence = 0.96
            reasoning = "SafeSearch scores indicate benign system interface screenshot (Adult: VERY_UNLIKELY, Violence: VERY_UNLIKELY)."
        else:
            risk_level = "low"
            category = "benign_media"
            confidence = 0.90
            reasoning = "SafeSearch analysis clean. No inappropriate or harmful visual content detected."

        return {
            "item_id": item_id,
            "risk_level": risk_level,
            "category": category,
            "confidence": confidence,
            "reasoning": reasoning,
            "error": False,
        }

    # Real Google Cloud Vision SafeSearch REST API call with 20s timeout
    async def _call_vision_api():
        url = f"https://vision.googleapis.com/v1/images:annotate?key={VISION_API_KEY}"
        file_url = item.get("url", "")
        # Resolve local disk file path if relative url
        file_path = None
        if file_url.startswith("/uploads/"):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(base_dir, file_url.lstrip("/"))

        if not file_path or not os.path.exists(file_path):
            raise FileNotFoundError(f"Image file path not found: {file_path}")

        with open(file_path, "rb") as image_file:
            content_b64 = base64.b64encode(image_file.read()).decode("utf-8")

        payload = {
            "requests": [
                {
                    "image": {"content": content_b64},
                    "features": [{"type": "SAFE_SEARCH_DETECTION"}]
                }
            ]
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        loop = asyncio.get_running_loop()
        def _execute_req():
            with urllib.request.urlopen(req, timeout=18) as resp:
                return json.loads(resp.read().decode("utf-8"))

        res_json = await loop.run_in_executor(None, _execute_req)
        safe_search = res_json["responses"][0].get("safeSearchAnnotation", {})

        adult = safe_search.get("adult", "UNKNOWN")
        violence = safe_search.get("violence", "UNKNOWN")
        spoof = safe_search.get("spoof", "UNKNOWN")

        high_scores = ["VERY_LIKELY", "LIKELY"]
        med_scores = ["POSSIBLE"]

        if any(score in high_scores for score in [adult, violence]):
            risk_level = "high"
            category = "inappropriate_content"
            confidence = 0.95
            reasoning = f"SafeSearch flagged high likelihood content (Adult: {adult}, Violence: {violence})."
        elif spoof in high_scores or any(score in med_scores for score in [adult, violence, spoof]):
            risk_level = "medium"
            category = "sensitive_media"
            confidence = 0.80
            reasoning = f"SafeSearch flagged potential sensitive content or spoofing (Spoof: {spoof})."
        else:
            risk_level = "low"
            category = "benign_image"
            confidence = 0.92
            reasoning = f"SafeSearch clean (Adult: {adult}, Violence: {violence}, Spoof: {spoof})."

        return {
            "item_id": item_id,
            "risk_level": risk_level,
            "category": category,
            "confidence": confidence,
            "reasoning": reasoning,
            "error": False,
        }

    try:
        return await asyncio.wait_for(_call_image_api(), timeout=20.0)
    except Exception as err:
        logger.error(f"Vision API analysis failed/timed out for item {item_id}: {str(err)}")
        return {
            "item_id": item_id,
            "risk_level": "unknown",
            "category": "error",
            "confidence": 0.0,
            "reasoning": f"Vision API error or timeout: {str(err)}",
            "error": True,
        }


async def run_content_analysis(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main Content Analysis Agent entry point.
    Iterates over all evidence items in case_data and performs risk classification.
    """
    evidence_items = case_data.get("evidence_items") or []
    item_results: List[Dict[str, Any]] = []

    if not evidence_items:
        # Fallback default if case has no evidence uploaded yet
        default_item = {
            "id": "ev_default_01",
            "type": "text",
            "logs": [{"sender": "system", "message": "No evidence uploaded yet", "timestamp": datetime.utcnow().isoformat() + "Z"}]
        }
        res = await analyze_text_item(default_item)
        item_results.append(res)
    else:
        for item in evidence_items:
            item_type = item.get("type", "").lower()
            if item_type == "image":
                res = await analyze_image_item(item)
            else:
                res = await analyze_text_item(item)
            item_results.append(res)

    # Compute risk aggregates
    high_count = sum(1 for r in item_results if r.get("risk_level") == "high")
    med_count = sum(1 for r in item_results if r.get("risk_level") == "medium")
    low_count = sum(1 for r in item_results if r.get("risk_level") == "low")
    unknown_count = sum(1 for r in item_results if r.get("risk_level") == "unknown")

    if high_count > 0:
        overall_risk = "high"
    elif med_count > 0:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "overall_risk_level": overall_risk,
        "analyzed_items_count": len(item_results),
        "high_risk_count": high_count,
        "medium_risk_count": med_count,
        "low_risk_count": low_count,
        "unknown_risk_count": unknown_count,
        "item_results": item_results,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
