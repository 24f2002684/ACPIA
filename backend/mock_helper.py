import os
import json
import logging

logger = logging.getLogger("mock_helper")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOCK_DATA_DIR = os.path.join(BASE_DIR, "mock_data")


def load_mock_json(filename: str, default_data: dict = None) -> dict:
    """Safely loads realistic mock JSON from /backend/mock_data/ directory."""
    file_path = os.path.join(MOCK_DATA_DIR, filename)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as err:
            logger.error(f"Error reading mock file {filename}: {str(err)}")
    return default_data or {}
