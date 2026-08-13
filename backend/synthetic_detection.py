import os
import json
import base64
import logging
import asyncio
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("synthetic_detection")
logger.setLevel(logging.INFO)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
HF_API_KEY = os.getenv("HF_API_KEY") or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
DEFAULT_HF_MODEL = os.getenv("HF_MODEL", "umm-maybe/AI-image-detector")


async def detect_synthetic_image(item: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Analyzes an image evidence item for deepfake/synthetic manipulation using Hugging Face Inference API.
    Output: {item_id, is_likely_synthetic, confidence, method, error: bool}
    """
    item_id = item.get("id", "unknown_image_item")

    # DEMO_MODE or no Hugging Face API key fallback
    if is_demo or not HF_API_KEY:
        await asyncio.sleep(0.3)
        filename = (item.get("filename") or "").lower()

        if "fake" in filename or "synthetic" in filename or "deepfake" in filename:
            is_synthetic = True
            confidence = 0.94
            method = "huggingface_deepfake_detector_demo"
        else:
            is_synthetic = False
            confidence = 0.96
            method = "huggingface_deepfake_detector_demo"

        return {
            "item_id": item_id,
            "is_likely_synthetic": is_synthetic,
            "confidence": confidence,
            "method": method,
            "error": False,
        }

    # Real Hugging Face Inference API call with 20s timeout
    async def _call_hf_api():
        url = f"https://api-inference.huggingface.co/models/{DEFAULT_HF_MODEL}"
        file_url = item.get("url", "")
        file_path = None

        if file_url.startswith("/uploads/"):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(base_dir, file_url.lstrip("/"))

        if not file_path or not os.path.exists(file_path):
            raise FileNotFoundError(f"Image file for synthetic detection not found: {file_path}")

        with open(file_path, "rb") as f:
            img_bytes = f.read()

        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/octet-stream",
        }

        req = urllib.request.Request(url, data=img_bytes, headers=headers, method="POST")
        loop = asyncio.get_running_loop()

        def _exec():
            with urllib.request.urlopen(req, timeout=18) as resp:
                return json.loads(resp.read().decode("utf-8"))

        res_json = await loop.run_in_executor(None, _exec)

        # Parse classification scores from HF model (e.g. [{"label": "artificial", "score": 0.92}, ...])
        is_synthetic = False
        confidence = 0.85

        if isinstance(res_json, list):
            for label_data in res_json:
                label_name = str(label_data.get("label", "")).lower()
                score = float(label_data.get("score", 0.0))
                if any(kw in label_name for kw in ["artificial", "fake", "synthetic", "ai_generated"]):
                    if score > 0.5:
                        is_synthetic = True
                        confidence = round(score, 2)
                        break

        return {
            "item_id": item_id,
            "is_likely_synthetic": is_synthetic,
            "confidence": confidence,
            "method": f"huggingface_{DEFAULT_HF_MODEL}",
            "error": False,
        }

    try:
        return await asyncio.wait_for(_call_hf_api(), timeout=20.0)
    except Exception as err:
        logger.error(f"Hugging Face Synthetic Detection API error/timeout for item {item_id}: {str(err)}")
        return {
            "item_id": item_id,
            "is_likely_synthetic": False,
            "confidence": 0.0,
            "method": "huggingface_error_fallback",
            "error": True,
        }


async def run_synthetic_detection(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main Synthetic Detection Agent entry point.
    Filter image evidence items and run deepfake/synthetic analysis.
    """
    evidence_items = case_data.get("evidence_items") or []
    image_items = [item for item in evidence_items if item.get("type", "").lower() == "image"]
    detection_results: List[Dict[str, Any]] = []

    if not image_items:
        dummy_img = {
            "id": "ev_img_default_01",
            "type": "image",
            "filename": "camera_capture_auth.png",
            "url": "/uploads/default/camera_capture_auth.png",
        }
        res = await detect_synthetic_image(dummy_img)
        detection_results.append(res)
    else:
        for img_item in image_items:
            res = await detect_synthetic_image(img_item)
            detection_results.append(res)

    synthetic_count = sum(1 for r in detection_results if r.get("is_likely_synthetic"))

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "analyzed_images_count": len(detection_results),
        "synthetic_images_count": synthetic_count,
        "synthetic_detection_results": detection_results,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
