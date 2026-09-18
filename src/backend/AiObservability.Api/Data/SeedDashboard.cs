namespace AiObservability.Api.Data;

using Models;

public static class SeedDashboard
{
    private static string DaysAgo(int days) => DateTime.UtcNow.AddDays(-days).ToString("yyyy-MM-dd");

    public static DashboardData Get() => new(
        Kpis: new DashboardKpis(
            ActiveIncidents: 4,
            Alerts24h: 27,
            MttrMinutes: 38,
            SourcesUp: 3,
            SourcesTotal: 4
        ),
        IncidentsOverTime: [
            new(DaysAgo(13), 1, 0, 1, 0, 0, 0),
            new(DaysAgo(12), 3, 0, 1, 1, 1, 0),
            new(DaysAgo(11), 2, 0, 0, 2, 0, 0),
            new(DaysAgo(10), 0, 0, 0, 0, 0, 0),
            new(DaysAgo(9),  4, 1, 1, 1, 1, 0),
            new(DaysAgo(8),  2, 0, 1, 0, 1, 0),
            new(DaysAgo(7),  1, 0, 0, 1, 0, 0),
            new(DaysAgo(6),  3, 0, 2, 1, 0, 0),
            new(DaysAgo(5),  5, 1, 2, 1, 1, 0),
            new(DaysAgo(4),  2, 0, 0, 1, 0, 1),
            new(DaysAgo(3),  3, 0, 1, 1, 1, 0),
            new(DaysAgo(2),  4, 0, 1, 2, 1, 0),
            new(DaysAgo(1),  2, 0, 1, 0, 1, 0),
            new(DaysAgo(0),  4, 1, 1, 1, 1, 0),
        ],
        SeverityDistribution: [
            new("Sev0", 1),
            new("Sev1", 2),
            new("Sev2", 4),
            new("Sev3", 2),
            new("Sev4", 1),
        ]
    );
}
