using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using AiObservability.Api.Models;

namespace AiObservability.Api.Services;

public sealed class AppInsightsTopologyService
{
    private readonly AzureConnectionFactory _factory;

    public AppInsightsTopologyService(AzureConnectionFactory factory) => _factory = factory;

    public async Task<AppMapData> GetApplicationMapAsync(AzureConnection conn, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(conn.WorkspaceId))
            return new AppMapData([], []);

        try
        {
            var client = _factory.CreateLogsClient(conn);
            var range = new QueryTimeRange(TimeSpan.FromHours(24));

            var nodeTask = client.QueryWorkspaceAsync(
                conn.WorkspaceId,
                "union requests, dependencies | summarize call_count=count() by cloud_RoleName | where isnotempty(cloud_RoleName)",
                range, cancellationToken: ct);

            var edgeTask = client.QueryWorkspaceAsync(
                conn.WorkspaceId,
                "dependencies | summarize calls=count(), failures=countif(success==\"False\"), avg_duration=avg(duration) by source=cloud_RoleName, target=name | where isnotempty(source) and isnotempty(target)",
                range, cancellationToken: ct);

            await Task.WhenAll(nodeTask, edgeTask);

            var nodes = ParseNodes(nodeTask.Result.Value);
            var edges = ParseEdges(edgeTask.Result.Value);
            return new AppMapData(nodes, edges);
        }
        catch
        {
            return new AppMapData([], []);
        }
    }

    private static List<AppMapNode> ParseNodes(LogsQueryResult result)
    {
        var nodes = new List<AppMapNode>();
        if (result?.Table == null) return nodes;
        foreach (var row in result.Table.Rows)
        {
            var name = row["cloud_RoleName"]?.ToString();
            if (string.IsNullOrWhiteSpace(name)) continue;
            long.TryParse(row["call_count"]?.ToString(), out var count);
            nodes.Add(new AppMapNode(name, count));
        }
        return nodes;
    }

    private static List<AppMapEdge> ParseEdges(LogsQueryResult result)
    {
        var edges = new List<AppMapEdge>();
        if (result?.Table == null) return edges;
        foreach (var row in result.Table.Rows)
        {
            var source = row["source"]?.ToString();
            var target = row["target"]?.ToString();
            if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(target)) continue;
            long.TryParse(row["calls"]?.ToString(), out var calls);
            long.TryParse(row["failures"]?.ToString(), out var failures);
            double.TryParse(row["avg_duration"]?.ToString(), out var avgDur);
            edges.Add(new AppMapEdge(source, target, calls, failures, avgDur));
        }
        return edges;
    }
}
