namespace AiObservability.Api.Models;

public record AnalyticsData(
    int PeriodDays,
    int TotalIncidents,
    int ResolvedIncidents,
    int AvgMttrMinutes,
    int SlaCompliancePct,
    List<MttrDataPoint> MttrTrend,
    List<ServiceIncidentCount> ByService,
    List<SlaEntry> SlaTable
);

public record MttrDataPoint(string Date, int MttrMinutes, int Incidents);

public record ServiceIncidentCount(string Service, int Count, int Sev0, int Sev1, int Sev2plus);

public record SlaEntry(string Severity, int TargetMinutes, int ActualAvgMinutes, int CompliancePct);
