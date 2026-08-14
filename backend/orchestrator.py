import time
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from database import get_case, update_case
from models import CaseUpdate
from content_analysis import run_content_analysis
from metadata_extraction import run_metadata_extraction
from correlation import run_correlation
from timeline_reconstruction import run_timeline_reconstruction
from synthetic_detection import run_synthetic_detection
from validation import run_validation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orchestrator")

# In-memory progress event store mapping case_id -> list of progress event dicts
PROGRESS_STORE: Dict[str, List[Dict[str, Any]]] = {}

AGENT_PIPELINE = [
    "content_analysis",
    "metadata_extraction",
    "correlation",
    "timeline_reconstruction",
    "synthetic_detection",
    "validation",
]


class Orchestrator:
    def __init__(self, case_id: str):
        self.case_id = case_id
        if self.case_id not in PROGRESS_STORE:
            PROGRESS_STORE[self.case_id] = []

    def _add_progress_event(self, step: str, status: str, progress_pct: float, message: str, details: Optional[Dict[str, Any]] = None):
        """Append progress event to in-memory store for frontend polling."""
        event = {
            "case_id": self.case_id,
            "step": step,
            "status": status,
            "progress_pct": round(progress_pct, 1),
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        PROGRESS_STORE[self.case_id].append(event)
        logger.info(f"[{self.case_id}] Step '{step}' status '{status}' ({progress_pct:.1f}%): {message}")
        return event

    async def _run_agent_stub(self, step_name: str, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate agent execution by sleeping 1 second and returning placeholder result schema."""
        await asyncio.sleep(1.0)
        now_iso = datetime.utcnow().isoformat() + "Z"

        if step_name == "content_analysis":
            return await run_content_analysis(case_data)
        elif step_name == "metadata_extraction":
            return await run_metadata_extraction(case_data)
        elif step_name == "correlation":
            return await run_correlation(case_data)
        elif step_name == "timeline_reconstruction":
            return await run_timeline_reconstruction(case_data)
        elif step_name == "synthetic_detection":
            return await run_synthetic_detection(case_data)
        elif step_name == "validation":
            return await run_validation(case_data)
        else:
            return {"status": "completed", "summary": f"Executed {step_name}", "completed_at": now_iso}

    async def run_pipeline(self) -> Dict[str, Any]:
        """Runs the sequential 6-step agent pipeline, updating SQLite DB per step and recording progress."""
        logger.info(f"Starting pipeline orchestration for case: {self.case_id}")
        case_data = get_case(self.case_id)

        if not case_data:
            err_msg = f"Case ID '{self.case_id}' not found in database."
            self._add_progress_event("init", "failed", 0.0, err_msg)
            return {"error": err_msg}

        # Update case status to analyzing
        update_case(self.case_id, CaseUpdate(status="analyzing"))
        self._add_progress_event("init", "started", 0.0, f"Analysis pipeline started for case {self.case_id}")

        agent_results = dict(case_data.get("agent_results") or {})
        total_steps = len(AGENT_PIPELINE)

        for idx, step_name in enumerate(AGENT_PIPELINE):
            step_num = idx + 1
            start_pct = ((step_num - 1) / total_steps) * 100.0
            end_pct = (step_num / total_steps) * 100.0

            self._add_progress_event(step_name, "running", start_pct, f"Running step {step_num}/{total_steps}: {step_name}")

            try:
                # Pass accumulated agent_results to case_data so downstream agents can inspect prior findings
                case_data["agent_results"] = agent_results
                step_result = await self._run_agent_stub(step_name, case_data)
                agent_results[step_name] = step_result

                # Update database immediately after step completes
                update_case(self.case_id, CaseUpdate(agent_results=agent_results))
                self._add_progress_event(step_name, "completed", end_pct, f"Completed step {step_num}/{total_steps}: {step_name}", details=step_result)

            except Exception as err:
                logger.error(f"Error executing agent step '{step_name}' for case {self.case_id}: {str(err)}", exc_info=True)
                failed_result = {
                    "status": "failed",
                    "error": str(err),
                    "failed_at": datetime.utcnow().isoformat() + "Z",
                }
                agent_results[step_name] = failed_result

                # Save failure status to database & continue pipeline
                update_case(self.case_id, CaseUpdate(agent_results=agent_results))
                self._add_progress_event(step_name, "failed", end_pct, f"Failed step {step_num}/{total_steps}: {step_name} - {str(err)}", details=failed_result)

        # Final pipeline status update
        final_case = get_case(self.case_id)
        has_failures = any(res.get("status") == "failed" for res in agent_results.values())
        final_status = "completed_with_errors" if has_failures else "completed"

        update_case(self.case_id, CaseUpdate(status=final_status))
        self._add_progress_event("pipeline_finish", "completed", 100.0, f"Pipeline finished with status: {final_status}")

        return {
            "case_id": self.case_id,
            "status": final_status,
            "agent_results": agent_results,
        }


def get_case_progress(case_id: str) -> Dict[str, Any]:
    """Helper function to retrieve in-memory progress and latest case state for polling."""
    events = PROGRESS_STORE.get(case_id, [])
    case_data = get_case(case_id)

    latest_pct = events[-1]["progress_pct"] if events else 0.0
    latest_step = events[-1]["step"] if events else "pending"
    latest_status = events[-1]["status"] if events else "pending"

    return {
        "case_id": case_id,
        "case_status": case_data.get("status") if case_data else "unknown",
        "latest_step": latest_step,
        "latest_status": latest_status,
        "progress_pct": latest_pct,
        "completion_percentage": latest_pct,
        "event_count": len(events),
        "events": events,
        "history": events,
        "agent_results": case_data.get("agent_results") if case_data else {},
    }
