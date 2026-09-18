using System.Net.Http.Headers;
using System.Text.Json;
using AiObservability.Api.Configuration;
using Microsoft.Extensions.Options;

namespace AiObservability.Api.Services;

public interface IGrafanaService
{
    Task<List<Dictionary<string, object?>>> QueryAnnotationsAsync(string firedAt, int windowMinutes = 30);
    Task<List<Dictionary<string, object?>>> QueryDashboardAlertsAsync(string firedAt);
}

public class GrafanaService(IOptions<PipelineSettings> options, IHttpClientFactory httpClientFactory, ILogger<GrafanaService> logger) : IGrafanaService
{
    private readonly PipelineSettings _settings = options.Value;

    public async Task<List<Dictionary<string, object?>>> QueryAnnotationsAsync(string firedAt, int windowMinutes = 30)
    {
        if (string.IsNullOrEmpty(_settings.GrafanaEndpoint) || string.IsNullOrEmpty(_settings.GrafanaApiKey))
        {
            logger.LogDebug("Grafana endpoint/key not configured, skipping");
            return [];
        }

        var center = DateTimeOffset.Parse(firedAt);
        var startMs = (center.AddMinutes(-windowMinutes)).ToUnixTimeMilliseconds();
        var endMs = (center.AddMinutes(windowMinutes)).ToUnixTimeMilliseconds();

        try
        {
            var client = httpClientFactory.CreateClient("Grafana");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.GrafanaApiKey);

            var url = $"{_settings.GrafanaEndpoint.TrimEnd('/')}/api/annotations?from={startMs}&to={endMs}&limit=50";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var annotations = await response.Content.ReadFromJsonAsync<JsonElement>();
            var results = new List<Dictionary<string, object?>>();

            foreach (var a in annotations.EnumerateArray())
            {
                results.Add(new Dictionary<string, object?>
                {
                    ["id"] = a.TryGetProperty("id", out var id) ? id.GetInt64() : null,
                    ["text"] = a.TryGetProperty("text", out var text) ? text.GetString() : "",
                    ["tags"] = a.TryGetProperty("tags", out var tags)
                        ? tags.EnumerateArray().Select(t => (object?)t.GetString()).ToList()
                        : new List<object?>(),
                    ["time"] = a.TryGetProperty("time", out var time) ? time.GetInt64() : null,
                    ["dashboard_title"] = a.TryGetProperty("dashboardTitle", out var dt) ? dt.GetString() : "",
                    ["panel_title"] = a.TryGetProperty("panelTitle", out var pt) ? pt.GetString() : "",
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Grafana annotations query failed");
            return [];
        }
    }

    public async Task<List<Dictionary<string, object?>>> QueryDashboardAlertsAsync(string firedAt)
    {
        if (string.IsNullOrEmpty(_settings.GrafanaEndpoint) || string.IsNullOrEmpty(_settings.GrafanaApiKey))
            return [];

        try
        {
            var client = httpClientFactory.CreateClient("Grafana");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.GrafanaApiKey);

            var url = $"{_settings.GrafanaEndpoint.TrimEnd('/')}/api/v1/provisioning/alert-rules";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var rules = await response.Content.ReadFromJsonAsync<JsonElement>();
            var results = new List<Dictionary<string, object?>>();

            foreach (var r in rules.EnumerateArray())
            {
                var state = r.TryGetProperty("state", out var s) ? s.GetString() : "";
                if (state is "firing" or "pending" or "alerting")
                {
                    results.Add(new Dictionary<string, object?>
                    {
                        ["title"] = r.TryGetProperty("title", out var title) ? title.GetString() : "",
                        ["condition"] = r.TryGetProperty("condition", out var cond) ? cond.GetString() : "",
                        ["state"] = state,
                        ["folder_title"] = r.TryGetProperty("folderTitle", out var ft) ? ft.GetString() : "",
                    });
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Grafana alert rules query failed");
            return [];
        }
    }
}
