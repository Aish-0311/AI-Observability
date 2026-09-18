namespace AiObservability.Api.Data;

using Models;

public static class SeedSources
{
    private static string Ago(int minutes) => DateTime.UtcNow.AddMinutes(-minutes).ToString("o");

    public static List<SourceIntegration> Get() =>
    [
        new("app-insights", "Azure Application Insights", SourceKind.AppInsights, SourceHealth.healthy, Ago(2), 1842, 0.003, new() { ["workspace"] = "aiops-prod-ai", ["subscription_id"] = "***-redacted-***", ["region"] = "westeurope" }),
        new("grafana", "Grafana Cloud", SourceKind.Grafana, SourceHealth.healthy, Ago(5), 612, 0.011, new() { ["instance_url"] = "https://aiops.grafana.net", ["org_id"] = 12345 }),
        new("prometheus", "Prometheus (AKS)", SourceKind.Prometheus, SourceHealth.degraded, Ago(18), 290, 0.087, new() { ["endpoint"] = "http://prometheus.monitoring.svc:9090", ["scrape_interval"] = "30s" }),
        new("github", "GitHub Issues", SourceKind.GitHub, SourceHealth.healthy, Ago(60), 14, 0.0, new() { ["org"] = "contoso", ["repo"] = "aiops-platform", ["issue_label"] = "aiops-auto" }),
    ];
}
