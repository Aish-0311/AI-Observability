"""LangGraph pipeline — wires the 4 agents into a sequential graph."""

from __future__ import annotations

import logging

from langgraph.graph import END, StateGraph

from app.agents.github_issue_creator import github_issue_creator
from app.agents.knowledge_enricher import knowledge_enricher
from app.agents.root_cause_analyzer import root_cause_analyzer
from app.agents.signal_aggregator import signal_aggregator
from app.models.state import PipelineState

logger = logging.getLogger(__name__)


def _should_enrich(state: PipelineState) -> str:
    """Conditional edge: skip enricher if RCA failed."""
    if state.get("error"):
        return "create_issue"
    return "enrich"


def _handle_error(state: PipelineState) -> PipelineState:
    """Fallback node: create a minimal context when an agent fails."""
    logger.error("Pipeline error: %s", state.get("error"))
    if not state.get("root_cause_analysis"):
        state["root_cause_analysis"] = {
            "summary": "Automated analysis failed. Manual investigation required.",
            "likely_cause": "Unknown — analysis pipeline encountered an error.",
            "severity_assessment": "Unknown",
            "suggested_actions": [
                "Review the raw alert payload in the GitHub issue.",
                "Check Log Analytics manually for the alert time window.",
            ],
            "confidence": 0.0,
            "evidence": [],
            "reasoning_chain": ["Pipeline error prevented analysis."],
            "alternative_hypotheses": [],
            "hallucination_disclaimer": (
                "This is a fallback response — no LLM analysis was performed. "
                "All findings must be verified manually."
            ),
        }
    return state


async def _safe_signal_aggregator(state: PipelineState) -> PipelineState:
    try:
        return await signal_aggregator(state)
    except Exception as exc:
        logger.exception("Signal Aggregator failed")
        return {**state, "error": f"Signal Aggregator: {exc}"}


async def _safe_root_cause_analyzer(state: PipelineState) -> PipelineState:
    try:
        return await root_cause_analyzer(state)
    except Exception as exc:
        logger.exception("Root Cause Analyzer failed")
        return {**state, "error": f"Root Cause Analyzer: {exc}"}


async def _safe_knowledge_enricher(state: PipelineState) -> PipelineState:
    try:
        return await knowledge_enricher(state)
    except Exception as exc:
        logger.exception("Knowledge Enricher failed")
        return {**state, "error": f"Knowledge Enricher: {exc}"}


async def _safe_github_issue_creator(state: PipelineState) -> PipelineState:
    try:
        return await github_issue_creator(state)
    except Exception as exc:
        logger.exception("GitHub Issue Creator failed")
        prev_error = state.get("error", "")
        combined = f"{prev_error} | GitHub Issue Creator: {exc}" if prev_error else f"GitHub Issue Creator: {exc}"
        return {**state, "error": combined}


def build_pipeline() -> StateGraph:
    """Construct and compile the LangGraph state graph."""
    graph = StateGraph(PipelineState)

    # Add nodes
    graph.add_node("aggregate_signals", _safe_signal_aggregator)
    graph.add_node("analyze_root_cause", _safe_root_cause_analyzer)
    graph.add_node("enrich", _safe_knowledge_enricher)
    graph.add_node("create_issue", _safe_github_issue_creator)
    graph.add_node("handle_error", _handle_error)

    # Edges: linear pipeline with one conditional branch
    graph.set_entry_point("aggregate_signals")
    graph.add_edge("aggregate_signals", "analyze_root_cause")
    graph.add_conditional_edges(
        "analyze_root_cause",
        _should_enrich,
        {"enrich": "enrich", "create_issue": "handle_error"},
    )
    graph.add_edge("enrich", "create_issue")
    graph.add_edge("handle_error", "create_issue")
    graph.add_edge("create_issue", END)

    return graph.compile()


# Module-level compiled pipeline (reused across requests)
pipeline = build_pipeline()
