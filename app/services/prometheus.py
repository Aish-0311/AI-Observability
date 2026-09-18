"""Prometheus client — query metrics from a Prometheus-compatible endpoint."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def query_range(
    query: str,
    fired_at: str,
    window_minutes: int = 10,
    step: str = "30s",
) -> list[dict]:
    """Execute a PromQL range query against the configured Prometheus endpoint."""
    url = settings.prometheus_endpoint
    if not url:
        logger.debug("Prometheus endpoint not configured, skipping")
        return []

    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{url}/api/v1/query_range",
                params={
                    "query": query,
                    "start": start.timestamp(),
                    "end": end.timestamp(),
                    "step": step,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for series in data.get("data", {}).get("result", []):
            metric = series.get("metric", {})
            values = series.get("values", [])
            results.append({
                "metric": metric,
                "values": [{"timestamp": v[0], "value": v[1]} for v in values],
            })
        return results
    except Exception:
        logger.warning("Prometheus query failed: %s", query, exc_info=True)
        return []


async def query_instant(query: str, fired_at: str) -> list[dict]:
    """Execute a PromQL instant query."""
    url = settings.prometheus_endpoint
    if not url:
        return []

    ts = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{url}/api/v1/query",
                params={"query": query, "time": ts.timestamp()},
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for series in data.get("data", {}).get("result", []):
            metric = series.get("metric", {})
            value = series.get("value", [None, None])
            results.append({
                "metric": metric,
                "timestamp": value[0],
                "value": value[1],
            })
        return results
    except Exception:
        logger.warning("Prometheus instant query failed: %s", query, exc_info=True)
        return []


# ---------------------------------------------------------------------------
# Canned queries for common observability signals
# ---------------------------------------------------------------------------

_DEFAULT_QUERIES = [
    ('rate(http_requests_total{{status=~"5.."}}[5m])', "http_5xx_rate"),
    ("process_cpu_seconds_total", "cpu_usage"),
    ("process_resident_memory_bytes", "memory_usage"),
    ("up", "service_health"),
]


async def query_default_metrics(
    fired_at: str,
    service_name: str = "",
    window_minutes: int = 10,
) -> dict[str, list[dict]]:
    """Run a standard set of PromQL queries, optionally filtered by service."""
    results: dict[str, list[dict]] = {}
    for promql, name in _DEFAULT_QUERIES:
        if service_name:
            # Inject job filter if service name known
            if "{" in promql:
                promql = promql.replace("{", f'{{job=~".*{service_name}.*",', 1)
            else:
                promql = f'{promql}{{job=~".*{service_name}.*"}}'
        data = await query_range(promql, fired_at, window_minutes)
        if data:
            results[name] = data
    return results
