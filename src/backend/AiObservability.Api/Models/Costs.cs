namespace AiObservability.Api.Models;

public record CostsData(
    int PeriodDays,
    double TotalUsd,
    double AvgPerIncidentUsd,
    double TotalGbScanned,
    int TotalApiCalls,
    List<CostDataPoint> Trend,
    List<CostBySource> BySource,
    List<IncidentCost> TopIncidents
);

public record CostDataPoint(
    string Date,
    double TotalUsd,
    double LogAnalyticsUsd,
    double GrafanaUsd,
    double PrometheusUsd,
    double MetricsApiUsd
);

public record CostBySource(string Source, double Usd, double Pct, int Queries);

public record IncidentCost(
    string IncidentId,
    string Title,
    string Severity,
    string FiredAt,
    int LogAnalyticsQueries,
    double LogAnalyticsGbScanned,
    int MetricsApiCalls,
    int PrometheusQueries,
    int GrafanaApiCalls,
    double EstimatedCostUsd,
    List<string> CostNotes
);
