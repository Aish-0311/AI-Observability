namespace AiObservability.Api.Pipeline;

/// <summary>
/// Mutable state passed through the pipeline stages, mirroring the Python PipelineState TypedDict.
/// </summary>
public class PipelineState
{
    public AlertPayload AlertPayload { get; set; } = new();
    public CorrelationContext Correlation { get; set; } = new();
    public CorrelatedSignals CorrelatedSignals { get; set; } = new();
    public QueryCostEstimate QueryCost { get; set; } = new();
    public RootCauseResult RootCauseAnalysis { get; set; } = new();
    public EnrichmentResult EnrichmentContext { get; set; } = new();
    public string? GitHubIssueUrl { get; set; }
    public string? Error { get; set; }
}

public class AlertPayload
{
    public string AlertId { get; set; } = "";
    public string Severity { get; set; } = "Sev3";
    public string FiredAt { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string ResourceName { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string ConditionType { get; set; } = "";
    public string Description { get; set; } = "";
    public string AlertRuleName { get; set; } = "";
    public Dictionary<string, object?> Raw { get; set; } = [];
}

public class CorrelationContext
{
    public string CorrelationId { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public string Environment { get; set; } = "unknown";
}

public class CorrelatedSignals
{
    // Azure Monitor / Log Analytics
    public List<Dictionary<string, string?>> Exceptions { get; set; } = [];
    public List<Dictionary<string, string?>> FailedRequests { get; set; } = [];
    public List<Dictionary<string, string?>> DependencyFailures { get; set; } = [];
    public Dictionary<string, List<Dictionary<string, object?>>> MetricsSnapshot { get; set; } = [];

    // Application Insights
    public List<Dictionary<string, string?>> Traces { get; set; } = [];
    public List<Dictionary<string, string?>> EndToEndTransactions { get; set; } = [];
    public List<Dictionary<string, string?>> AvailabilityResults { get; set; } = [];
    public List<Dictionary<string, string?>> PerformanceCounters { get; set; } = [];

    // Prometheus
    public Dictionary<string, object?> PrometheusMetrics { get; set; } = [];

    // Grafana
    public List<Dictionary<string, object?>> GrafanaAnnotations { get; set; } = [];
    public List<Dictionary<string, object?>> GrafanaFiringAlerts { get; set; } = [];

    // Metadata
    public List<string> SourcesQueried { get; set; } = [];
    public string TimeWindowStart { get; set; } = "";
    public string TimeWindowEnd { get; set; } = "";
}

public class QueryCostEstimate
{
    public int LogAnalyticsQueries { get; set; }
    public double LogAnalyticsGbScanned { get; set; }
    public int MetricsApiCalls { get; set; }
    public int PrometheusQueries { get; set; }
    public int GrafanaApiCalls { get; set; }
    public double EstimatedCostUsd { get; set; }
    public List<string> CostNotes { get; set; } = [];
}

public class RootCauseResult
{
    public string Summary { get; set; } = "";
    public string LikelyCause { get; set; } = "";
    public string SeverityAssessment { get; set; } = "";
    public List<string> SuggestedActions { get; set; } = [];
    public double Confidence { get; set; }
    public List<EvidenceItem> Evidence { get; set; } = [];
    public List<string> ReasoningChain { get; set; } = [];
    public List<string> AlternativeHypotheses { get; set; } = [];
    public string HallucinationDisclaimer { get; set; } = "";
}

public class EvidenceItem
{
    public string Source { get; set; } = "";
    public string SignalType { get; set; } = "";
    public string Data { get; set; } = "";
    public string Relevance { get; set; } = "";
}

public class EnrichmentResult
{
    public List<Dictionary<string, object?>> SimilarPastIncidents { get; set; } = [];
    public List<Dictionary<string, object?>> RecentCommits { get; set; } = [];
    public List<Dictionary<string, object?>> SuspectCommits { get; set; } = [];
}
