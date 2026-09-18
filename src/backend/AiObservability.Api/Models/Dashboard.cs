using System.Text.Json.Serialization;

namespace AiObservability.Api.Models;

public record DashboardData(
    DashboardKpis Kpis,
    List<IncidentDataPoint> IncidentsOverTime,
    List<SeverityCount> SeverityDistribution
);

public record DashboardKpis(
    int ActiveIncidents,
    [property: JsonPropertyName("alerts_24h")] int Alerts24h,
    int MttrMinutes,
    int SourcesUp,
    int SourcesTotal
);

public record IncidentDataPoint(
    string Date,
    int Total,
    int Sev0,
    int Sev1,
    int Sev2,
    int Sev3,
    int Sev4
);

public record SeverityCount(string Severity, int Count);
