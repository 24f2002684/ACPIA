import os
import json
import logging
import asyncio
import networkx as nx
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("correlation")
logger.setLevel(logging.INFO)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


async def run_correlation(case_data: Dict[str, Any], is_demo: bool = DEMO_MODE) -> Dict[str, Any]:
    """
    Correlation Agent: Takes entities extracted by metadata_extraction step,
    uses LLM to identify entity relationships, builds a NetworkX graph,
    and returns edges list and JSON-serializable graph structure.
    """
    case_id = case_data.get("case_id", "unknown_case")
    agent_results = case_data.get("agent_results") or {}
    meta_step = agent_results.get("metadata_extraction") or {}
    all_entities = meta_step.get("all_entities") or []

    # Fallback dummy entities if none extracted yet
    if not all_entities:
        all_entities = [
            {"name": "Suhail Akthar", "type": "person"},
            {"name": "+91 98765 43210", "type": "phone_number"},
            {"name": "192.168.1.105", "type": "ip_address"},
            {"name": "iPhone_14_Pro", "type": "device"},
        ]

    # DEMO_MODE or no API key fallback
    if is_demo or not GEMINI_API_KEY:
        await asyncio.sleep(0.3)
        edges = [
            {"from": "Suhail Akthar", "to": "+91 98765 43210", "relationship_type": "phone_owner", "confidence": 0.95},
            {"from": "+91 98765 43210", "to": "192.168.1.105", "relationship_type": "linked_authentication", "confidence": 0.88},
            {"from": "192.168.1.105", "to": "iPhone_14_Pro", "relationship_type": "device_network_connection", "confidence": 0.91},
        ]
    else:
        # Real LLM call with 20s timeout
        async def _call_llm():
            prompt = (
                "Given these extracted intelligence entities, identify logical relationships between them. "
                "Respond ONLY with a JSON object matching this schema:\n"
                "{\n"
                '  "edges": [\n'
                '    {"from": "Entity A", "to": "Entity B", "relationship_type": "type_string", "confidence": 0.0_to_1.0}\n'
                "  ]\n"
                "}\n\nExtracted Entities:\n" + json.dumps(all_entities)
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
            return parsed.get("edges", [])

        try:
            edges = await asyncio.wait_for(_call_llm(), timeout=20.0)
        except Exception as err:
            logger.error(f"Correlation LLM API error/timeout for case {case_id}: {str(err)}")
            edges = []

    # Build NetworkX Graph
    G = nx.Graph()

    # Add entity nodes
    for entity in all_entities:
        name = entity.get("name")
        if name:
            G.add_node(name, type=entity.get("type", "unknown"))

    # Add edges
    for edge in edges:
        source = edge.get("from")
        target = edge.get("to")
        if source and target:
            G.add_edge(
                source,
                target,
                relationship_type=edge.get("relationship_type", "associated"),
                confidence=edge.get("confidence", 0.8),
            )

    # Convert NetworkX graph to JSON-serializable node/edge list format (node_link_data)
    graph_data = nx.node_link_data(G)

    return {
        "status": "completed",
        "demo_mode": DEMO_MODE,
        "edges": edges,
        "graph": graph_data,
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
