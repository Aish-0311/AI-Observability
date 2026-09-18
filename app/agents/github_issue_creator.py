"""Agent 4 — GitHub Issue Creator.

Formats a detailed incident report and creates a GitHub issue
with structured sections: summary, signals, RCA, enrichment, actions.
"""

from __future__ import annotations

import logging

from app.models.state import PipelineState
from app.services.github_client import create_issue

logger = logging.getLogger(__name__)


def _build_issue_body(state: PipelineState) -> str:
    """Build a Markdown issue body from the pipeline state."""
    alert = state.get("alert_payload", {})
    signals = state.get("correlated_signals", {})
    rca = state.get("root_cause_analysis", {})
    enrichment = state.get("enrichment_context", {})
    correlation = state.get("correlation", {})
    cost = state.get("query_cost", {})

    sections: list[str] = []

    # Header
    sections.append(f"## 🚨 Incident Report — {alert.get('alert_rule_name', 'Unknown Alert')}")
    sections.append("")

    # Hallucination disclaimer (top of issue when confidence is low)
    confidence = rca.get("confidence", 0)
    if confidence < 0.5:
        sections.append("> ⚠️ **Low confidence analysis ({:.0%})** — ".format(confidence)
                        + "This RCA may be speculative. Verify findings manually.")
        sections.append("")
    disclaimer = rca.get("hallucination_disclaimer", "")
    if disclaimer:
        sections.append(f"> 🤖 **AI Disclaimer:** {disclaimer}")
        sections.append("")

    # Summary
    sections.append("### Summary")
    sections.append(rca.get("summary", "_No RCA summary available._"))
    sections.append("")

    # Correlation context
    if correlation:
        sections.append("### Correlation Context")
        sections.append("| Field | Value |")
        sections.append("|-------|-------|")
        sections.append(f"| **Correlation ID** | `{correlation.get('correlation_id', 'N/A')}` |")
        sections.append(f"| **Service** | {correlation.get('service_name', 'N/A')} |")
        sections.append(f"| **Environment** | {correlation.get('environment', 'N/A')} |")
        sections.append("")

    # Alert details
    sections.append("### Alert Details")
    sections.append("| Field | Value |")
    sections.append("|-------|-------|")
    sections.append(f"| **Severity** | {alert.get('severity', 'N/A')} |")
    sections.append(f"| **Fired At** | {alert.get('fired_at', 'N/A')} |")
    sections.append(f"| **Resource** | `{alert.get('resource_name', 'N/A')}` |")
    sections.append(f"| **Resource Type** | {alert.get('resource_type', 'N/A')} |")
    sections.append(f"| **Description** | {alert.get('description', 'N/A')} |")
    sections.append("")

    # Root Cause Analysis
    sections.append("### Root Cause Analysis")
    sections.append(f"**Likely Cause:** {rca.get('likely_cause', '_Unknown_')}")
    sections.append(f"**Severity Assessment:** {rca.get('severity_assessment', 'N/A')}")
    sections.append(f"**Confidence:** {confidence:.0%}")
    sections.append("")

    # Evidence (new — raw data backing the claim)
    evidence = rca.get("evidence", [])
    if evidence:
        sections.append("### 📋 Supporting Evidence")
        for i, ev in enumerate(evidence, 1):
            source = ev.get("source", "Unknown")
            sig_type = ev.get("signal_type", "")
            relevance = ev.get("relevance", "")
            sections.append(f"**{i}. [{source}] {sig_type}**")
            sections.append(f"  - Relevance: {relevance}")
            data = ev.get("data", {})
            if data:
                sections.append("  ```json")
                import json as _json
                sections.append(f"  {_json.dumps(data, default=str, indent=2)[:500]}")
                sections.append("  ```")
        sections.append("")

    # Reasoning chain
    chain = rca.get("reasoning_chain", [])
    if chain:
        sections.append("### 🔗 Reasoning Chain")
        for i, step in enumerate(chain, 1):
            sections.append(f"{i}. {step}")
        sections.append("")

    # Alternative hypotheses
    alternatives = rca.get("alternative_hypotheses", [])
    if alternatives:
        sections.append("### 🔄 Alternative Hypotheses")
        for alt in alternatives:
            sections.append(f"- {alt}")
        sections.append("")

    # Data sources queried
    sources = signals.get("sources_queried", [])
    if sources:
        sections.append(f"### 📡 Data Sources Queried: {', '.join(sources)}")
        sections.append("")

    # Correlated signals
    sections.append("### Correlated Signals")
    sections.append(
        f"_Time window: {signals.get('time_window_start', '?')} "
        f"→ {signals.get('time_window_end', '?')}_"
    )
    sections.append("")

    # Exceptions
    exceptions = signals.get("exceptions", [])
    if exceptions:
        sections.append(f"#### Exceptions ({len(exceptions)})")
        sections.append("```")
        for ex in exceptions[:5]:
            sections.append(
                f"[{ex.get('TimeGenerated', '')}] {ex.get('ExceptionType', '')}: "
                f"{ex.get('OuterMessage', ex.get('InnermostMessage', ''))}"
            )
        if len(exceptions) > 5:
            sections.append(f"... and {len(exceptions) - 5} more")
        sections.append("```")
        sections.append("")

    # Failed requests
    failed = signals.get("failed_requests", [])
    if failed:
        sections.append(f"#### Failed Requests ({len(failed)})")
        sections.append("```")
        for req in failed[:5]:
            sections.append(
                f"[{req.get('TimeGenerated', '')}] {req.get('Name', '')} "
                f"→ {req.get('ResultCode', '')} ({req.get('DurationMs', '')}ms)"
            )
        if len(failed) > 5:
            sections.append(f"... and {len(failed) - 5} more")
        sections.append("```")
        sections.append("")

    # Distributed traces (Application Insights)
    traces = signals.get("traces", [])
    if traces:
        sections.append(f"#### App Insights Traces ({len(traces)})")
        sections.append("```")
        for t in traces[:5]:
            sections.append(
                f"[{t.get('TimeGenerated', '')}] Sev{t.get('SeverityLevel', '?')}: "
                f"{t.get('Message', '')[:120]}"
            )
        if len(traces) > 5:
            sections.append(f"... and {len(traces) - 5} more")
        sections.append("```")
        sections.append("")

    # Availability results
    avail = signals.get("availability_results", [])
    if avail:
        sections.append(f"#### Availability Tests ({len(avail)})")
        for a in avail[:5]:
            status = "✅" if a.get("Success") == "True" else "❌"
            sections.append(
                f"- {status} {a.get('Name', '')} from {a.get('Location', '')} "
                f"— {a.get('DurationMs', '?')}ms"
            )
        sections.append("")

    # Prometheus metrics
    prom = signals.get("prometheus_metrics", {})
    if prom:
        sections.append("#### Prometheus Metrics")
        for name, series_list in prom.items():
            sections.append(f"- **{name}**: {len(series_list)} series returned")
        sections.append("")

    # Grafana annotations
    g_ann = signals.get("grafana_annotations", [])
    if g_ann:
        sections.append(f"#### Grafana Annotations ({len(g_ann)})")
        for ann in g_ann[:5]:
            sections.append(f"- [{', '.join(ann.get('tags', []))}] {ann.get('text', '')}")
        sections.append("")

    # Grafana firing alerts
    g_alerts = signals.get("grafana_firing_alerts", [])
    if g_alerts:
        sections.append(f"#### Grafana Firing Alerts ({len(g_alerts)})")
        for ga in g_alerts[:5]:
            sections.append(f"- **{ga.get('title', '')}** — state: {ga.get('state', '')}")
        sections.append("")

    # Metrics snapshot
    metrics = signals.get("metrics_snapshot", {})
    if metrics:
        sections.append("#### Azure Monitor Metrics")
        for name, points in metrics.items():
            if points:
                avg = sum(p.get("average", 0) or 0 for p in points) / len(points)
                peak = max((p.get("maximum", 0) or 0) for p in points)
                sections.append(f"- **{name}**: avg={avg:.2f}, peak={peak:.2f}")
        sections.append("")

    # Enrichment — past incidents
    past = enrichment.get("similar_past_incidents", [])
    if past:
        sections.append("### Similar Past Incidents")
        for inc in past[:3]:
            sections.append(
                f"- **{inc.get('title', inc.get('summary', 'N/A'))}** "
                f"({inc.get('date', 'N/A')}): {inc.get('cause', 'N/A')}"
            )
        sections.append("")

    # Enrichment — suspect commits
    suspect = enrichment.get("suspect_commits", [])
    if suspect:
        sections.append("### 🔍 Suspect Commits (within 1h of alert)")
        for c in suspect:
            sections.append(
                f"- [`{c.get('sha', '?')}`]({c.get('url', '')}) "
                f"{c.get('message', '')} — {c.get('author', '')}"
            )
        sections.append("")

    # Suggested actions
    actions = rca.get("suggested_actions", [])
    if actions:
        sections.append("### Suggested Actions")
        for i, action in enumerate(actions, 1):
            sections.append(f"{i}. {action}")
        sections.append("")

    # Cost estimate
    if cost:
        sections.append("### 💰 Query Cost Estimate")
        sections.append(f"- Log Analytics queries: {cost.get('log_analytics_queries', 0)}")
        sections.append(f"- Estimated data scanned: {cost.get('log_analytics_gb_scanned', 0):.3f} GB")
        sections.append(f"- Metrics API calls: {cost.get('metrics_api_calls', 0)}")
        sections.append(f"- Prometheus queries: {cost.get('prometheus_queries', 0)}")
        sections.append(f"- Grafana API calls: {cost.get('grafana_api_calls', 0)}")
        sections.append(f"- **Estimated cost: ${cost.get('estimated_cost_usd', 0):.4f}**")
        for note in cost.get("cost_notes", []):
            sections.append(f"  - ⚠️ {note}")
        sections.append("")

    sections.append("---")
    sections.append("_Generated by AI Observability Platform · Evidence-based RCA with hallucination safeguards_")

    return "\n".join(sections)


def _severity_label(severity: str) -> str:
    mapping = {
        "Sev0": "critical",
        "Sev1": "high",
        "Sev2": "medium",
        "Sev3": "low",
        "Sev4": "informational",
    }
    return mapping.get(severity, "incident")


async def github_issue_creator(state: PipelineState) -> PipelineState:
    """LangGraph node: create a GitHub issue with the full incident report."""
    alert = state.get("alert_payload", {})
    rca = state.get("root_cause_analysis", {})

    title = (
        f"[{alert.get('severity', 'Sev3')}] "
        f"{alert.get('alert_rule_name', 'Incident')}: "
        f"{rca.get('likely_cause', 'Unknown cause')[:80]}"
    )
    body = _build_issue_body(state)

    labels = [
        "incident",
        _severity_label(alert.get("severity", "")),
        "ai-generated",
    ]

    url = await create_issue(title=title, body=body, labels=labels)
    logger.info("GitHub issue created: %s", url)

    return {
        **state,
        "github_issue_url": url,
    }
