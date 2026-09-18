using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using AiObservability.Api.Configuration;
using Microsoft.Extensions.Options;

namespace AiObservability.Api.Services;

public interface IAzureMonitorService
{
    Task<List<Dictionary<string, string?>>> QueryExceptionsAsync(string firedAt, int windowMinutes = 5);
    Task<List<Dictionary<string, string?>>> QueryFailedRequestsAsync(string firedAt, int windowMinutes = 5);
    Task<List<Dictionary<string, string?>>> QueryDependencyFailuresAsync(string firedAt, int windowMinutes = 5);
    Task<Dictionary<string, List<Dictionary<string, object?>>>> QueryMetricsAsync(string resourceId, string firedAt, int windowMinutes = 10);
    Task<List<Dictionary<string, string?>>> QueryTracesAsync(string firedAt, int windowMinutes = 5);
    Task<List<Dictionary<string, string?>>> QueryEndToEndTransactionsAsync(string firedAt, int windowMinutes = 5);
    Task<List<Dictionary<string, string?>>> QueryAvailabilityAsync(string firedAt, int windowMinutes = 5);
    Task<List<Dictionary<string, string?>>> QueryPerformanceCountersAsync(string firedAt, int windowMinutes = 5);
}

public class AzureMonitorService(IOptions<PipelineSettings> options, ILogger<AzureMonitorService> logger) : IAzureMonitorService
{
    private readonly PipelineSettings _settings = options.Value;
    private readonly DefaultAzureCredential _credential = new();

    private const string ExceptionsKql = """
        AppExceptions
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | project TimeGenerated, ProblemId, ExceptionType, OuterMessage,
                  InnermostMessage, StackTrace = substring(Details, 0, 500),
                  AppRoleName, OperationId
        | order by TimeGenerated desc
        | take 25
        """;

    private const string FailedRequestsKql = """
        AppRequests
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | where Success == false
        | project TimeGenerated, Name, ResultCode, DurationMs,
                  AppRoleName, OperationId
        | order by TimeGenerated desc
        | take 25
        """;

    private const string DependencyFailuresKql = """
        AppDependencies
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | where Success == false
        | project TimeGenerated, Name, DependencyType = Type, ResultCode,
                  DurationMs, Target, AppRoleName, OperationId
        | order by TimeGenerated desc
        | take 25
        """;

    private const string TracesKql = """
        AppTraces
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | where SeverityLevel >= 2
        | project TimeGenerated, Message, SeverityLevel, OperationId,
                  AppRoleName, OperationName
        | order by TimeGenerated desc
        | take 25
        """;

    private const string EndToEndKql = """
        let ops = AppRequests
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | where Success == false
        | distinct OperationId;
        union AppRequests, AppDependencies, AppExceptions, AppTraces
        | where OperationId in (ops)
        | project TimeGenerated, ItemType = itemType, Name, OperationId,
                  AppRoleName, DurationMs, Success, SeverityLevel
        | order by OperationId, TimeGenerated asc
        | take 100
        """;

    private const string AvailabilityKql = """
        AppAvailabilityResults
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | project TimeGenerated, Name, Success, DurationMs, Location,
                  Message, OperationId
        | order by TimeGenerated desc
        | take 25
        """;

    private const string PerfCountersKql = """
        AppPerformanceCounters
        | where TimeGenerated between (datetime('{0}') .. datetime('{1}'))
        | where Name in ("\\Processor(_Total)\\% Processor Time",
                         "\\Memory\\Available MBytes",
                         "\\ASP.NET Applications(__Total__)\\Requests/Sec")
        | project TimeGenerated, Name, Value, AppRoleName
        | order by TimeGenerated desc
        | take 50
        """;

    public async Task<List<Dictionary<string, string?>>> QueryExceptionsAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(ExceptionsKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<List<Dictionary<string, string?>>> QueryFailedRequestsAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(FailedRequestsKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<List<Dictionary<string, string?>>> QueryDependencyFailuresAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(DependencyFailuresKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<Dictionary<string, List<Dictionary<string, object?>>>> QueryMetricsAsync(
        string resourceId, string firedAt, int windowMinutes = 10)
    {
        if (string.IsNullOrEmpty(resourceId))
            return [];

        var metricNames = new[] { "Percentage CPU", "Available Memory Bytes", "Http5xx" };
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var client = new MetricsQueryClient(_credential);
        var result = new Dictionary<string, List<Dictionary<string, object?>>>();

        foreach (var name in metricNames)
        {
            try
            {
                var response = await client.QueryResourceAsync(
                    resourceId,
                    [name],
                    new MetricsQueryOptions { TimeRange = new QueryTimeRange(start, end) });

                foreach (var metric in response.Value.Metrics)
                {
                    var points = new List<Dictionary<string, object?>>();
                    foreach (var ts in metric.TimeSeries)
                    {
                        foreach (var dp in ts.Values)
                        {
                            points.Add(new Dictionary<string, object?>
                            {
                                ["timestamp"] = dp.TimeStamp.ToString("o"),
                                ["average"] = dp.Average,
                                ["maximum"] = dp.Maximum,
                                ["total"] = dp.Total
                            });
                        }
                    }
                    result[metric.Name] = points;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Metric query failed for {MetricName} on {ResourceId}", name, resourceId);
            }
        }

        return result;
    }

    public async Task<List<Dictionary<string, string?>>> QueryTracesAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(TracesKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<List<Dictionary<string, string?>>> QueryEndToEndTransactionsAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(EndToEndKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<List<Dictionary<string, string?>>> QueryAvailabilityAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(AvailabilityKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    public async Task<List<Dictionary<string, string?>>> QueryPerformanceCountersAsync(string firedAt, int windowMinutes = 5)
    {
        var (start, end) = GetTimeWindow(firedAt, windowMinutes);
        var kql = string.Format(PerfCountersKql, FormatTs(start), FormatTs(end));
        return await RunKqlAsync(kql);
    }

    private async Task<List<Dictionary<string, string?>>> RunKqlAsync(string kql)
    {
        var client = new LogsQueryClient(_credential);
        var workspace = _settings.AzureLogAnalyticsWorkspaceId;
        logger.LogDebug("Running KQL against workspace {Workspace}: {Kql}", workspace, kql);

        var response = await client.QueryWorkspaceAsync(workspace, kql, QueryTimeRange.All);

        if (response.Value.Status == LogsQueryResultStatus.Success)
        {
            return TableToRows(response.Value.Table);
        }

        logger.LogError("KQL query returned partial/failure: {Error}", response.Value.Error?.Message);
        return response.Value.Table is not null ? TableToRows(response.Value.Table) : [];
    }

    private static List<Dictionary<string, string?>> TableToRows(LogsTable table)
    {
        var rows = new List<Dictionary<string, string?>>();
        var columns = table.Columns.Select(c => c.Name).ToList();

        foreach (var row in table.Rows)
        {
            var dict = new Dictionary<string, string?>();
            for (var i = 0; i < columns.Count; i++)
            {
                dict[columns[i]] = row[i]?.ToString();
            }
            rows.Add(dict);
        }
        return rows;
    }

    private static (DateTimeOffset start, DateTimeOffset end) GetTimeWindow(string firedAt, int windowMinutes)
    {
        var center = DateTimeOffset.Parse(firedAt);
        return (center.AddMinutes(-windowMinutes), center.AddMinutes(windowMinutes));
    }

    private static string FormatTs(DateTimeOffset dt) => dt.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
}
