"""Agent 1 — Signal Aggregator.

Parses the Azure Monitor alert webhook payload, then queries multiple data
sources (Log Analytics, Application Insights, Prometheus, Grafana) to build
a time-correlated context bundle with cost tracking.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.models.state import PipelineState
from app.services.azure_monitor import (
    query_dependency_failures,
    query_exceptions,
    query_failed_requests,
    query_metrics,
)
from app.services.app_insights import (
    query_traces,
    query_end_to_end_transactions,
    query_availability,
    query_performance_counters,
)
from app.services.prometheus import query_default_metrics as prometheus_defaults
from app.services.grafana import query_annotations, query_dashboard_alerts

logger = logging.getLogger(__name__)

WINDOW_MINUTES = 5  # ±5 min around the alert fire time

# Rough cost estimates (Azure pay-as-you-go pricing guidelines)
_LOG_ANALYTICS_COST_PER_GB = 2.76  # USD per GB ingested/scanned
_ESTIMATED_GB_PER_KQL = 0.005  # conservative estimate per query


def _parse_alert(raw: dict) -> dict:
    """Extract key fields from the Azure Monitor common alert schema."""
    essentials = raw.get("data", {}).get("essentials", {})
    fired_at = essentials.get("firedDateTime", datetime.now(timezone.utc).isoformat())

    # Resource IDs is a list; take the first one
    resource_ids = essentials.get("alertTargetIDs", [])
    resource_id = resource_ids[0] if resource_ids else ""

    return {
        "alert_id": essentials.get("alertId", ""),
        "severity": essentials.get("severity", "Sev3"),
        "fired_at": fired_at,
        "resource_id": resource_id,
        "resource_name": resource_id.rsplit("/", 1)[-1] if resource_id else "",
        "resource_type": essentials.get("targetResourceType", ""),
        "condition_type": essentials.get("monitorCondition", ""),
        "description": essentials.get("description", ""),
        "alert_rule_name": essentials.get("alertRule", ""),
        "raw": raw,
    }


def _extract_correlation(parsed: dict, raw: dict) -> dict:
    """Build correlation context from alert payload."""
    resource_id = parsed.get("resource_id", "")

    # Try to extract service name from resource ID segments
    service_name = parsed.get("resource_name", "")

    # Detect environment from resource name or tags
    custom = raw.get("data", {}).get("alertContext", {})
    env = custom.get("environment", "")
    if not env:
        name_lower = resource_id.lower()
        for candidate in ("production", "prod", "staging", "dev"):
            if candidate in name_lower:
                env = candidate
                break
        env = env or "unknown"

    return {
        "correlation_id": parsed.get("alert_id", ""),
        "service_name": service_name,
        "environment": env,
    }


async def signal_aggregator(state: PipelineState) -> PipelineState:
    """LangGraph node: aggregate correlated signals from all data sources."""
    raw_payload = state.get("alert_payload", {}).get("raw", state.get("alert_payload", {}))
    parsed = _parse_alert(raw_payload)
    fired_at = parsed["fired_at"]
    resource_id = parsed["resource_id"]
    service_name = parsed["resource_name"]

    # Build correlation context
    correlation = _extract_correlation(parsed, raw_payload)

    logger.info(
        "Signal Aggregator: alert=%s severity=%s resource=%s env=%s",
        parsed["alert_rule_name"],
        parsed["severity"],
        parsed["resource_name"],
        correlation.get("environment", "?"),
    )

    # Track cost
    kql_count = 0
    metrics_api_calls = 0
    prom_queries = 0
    grafana_calls = 0
    cost_notes: list[str] = []
    sources_queried: list[str] = []

    # --- Azure Monitor / Log Analytics ---
    exceptions = await query_exceptions(fired_at, WINDOW_MINUTES)
    kql_count += 1
    failed_reqs = await query_failed_requests(fired_at, WINDOW_MINUTES)
    kql_count += 1
    dep_failures = await query_dependency_failures(fired_at, WINDOW_MINUTES)
    kql_count += 1
    metrics = await query_metrics(resource_id, fired_at, window_minutes=WINDOW_MINUTES * 2)
    metrics_api_calls += 3  # 3 default metric names
    sources_queried.append("azure_monitor")
    sources_queried.append("log_analytics")

    # --- Application Insights (same Log Analytics workspace) ---
    traces = await query_traces(fired_at, WINDOW_MINUTES)
    kql_count += 1
    e2e_transactions = await query_end_to_end_transactions(fired_at, WINDOW_MINUTES)
    kql_count += 1
    availability = await query_availability(fired_at, WINDOW_MINUTES)
    kql_count += 1
    perf_counters = await query_performance_counters(fired_at, WINDOW_MINUTES)
    kql_count += 1
    sources_queried.append("application_insights")

    # --- Prometheus ---
    prom_metrics: dict = {}
    try:
        prom_metrics = await prometheus_defaults(fired_at, service_name, WINDOW_MINUTES * 2)
        prom_queries += 4  # 4 default queries
        if prom_metrics:
            sources_queried.append("prometheus")
    except Exception:
        logger.warning("Prometheus query skipped (not configured or unreachable)")

    # --- Grafana ---
    annotations: list[dict] = []
    firing_alerts: list[dict] = []
    try:
        annotations = await query_annotations(fired_at, window_minutes=30)
        grafana_calls += 1
        firing_alerts = await query_dashboard_alerts(fired_at)
        grafana_calls += 1
        if annotations or firing_alerts:
            sources_queried.append("grafana")
    except Exception:
        logger.warning("Grafana query skipped (not configured or unreachable)")

    # --- Cost estimation ---
    estimated_gb = kql_count * _ESTIMATED_GB_PER_KQL
    estimated_cost = estimated_gb * _LOG_ANALYTICS_COST_PER_GB

    if kql_count > 5:
        cost_notes.append(
            f"Ran {kql_count} KQL queries (~{estimated_gb:.3f} GB scanned). "
            "Consider using summary tables or materialized views to reduce scan volume."
        )
    if estimated_cost > 0.05:
        cost_notes.append(
            f"Estimated Log Analytics cost for this incident: ${estimated_cost:.3f}. "
            "High-frequency alerts may compound this."
        )

    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=WINDOW_MINUTES)
    end = center + timedelta(minutes=WINDOW_MINUTES)

    return {
        **state,
        "alert_payload": parsed,
        "correlation": correlation,
        "correlated_signals": {
            # Azure Monitor / Log Analytics
            "exceptions": exceptions,
            "failed_requests": failed_reqs,
            "dependency_failures": dep_failures,
            "metrics_snapshot": metrics,
            # Application Insights
            "traces": traces,
            "end_to_end_transactions": e2e_transactions,
            "availability_results": availability,
            "performance_counters": perf_counters,
            # Prometheus
            "prometheus_metrics": prom_metrics,
            # Grafana
            "grafana_annotations": annotations,
            "grafana_firing_alerts": firing_alerts,
            # Metadata
            "sources_queried": sources_queried,
            "time_window_start": start.isoformat(),
            "time_window_end": end.isoformat(),
        },
        "query_cost": {
            "log_analytics_queries": kql_count,
            "log_analytics_gb_scanned": estimated_gb,
            "metrics_api_calls": metrics_api_calls,
            "prometheus_queries": prom_queries,
            "grafana_api_calls": grafana_calls,
            "estimated_cost_usd": estimated_cost,
            "cost_notes": cost_notes,
        },
    }
