"""FastAPI application — webhook endpoint for Azure Monitor alerts."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, Request

from app.config import settings
from app.pipeline import pipeline

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Observability Platform starting up")
    yield
    logger.info("AI Observability Platform shutting down")


app = FastAPI(
    title="AI Observability Platform",
    description="Alert → Root Cause Analysis → GitHub Issue",
    version="0.1.0",
    lifespan=lifespan,
)


async def _run_pipeline(payload: dict) -> None:
    """Execute the full LangGraph pipeline as a background task."""
    try:
        initial_state = {"alert_payload": {"raw": payload}}
        result = await pipeline.ainvoke(initial_state)
        issue_url = result.get("github_issue_url", "N/A")
        error = result.get("error")
        if error:
            logger.warning("Pipeline completed with error: %s | issue: %s", error, issue_url)
        else:
            logger.info("Pipeline completed successfully → %s", issue_url)
    except Exception:
        logger.exception("Pipeline execution failed")


@app.post("/webhook/alert", status_code=202)
async def receive_alert(request: Request, background_tasks: BackgroundTasks):
    """Receive an Azure Monitor alert webhook and process it asynchronously.

    Returns 202 Accepted immediately so Azure Monitor doesn't time out,
    then runs the full analysis pipeline in the background.
    """
    payload = await request.json()
    logger.info("Received alert webhook: %s", payload.get("data", {}).get("essentials", {}).get("alertRule", "unknown"))
    background_tasks.add_task(_run_pipeline, payload)
    return {"status": "accepted", "message": "Alert received, processing started."}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/debug/config")
async def debug_config():
    """Check that required env vars are set (doesn't expose secrets)."""
    return {
        "azure_log_analytics_workspace_id": bool(settings.azure_log_analytics_workspace_id),
        "azure_openai_endpoint": settings.azure_openai_endpoint[:30] + "..." if settings.azure_openai_endpoint else "",
        "azure_openai_deployment": settings.azure_openai_deployment,
        "github_token_set": bool(settings.github_token),
        "github_repo": settings.github_repo,
    }


@app.post("/debug/run-pipeline")
async def debug_run_pipeline(request: Request):
    """Run pipeline synchronously and return result or error (for debugging)."""
    payload = await request.json()
    try:
        initial_state = {"alert_payload": {"raw": payload}}
        result = await pipeline.ainvoke(initial_state)
        return {
            "success": True,
            "github_issue_url": result.get("github_issue_url"),
            "error": result.get("error"),
            "rca_summary": str(result.get("root_cause_analysis", ""))[:500],
            "signals_sources": result.get("correlated_signals", {}).get("sources_queried", []),
            "has_exceptions": len(result.get("correlated_signals", {}).get("exceptions", [])) > 0,
            "has_failed_requests": len(result.get("correlated_signals", {}).get("failed_requests", [])) > 0,
        }
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()[-2000:]}


@app.get("/")
async def root():
    return {
        "service": "AI Observability Platform",
        "version": "0.1.0",
        "endpoints": {
            "POST /webhook/alert": "Receive Azure Monitor alert webhook",
            "GET /health": "Health check",
        },
    }
