"""Shared pipeline state that flows through all LangGraph nodes."""

from __future__ import annotations

from typing import TypedDict


class AlertPayload(TypedDict, total=False):
    """Parsed fields from the Azure Monitor common alert schema."""

    alert_id: str
    severity: str  # Sev0–Sev4
    fired_at: str  # ISO-8601
    resource_id: str
    resource_name: str
    resource_type: str
    condition_type: str  # e.g. "Metric", "LogQueryBased"
    description: str
    alert_rule_name: str
    raw: dict  # full original payload


class CorrelationContext(TypedDict, total=False):
    """Shared identifiers for cross-signal correlation."""

    correlation_id: str  # links logs + metrics + traces
    service_name: str
    environment: str  # e.g. production, staging


class CorrelatedSignals(TypedDict, total=False):
    """Time-correlated logs, metrics, and traces from all sources."""

    # Azure Monitor / Log Analytics
    exceptions: list[dict]
    failed_requests: list[dict]
    dependency_failures: list[dict]
    metrics_snapshot: dict  # metric_name -> [datapoints]

    # Application Insights
    traces: list[dict]  # distributed traces (warning+)
    end_to_end_transactions: list[dict]  # full transaction for failed ops
    availability_results: list[dict]
    performance_counters: list[dict]

    # Prometheus
    prometheus_metrics: dict  # query_name -> [series]

    # Grafana
    grafana_annotations: list[dict]
    grafana_firing_alerts: list[dict]

    # Data source metadata
    sources_queried: list[str]  # which sources returned data
    time_window_start: str
    time_window_end: str


class QueryCostEstimate(TypedDict, total=False):
    """Estimated cost breakdown for queries executed during aggregation."""

    log_analytics_queries: int
    log_analytics_gb_scanned: float  # estimated GB scanned
    metrics_api_calls: int
    prometheus_queries: int
    grafana_api_calls: int
    estimated_cost_usd: float
    cost_notes: list[str]  # warnings or optimisation hints


class Evidence(TypedDict, total=False):
    """A single piece of raw evidence supporting an RCA claim."""

    source: str  # e.g. "Log Analytics", "Prometheus", "App Insights"
    signal_type: str  # e.g. "exception", "metric_spike", "failed_dependency"
    data: dict  # raw data point
    relevance: str  # why this evidence matters


class RootCauseAnalysis(TypedDict, total=False):
    """Structured output from the LLM root-cause analyzer."""

    summary: str
    likely_cause: str
    severity_assessment: str
    suggested_actions: list[str]
    confidence: float  # 0-1
    evidence: list[Evidence]  # raw data backing the analysis
    reasoning_chain: list[str]  # step-by-step reasoning
    alternative_hypotheses: list[str]  # other possible causes considered
    hallucination_disclaimer: str  # standard caveat


class EnrichmentContext(TypedDict, total=False):
    """Context added by the Knowledge Enricher."""

    similar_past_incidents: list[dict]
    recent_commits: list[dict]
    suspect_commits: list[dict]


class PipelineState(TypedDict, total=False):
    """Top-level state passed through the LangGraph pipeline."""

    alert_payload: AlertPayload
    correlation: CorrelationContext
    correlated_signals: CorrelatedSignals
    query_cost: QueryCostEstimate
    root_cause_analysis: RootCauseAnalysis
    enrichment_context: EnrichmentContext
    github_issue_url: str
    error: str  # set if a node fails
