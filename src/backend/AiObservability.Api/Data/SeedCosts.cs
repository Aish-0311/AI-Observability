namespace AiObservability.Api.Data;

using Models;

public static class SeedCosts
{
    private static string DaysAgo(int days) => DateTime.UtcNow.AddDays(-days).ToString("yyyy-MM-dd");
    private static string HoursAgo(double hours) => DateTime.UtcNow.AddHours(-hours).ToString("o");

    public static CostsData Get() => new(
        PeriodDays: 30,
        TotalUsd: 127.43,
        AvgPerIncidentUsd: 2.71,
        TotalGbScanned: 284.7,
        TotalApiCalls: 3842,
        Trend: [
            new(DaysAgo(14), 3.2, 1.8, 0.6, 0.5, 0.3),
            new(DaysAgo(12), 5.1, 2.9, 0.9, 0.8, 0.5),
            new(DaysAgo(10), 7.4, 4.1, 1.4, 1.2, 0.7),
            new(DaysAgo(8), 4.2, 2.4, 0.8, 0.6, 0.4),
            new(DaysAgo(6), 9.2, 5.2, 1.8, 1.4, 0.8),
            new(DaysAgo(4), 5.6, 3.1, 1.1, 0.9, 0.5),
            new(DaysAgo(2), 8.3, 4.7, 1.6, 1.3, 0.7),
            new(DaysAgo(0), 6.6, 3.7, 1.3, 1.0, 0.6),
        ],
        BySource: [
            new("Log Analytics", 72.4, 56.8, 1842),
            new("Grafana", 26.1, 20.5, 612),
            new("Prometheus", 19.8, 15.5, 290),
            new("Metrics API", 9.13, 7.2, 1098),
        ],
        TopIncidents: [
            new("INC-2026-001", "Checkout API 5xx spike", "Sev0", HoursAgo(0.8), 12, 3.8, 24, 8, 6, 8.42, ["High GB scan due to wide time window"]),
            new("INC-2026-003", "Kafka consumer lag spike", "Sev1", HoursAgo(5.4), 10, 2.9, 18, 14, 8, 7.18, []),
            new("INC-2026-002", "Auth-service latency p95 > 4s", "Sev1", HoursAgo(3), 8, 2.1, 16, 4, 3, 4.71, []),
        ]
    );
}
