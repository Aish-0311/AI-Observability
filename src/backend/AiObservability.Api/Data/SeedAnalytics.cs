namespace AiObservability.Api.Data;

using Models;

public static class SeedAnalytics
{
    private static string DaysAgo(int days) => DateTime.UtcNow.AddDays(-days).ToString("yyyy-MM-dd");

    public static AnalyticsData Get() => new(
        PeriodDays: 30,
        TotalIncidents: 47,
        ResolvedIncidents: 43,
        AvgMttrMinutes: 38,
        SlaCompliancePct: 84,
        MttrTrend: [
            new(DaysAgo(29), 52, 2), new(DaysAgo(27), 44, 3),
            new(DaysAgo(25), 68, 1), new(DaysAgo(23), 31, 4),
            new(DaysAgo(21), 28, 2), new(DaysAgo(19), 55, 3),
            new(DaysAgo(17), 42, 2), new(DaysAgo(15), 37, 5),
            new(DaysAgo(13), 29, 3), new(DaysAgo(11), 19, 4),
            new(DaysAgo(9),  33, 2), new(DaysAgo(7),  41, 4),
            new(DaysAgo(5),  26, 5), new(DaysAgo(3),  35, 3),
            new(DaysAgo(1),  22, 4),
        ],
        ByService: [
            new("checkout-api", 8, 1, 3, 4),
            new("payment-gateway", 7, 1, 2, 4),
            new("auth-service", 6, 0, 3, 3),
            new("order-processor", 5, 0, 2, 3),
            new("aks-prod-westeu", 4, 0, 1, 3),
            new("api-gateway", 4, 0, 1, 3),
            new("notification-service", 3, 0, 1, 2),
            new("redis-cache", 3, 0, 0, 3),
        ],
        SlaTable: [
            new("Sev0", 15, 22, 62),
            new("Sev1", 60, 48, 81),
            new("Sev2", 240, 195, 88),
            new("Sev3", 480, 310, 95),
            new("Sev4", 1440, 620, 98),
        ]
    );
}
