import os
import json
import logging
import asyncio
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("timeline_reconstruction")
logger.setLevel(logging.INFO)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


async def run_timeline_reconstruction(case_data: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Timeline Reconstruction Agent: Collects all timestamped items across evidence and metadata,
    sorts them chronologically, and uses LLM to generate a single-line description per event.
    Output: {timeline: [{time, event, source_item_id}]}
    """
    case_id = case_data.get("case_id", "unknown_case")
    evidence_items = case_data.get("evidence_items") or []

    # Gather raw timestamped entries
    raw_events: List[Dict[str, Any]] = []

    for item in evidence_items:
        item_id = item.get("id", "item_unk")
        uploaded_at = item.get("uploaded_at") or datetime.utcnow().isoformat() + "Z"

        if item.get("type") == "chat_log":
            logs = item.get("logs") or []
            for log in logs:
                raw_events.append({
                    "time": log.get("timestamp") or uploaded_at,
                    "source_item_id": item_id,
                    "content": f"{log.get('sender')}: {log.get('message')}",
                })
        else:
            raw_events.append({
                "time": uploaded_at,
                "source_item_id": item_id,
                "content": f"Image/Media File Uploaded: {item.get('filename', 'file')}",
            })

    # Fallback if no evidence present
    if not raw_events:
        now_iso = datetime.utcnow().isoformat() + "Z"
        raw_events = [
            {"time": "2026-08-13T14:32:00Z", "source_item_id": "ev_demo_1", "content": "Initial security alert triggered for suspicious authorization"},
            {"time": "2026-08-13T14:33:15Z", "source_item_id": "ev_demo_2", "content": "Support agent initiated account diagnostic protocol"},
            {"time": "2026-08-13T14:33:20Z", "source_item_id": "ev_demo_3", "content": "System registered multiple failed password attempts from IP 192.168.1.105"},
        ]

    # Sort chronologically by time
    raw_events.sort(key=lambda x: x.get("time", ""))

    # DEMO_MODE or no API key fallback
    if is_demo or not GEMINI_API_KEY:
        await asyncio.sleep(0.3)
        timeline = []
        for entry in raw_events:
            t = entry.get("time", "")
            c = entry.get("content", "")
            s_id = entry.get("source_item_id", "")
            # Generate clean one-line event summary
            timeline.append({
                "time": t,
                "event": f"Observed event: {c}",
                "source_item_id": s_id,
            })
    else:
        # Real LLM call with 20s timeout
        async def _call_llm():
            prompt = (
                "Transform these chronological raw evidence events into concise, high-clarity one-line incident summaries. "
                "Respond ONLY with a JSON object matching this schema:\n"
                "{\n"
                '  "timeline": [\n'
                '    {"time": "ISO_TIMESTAMP", "event": "concise one line summary", "source_item_id": "item_id"}\n'
                "  ]\n"
                "}\n\nRaw Events:\n" + json.dumps(raw_events)
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
            return parsed.get("timeline", [])

        try:
            timeline = await asyncio.wait_for(_call_llm(), timeout=20.0)
        except Exception as err:
            logger.error(f"Timeline Reconstruction LLM API error/timeout for case {case_id}: {str(err)}")
            timeline = [{"time": e.get("time"), "event": e.get("content"), "source_item_id": e.get("source_item_id")} for e in raw_events]

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "event_count": len(timeline),
        "timeline": timeline,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
