"""Grafana client — fetch annotations and dashboard panel snapshots."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def query_annotations(
    fired_at: str,
    window_minutes: int = 30,
    tags: list[str] | None = None,
) -> list[dict]:
    """Fetch Grafana annotations (alerts, deployments, etc.) around the alert time."""
    url = settings.grafana_endpoint
    token = settings.grafana_api_key
    if not url or not token:
        logger.debug("Grafana endpoint/key not configured, skipping")
        return []

    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start_ms = int((center - timedelta(minutes=window_minutes)).timestamp() * 1000)
    end_ms = int((center + timedelta(minutes=window_minutes)).timestamp() * 1000)

    params: dict = {"from": start_ms, "to": end_ms, "limit": 50}
    if tags:
        params["tags"] = tags

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{url}/api/annotations",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            annotations = resp.json()

        return [
            {
                "id": a.get("id"),
                "text": a.get("text", ""),
                "tags": a.get("tags", []),
                "time": a.get("time"),
                "dashboard_title": a.get("dashboardTitle", ""),
                "panel_title": a.get("panelTitle", ""),
            }
            for a in annotations
        ]
    except Exception:
        logger.warning("Grafana annotations query failed", exc_info=True)
        return []


async def query_dashboard_alerts(
    fired_at: str,
    window_minutes: int = 30,
) -> list[dict]:
    """Fetch active Grafana alert rules and their states."""
    url = settings.grafana_endpoint
    token = settings.grafana_api_key
    if not url or not token:
        return []

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{url}/api/v1/provisioning/alert-rules",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            rules = resp.json()

        # Return firing/pending rules only
        return [
            {
                "title": r.get("title", ""),
                "condition": r.get("condition", ""),
                "labels": r.get("labels", {}),
                "state": r.get("state", ""),
                "folder_title": r.get("folderTitle", ""),
            }
            for r in rules
            if r.get("state") in ("firing", "pending", "alerting")
        ]
    except Exception:
        logger.warning("Grafana alert rules query failed", exc_info=True)
        return []
