using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Models;
using AiObservability.Api.Services;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/sources")]
[Authorize]
public class SourcesController(IUserDataStore store, AzureConnectionFactory factory) : ControllerBase
{
    private static string Ago(int minutes) => DateTime.UtcNow.AddMinutes(-minutes).ToString("o");
    private string UserKey => User.FindFirstValue(ClaimTypes.Email) ?? "default";

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await store.LoadAsync(UserKey, ct);
        var sources = new List<SourceIntegration>
        {
            BuildAppInsightsSource(settings),
            new("grafana",    "Grafana Cloud",      SourceKind.Grafana,     SourceHealth.unknown, Ago(5),  0, 0.0,  new(), Enabled: false, ComingSoon: true),
            new("prometheus", "Prometheus (AKS)",   SourceKind.Prometheus,  SourceHealth.unknown, Ago(18), 0, 0.0,  new(), Enabled: false, ComingSoon: true),
            new("github",     "GitHub Issues",      SourceKind.GitHub,      SourceHealth.unknown, Ago(60), 0, 0.0,  new(), Enabled: false, ComingSoon: true),
        };
        return Ok(sources);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var settings = await store.LoadAsync(UserKey, ct);
        if (settings.Azure == null) return Ok(new { refreshed = false, reason = "not_configured" });

        var ping = await factory.PingAsync(settings.Azure, ct);
        var updated = settings with
        {
            LastValidatedAt = ping.Ok ? DateTime.UtcNow : settings.LastValidatedAt,
            LastValidationError = ping.Ok ? null : ping.Error,
        };
        await store.SaveAsync(UserKey, updated, ct);
        return Ok(new { refreshed = true, ok = ping.Ok, latency_ms = ping.LatencyMs, error = ping.Error });
    }

    private static SourceIntegration BuildAppInsightsSource(UserSettings settings)
    {
        var conn = settings.Azure;
        var health = conn == null ? SourceHealth.unknown
            : settings.LastValidationError != null ? SourceHealth.degraded
            : settings.LastValidatedAt != null ? SourceHealth.healthy
            : SourceHealth.unknown;

        var lastQuery = settings.LastValidatedAt?.ToString("o") ?? Ago(0);

        var config = new Dictionary<string, object>();
        if (conn != null)
        {
            config["subscription_id"] = conn.SubscriptionId;
            config["resource_group"] = conn.ResourceGroup;
            if (conn.Region != null) config["region"] = conn.Region;
            if (conn.WorkspaceId != null) config["workspace_id"] = conn.WorkspaceId;
            if (conn.AppInsightsResourceName != null) config["app_insights_resource_name"] = conn.AppInsightsResourceName;
            config["tenant_id"] = conn.TenantId;
            config["client_id"] = conn.ClientId;
            if (settings.LastValidatedAt != null) config["last_validated_at"] = settings.LastValidatedAt.Value.ToString("o");
        }

        return new SourceIntegration(
            "app-insights", "Azure Application Insights", SourceKind.AppInsights,
            health, lastQuery, 0, 0.0, config,
            Enabled: true, ComingSoon: false);
    }
}
