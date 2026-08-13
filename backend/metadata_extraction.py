import os
import json
import logging
import asyncio
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("metadata_extraction")
logger.setLevel(logging.INFO)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


async def extract_item_metadata(item: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Extracts metadata & entities (names, phone numbers, device IDs, locations) from evidence items.
    Returns: {item_id, timestamp, device_id, location, entities: [...], error: bool}
    """
    item_id = item.get("id", "unknown_item")
    now_iso = item.get("uploaded_at") or (datetime.utcnow().isoformat() + "Z")

    # DEMO_MODE or no API key fallback
    if is_demo or not GEMINI_API_KEY:
        await asyncio.sleep(0.3)
        item_type = item.get("type", "").lower()

        if item_type == "image":
            filename = item.get("filename", "")
            return {
                "item_id": item_id,
                "timestamp": now_iso,
                "device_id": "iPhone_14_Pro_EXIF",
                "location": "Chennai, Tamil Nadu, IN (13.0827° N, 80.2707° E)",
                "entities": [
                    {"name": "Apple iPhone 14 Pro", "type": "device"},
                    {"name": "Chennai, IN", "type": "location"},
                    {"name": filename, "type": "media_file"},
                ],
                "error": False,
            }
        else:
            logs = item.get("logs") or []
            return {
                "item_id": item_id,
                "timestamp": now_iso,
                "device_id": "Auth_Gateway_Server_04",
                "location": "192.168.1.105 (Internal Network)",
                "entities": [
                    {"name": "Suhail Akthar", "type": "person"},
                    {"name": "+91 98765 43210", "type": "phone_number"},
                    {"name": "192.168.1.105", "type": "ip_address"},
                    {"name": "user_john", "type": "user_account"},
                ],
                "error": False,
            }

    # Real LLM Call with 20s timeout
    async def _call_llm():
        prompt = (
            "Extract structured metadata and entities from this evidence item. "
            "Identify names, phone numbers, IP addresses, device IDs, and location references. "
            "Respond ONLY with a JSON object matching this schema:\n"
            "{\n"
            '  "timestamp": "ISO_TIMESTAMP",\n'
            '  "device_id": "extracted device or server ID",\n'
            '  "location": "extracted location or IP location",\n'
            '  "entities": [ {"name": "string", "type": "person|phone_number|ip_address|location|device|account"} ]\n'
            "}\n\nEvidence Item Data:\n" + json.dumps(item)
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

        return {
            "item_id": item_id,
            "timestamp": parsed.get("timestamp") or now_iso,
            "device_id": parsed.get("device_id") or "Unknown_Device",
            "location": parsed.get("location") or "Unknown_Location",
            "entities": parsed.get("entities") or [],
            "error": False,
        }

    try:
        return await asyncio.wait_for(_call_llm(), timeout=20.0)
    except Exception as err:
        logger.error(f"Metadata extraction failed/timed out for item {item_id}: {str(err)}")
        return {
            "item_id": item_id,
            "timestamp": now_iso,
            "device_id": "Unknown",
            "location": "Unknown",
            "entities": [],
            "error": True,
        }


async def run_metadata_extraction(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main Metadata Extraction Agent entry point.
    """
    evidence_items = case_data.get("evidence_items") or []
    extracted_items: List[Dict[str, Any]] = []

    if not evidence_items:
        dummy_item = {
            "id": "ev_default_01",
            "type": "chat_log",
            "logs": [{"sender": "user_john", "message": "Call me at +91 98765 43210 from 192.168.1.105", "timestamp": datetime.utcnow().isoformat() + "Z"}]
        }
        res = await extract_item_metadata(dummy_item)
        extracted_items.append(res)
    else:
        for item in evidence_items:
            res = await extract_item_metadata(item)
            extracted_items.append(res)

    all_entities = []
    for item_meta in extracted_items:
        all_entities.extend(item_meta.get("entities", []))

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "extracted_items_count": len(extracted_items),
        "total_entities_found": len(all_entities),
        "extracted_items": extracted_items,
        "all_entities": all_entities,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
