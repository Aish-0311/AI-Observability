using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Models;
using AiObservability.Api.Services;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/services")]
[Authorize]
public class ServiceMapController(
    IUserDataStore store,
    AzureResourceGraphService argService,
    AppInsightsTopologyService aiTopology,
    AzureConnectionFactory factory) : ControllerBase
{
    private string UserKey => User.FindFirstValue(ClaimTypes.Email) ?? "default";

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await store.LoadAsync(UserKey, ct);
        if (settings.Azure == null)
            return Ok(new ServiceMapData([], [], DateTime.UtcNow.ToString("o"), null, null, false));

        var conn = settings.Azure;

        var infraTask = argService.ListResourceGroupAsync(conn, ct);
        var appTask = aiTopology.GetApplicationMapAsync(conn, ct);
        await Task.WhenAll(infraTask, appTask);

        var infraNodes = infraTask.Result;
        var appMap = appTask.Result;
        var infraConnections = await argService.GetInfraConnectionsAsync(conn, infraNodes, ct);

        var (nodes, edges) = MergeAndLayout(infraNodes, appMap, infraConnections);

        return Ok(new ServiceMapData(
            nodes, edges,
            DateTime.UtcNow.ToString("o"),
            conn.ResourceGroup,
            conn.SubscriptionId,
            true));
    }

    [HttpGet("{*id}")]
    public async Task<IActionResult> GetDetail(string id, CancellationToken ct)
    {
        var settings = await store.LoadAsync(UserKey, ct);
        if (settings.Azure == null) return NotFound();

        var rawId = Uri.UnescapeDataString(id);
        var conn = settings.Azure;

        // Fetch infra nodes to find the matching resource
        var infraNodes = await argService.ListResourceGroupAsync(conn, ct);
        var node = infraNodes.FirstOrDefault(n =>
            string.Equals(n.Id, rawId, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(n.Name, rawId, StringComparison.OrdinalIgnoreCase));

        if (node == null) return NotFound();

        TelemetrySnapshot? telemetry = null;
        if (!string.IsNullOrWhiteSpace(conn.WorkspaceId))
            telemetry = await GetTelemetrySnapshotAsync(conn, node.Name, ct);

        var props = node.Properties.HasValue
            ? JsonSerializer.Deserialize<Dictionary<string, object?>>(node.Properties.Value.GetRawText())
            : null;

        return Ok(new ServiceDetailResponse(
            node.Id, node.Name, node.Type, node.Location, conn.ResourceGroup,
            node.Tags, props, telemetry));
    }

    private async Task<TelemetrySnapshot?> GetTelemetrySnapshotAsync(
        AzureConnection conn, string roleName, CancellationToken ct)
    {
        try
        {
            var client = factory.CreateLogsClient(conn);
            var kql = $"""
                requests
                | where cloud_RoleName =~ '{roleName.Replace("'", "''")}'
                | summarize count=count(), avg_dur=avg(duration), failed=countif(success=="False")
                """;
            var result = await client.QueryWorkspaceAsync(
                conn.WorkspaceId!,
                kql,
                Azure.Monitor.Query.QueryTimeRange.All,
                cancellationToken: ct);

            var table = result.Value.Table;
            if (table?.Rows.Count == 0) return null;
            var row = table!.Rows[0];
            long.TryParse(row["count"]?.ToString(), out var count);
            double.TryParse(row["avg_dur"]?.ToString(), out var avgDur);
            long.TryParse(row["failed"]?.ToString(), out var failed);
            var failRate = count > 0 ? (double)failed / count : 0;
            return new TelemetrySnapshot(count, avgDur, failRate);
        }
        catch
        {
            return null;
        }
    }

    private static (List<ServiceMapNode> nodes, List<ServiceMapEdge> edges) MergeAndLayout(
        IReadOnlyList<AzureResourceNode> infraNodes,
        AppMapData appMap,
        IReadOnlyList<(string SourceId, string TargetId, string Label)> infraConnections)
    {
        // Merge: match App Map roles to infra nodes by name
        var nameIndex = infraNodes.ToDictionary(
            n => n.Name.ToLowerInvariant(), n => n);

        var appRoleToInfraId = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var telemetryByInfraId = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);

        foreach (var appNode in appMap.Nodes)
        {
            if (nameIndex.TryGetValue(appNode.RoleName.ToLowerInvariant(), out var infra))
            {
                appRoleToInfraId[appNode.RoleName] = infra.Id;
                telemetryByInfraId[infra.Id] = appNode.CallCount;
            }
        }

        // Build infra nodes with telemetry flag
        var groupedByCategory = infraNodes
            .GroupBy(n => n.Category)
            .OrderBy(g => g.Key.ToString())
            .ToList();

        var col = 0;
        var nodeMap = new Dictionary<string, ServiceMapNode>(StringComparer.OrdinalIgnoreCase);

        foreach (var group in groupedByCategory)
        {
            var row = 0;
            foreach (var n in group)
            {
                var hasTelemetry = telemetryByInfraId.ContainsKey(n.Id);
                var propsSummary = n.Properties.HasValue
                    ? SummarizeProperties(n.Properties.Value)
                    : null;

                var smNode = new ServiceMapNode(
                    n.Id, n.Name, n.Type, n.Category, n.Location,
                    ResourceLayer.infra,
                    hasTelemetry ? NodeHealth.healthy : NodeHealth.unknown,
                    col, row, n.Id, hasTelemetry, propsSummary);

                nodeMap[n.Id] = smNode;
                row++;
            }
            col++;
        }

        // Add unmatched App Map ghost nodes in a final column
        var ghostNodes = appMap.Nodes
            .Where(a => !appRoleToInfraId.ContainsKey(a.RoleName))
            .ToList();

        var ghostRow = 0;
        foreach (var ghost in ghostNodes)
        {
            var ghostId = $"app:{ghost.RoleName}";
            var smNode = new ServiceMapNode(
                ghostId, ghost.RoleName, "app-component",
                AzureResourceCategory.web, null,
                ResourceLayer.app, NodeHealth.healthy,
                col, ghostRow, null, true, null);
            nodeMap[ghostId] = smNode;
            ghostRow++;
        }

        // Build edges from App Map
        var edges = new List<ServiceMapEdge>();
        foreach (var e in appMap.Edges)
        {
            var fromId = appRoleToInfraId.TryGetValue(e.Source, out var fId) ? fId : $"app:{e.Source}";
            var toId = appRoleToInfraId.TryGetValue(e.Target, out var tId) ? tId
                : nameIndex.TryGetValue(e.Target.ToLowerInvariant(), out var tInfra) ? tInfra.Id
                : $"app:{e.Target}";

            if (!nodeMap.ContainsKey(fromId))
            {
                var ghostFromNode = new ServiceMapNode(
                    fromId, e.Source, "app-component", AzureResourceCategory.web, null,
                    ResourceLayer.app, NodeHealth.healthy, col, ghostRow++, null, true, null);
                nodeMap[fromId] = ghostFromNode;
            }
            if (!nodeMap.ContainsKey(toId))
            {
                var ghostToNode = new ServiceMapNode(
                    toId, e.Target, "app-component", AzureResourceCategory.web, null,
                    ResourceLayer.app, NodeHealth.healthy, col, ghostRow++, null, true, null);
                nodeMap[toId] = ghostToNode;
            }

            var label = e.Calls > 0 ? $"{e.Calls}/24h" : null;
            edges.Add(new ServiceMapEdge(fromId, toId, label, e.Calls, e.Failures, e.AvgDurationMs));
        }

        // Add infrastructure (network-level) connections from private endpoints
        foreach (var (srcId, tgtId, label) in infraConnections)
        {
            // Skip if this edge already exists from telemetry (avoid duplicates)
            if (edges.Any(e =>
                (e.From.Equals(srcId, StringComparison.OrdinalIgnoreCase) && e.To.Equals(tgtId, StringComparison.OrdinalIgnoreCase)) ||
                (e.From.Equals(tgtId, StringComparison.OrdinalIgnoreCase) && e.To.Equals(srcId, StringComparison.OrdinalIgnoreCase))))
                continue;

            if (nodeMap.ContainsKey(srcId) && nodeMap.ContainsKey(tgtId))
                edges.Add(new ServiceMapEdge(srcId, tgtId, label, EdgeKind: "network"));
        }

        return ([.. nodeMap.Values], edges);
    }

    private static Dictionary<string, object?> SummarizeProperties(System.Text.Json.JsonElement props)
    {
        // Return top-level string/number/bool properties only (skip nested objects/arrays)
        var result = new Dictionary<string, object?>();
        foreach (var p in props.EnumerateObject())
        {
            result[p.Name] = p.Value.ValueKind switch
            {
                JsonValueKind.String => p.Value.GetString(),
                JsonValueKind.Number => p.Value.GetRawText(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => null
            };
        }
        return result.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value);
    }
}
