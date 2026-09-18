"""Agent 2 — Root Cause Analyzer (LLM-based).

Sends the alert payload and correlated signals to Azure OpenAI
and returns a structured root-cause analysis.
"""

from __future__ import annotations

import logging

from app.models.state import PipelineState
from app.services.azure_openai import analyze_root_cause

logger = logging.getLogger(__name__)


async def root_cause_analyzer(state: PipelineState) -> PipelineState:
    """LangGraph node: call LLM to determine root cause."""
    alert = state.get("alert_payload", {})
    signals = state.get("correlated_signals", {})
    correlation = state.get("correlation", {})

    logger.info(
        "Root Cause Analyzer: processing alert=%s with %d exceptions, %d failed requests, sources=%s",
        alert.get("alert_rule_name", "?"),
        len(signals.get("exceptions", [])),
        len(signals.get("failed_requests", [])),
        signals.get("sources_queried", []),
    )

    rca = await analyze_root_cause(
        alert_payload=alert,
        correlated_signals=signals,
        correlation=correlation,
    )

    logger.info(
        "RCA result: cause=%s confidence=%.2f evidence_count=%d",
        rca.get("likely_cause", "?")[:80],
        rca.get("confidence", 0),
        len(rca.get("evidence", [])),
    )

    return {
        **state,
        "root_cause_analysis": rca,
    }
