using System.Net.Http.Headers;
using System.Text.Json;
using AiObservability.Api.Configuration;
using Microsoft.Extensions.Options;

namespace AiObservability.Api.Services;

public interface IPrometheusService
{
    Task<Dictionary<string, object?>> QueryDefaultMetricsAsync(string firedAt, string serviceName = "", int windowMinutes = 10);
}

public class PrometheusService(IOptions<PipelineSettings> options, IHttpClientFactory httpClientFactory, ILogger<PrometheusService> logger) : IPrometheusService
{
    private readonly PipelineSettings _settings = options.Value;

    private static readonly (string Query, string Name)[] DefaultQueries =
    [
        ("rate(http_requests_total{status=~\"5..\"}[5m])", "http_5xx_rate"),
        ("process_cpu_seconds_total", "cpu_usage"),
        ("process_resident_memory_bytes", "memory_usage"),
        ("up", "service_health"),
    ];

    public async Task<Dictionary<string, object?>> QueryDefaultMetricsAsync(string firedAt, string serviceName = "", int windowMinutes = 10)
    {
        if (string.IsNullOrEmpty(_settings.PrometheusEndpoint))
        {
            logger.LogDebug("Prometheus endpoint not configured, skipping");
            return [];
        }

        var results = new Dictionary<string, object?>();
        foreach (var (query, name) in DefaultQueries)
        {
            var promql = query;
            if (!string.IsNullOrEmpty(serviceName))
            {
                promql = promql.Contains('{')
                    ? promql.Replace("{", $"{{job=~\".*{serviceName}.*\",", StringComparison.Ordinal)
                    : $"{promql}{{job=~\".*{serviceName}.*\"}}";
            }

            var data = await QueryRangeAsync(promql, firedAt, windowMinutes);
            if (data.Count > 0)
                results[name] = data;
        }

        return results;
    }

    private async Task<List<object>> QueryRangeAsync(string query, string firedAt, int windowMinutes)
    {
        var center = DateTimeOffset.Parse(firedAt);
        var start = center.AddMinutes(-windowMinutes);
        var end = center.AddMinutes(windowMinutes);

        try
        {
            var client = httpClientFactory.CreateClient("Prometheus");
            var url = $"{_settings.PrometheusEndpoint.TrimEnd('/')}/api/v1/query_range" +
                      $"?query={Uri.EscapeDataString(query)}" +
                      $"&start={start.ToUnixTimeSeconds()}" +
                      $"&end={end.ToUnixTimeSeconds()}" +
                      $"&step=30s";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            var results = new List<object>();

            if (json.TryGetProperty("data", out var data) && data.TryGetProperty("result", out var resultArray))
            {
                foreach (var series in resultArray.EnumerateArray())
                {
                    results.Add(new
                    {
                        metric = series.GetProperty("metric"),
                        values = series.GetProperty("values")
                    });
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Prometheus query failed: {Query}", query);
            return [];
        }
    }
}
