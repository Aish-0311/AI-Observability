"""Agent 3 — Knowledge Enricher.

Adds context from past incidents and recent GitHub commits to help
correlate the current incident with known patterns and recent changes.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from app.config import settings
from app.models.state import PipelineState
from app.services.github_client import get_recent_commits

logger = logging.getLogger(__name__)


def _load_past_incidents() -> list[dict]:
    """Load the past-incidents JSON file (PoC store)."""
    path = Path(settings.past_incidents_path)
    if not path.exists():
        logger.info("No past incidents file at %s", path)
        return []
    with open(path) as f:
        return json.load(f)


def _find_similar(incidents: list[dict], summary: str) -> list[dict]:
    """Keyword-match past incidents against the RCA summary (simple PoC)."""
    if not summary:
        return []
    keywords = {w.lower() for w in summary.split() if len(w) > 4}
    scored = []
    for inc in incidents:
        text = f"{inc.get('summary', '')} {inc.get('cause', '')}".lower()
        overlap = sum(1 for kw in keywords if kw in text)
        if overlap > 0:
            scored.append((overlap, inc))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [inc for _, inc in scored[:5]]


async def knowledge_enricher(state: PipelineState) -> PipelineState:
    """LangGraph node: enrich the incident with historical context."""
    rca = state.get("root_cause_analysis", {})
    alert = state.get("alert_payload", {})
    summary = rca.get("summary", "")

    # Past incidents
    all_incidents = _load_past_incidents()
    similar = _find_similar(all_incidents, summary)
    logger.info("Knowledge Enricher: found %d similar past incidents", len(similar))

    # Recent commits to the affected service
    service_name = alert.get("resource_name", "")
    commits = await get_recent_commits(service_name=service_name, hours=24)
    logger.info("Knowledge Enricher: found %d recent commits", len(commits))

    # Identify suspect commits (simple heuristic: commits close to alert time)
    suspect: list[dict] = []
    if commits and alert.get("fired_at"):
        from datetime import datetime

        fired = datetime.fromisoformat(alert["fired_at"].replace("Z", "+00:00"))
        for c in commits:
            if c.get("date"):
                commit_dt = datetime.fromisoformat(c["date"].replace("Z", "+00:00"))
                delta = abs((fired - commit_dt).total_seconds())
                if delta < 3600:  # within 1 hour
                    suspect.append(c)

    return {
        **state,
        "enrichment_context": {
            "similar_past_incidents": similar,
            "recent_commits": commits,
            "suspect_commits": suspect,
        },
    }
