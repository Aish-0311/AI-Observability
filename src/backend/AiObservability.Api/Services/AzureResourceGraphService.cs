using System.Text.Json;
using Azure.ResourceManager;
using Azure.ResourceManager.ResourceGraph;
using Azure.ResourceManager.ResourceGraph.Models;
using AiObservability.Api.Models;

namespace AiObservability.Api.Services;

public sealed record AzureResourceNode(
    string Id,
    string Name,
    string Type,
    string? Kind,
    string? Location,
    Dictionary<string, string>? Tags,
    JsonElement? Properties,
    AzureResourceCategory Category
);

public sealed class AzureResourceGraphService
{
    private readonly AzureConnectionFactory _factory;

    public AzureResourceGraphService(AzureConnectionFactory factory) => _factory = factory;

    public async Task<IReadOnlyList<AzureResourceNode>> ListResourceGroupAsync(
        AzureConnection conn, CancellationToken ct = default)
    {
        var arm = _factory.CreateArmClient(conn);
        var tenant = arm.GetTenants().First();

        var kql = $"""
            Resources
            | where subscriptionId =~ '{conn.SubscriptionId}' and resourceGroup =~ '{conn.ResourceGroup}'
            | project id, name, type, kind, location, tags, properties
            | limit 200
            """;

        var content = new ResourceQueryContent(kql);
        content.Subscriptions.Add(conn.SubscriptionId);

        var response = await tenant.GetResourcesAsync(content, ct);
        return ParseNodes(response.Value);
    }

    public async Task<IReadOnlyList<(string SourceId, string TargetId, string Label)>> GetInfraConnectionsAsync(
        AzureConnection conn, IReadOnlyList<AzureResourceNode> knownNodes, CancellationToken ct = default)
    {
        var arm = _factory.CreateArmClient(conn);
        var tenant = arm.GetTenants().First();

        // Private endpoints are the most reliable ARM-level service connections
        var kql = $"""
            Resources
            | where subscriptionId =~ '{conn.SubscriptionId}' and resourceGroup =~ '{conn.ResourceGroup}'
            | where type =~ 'microsoft.network/privateendpoints'
            | project
                sourceId = id,
                targetId = tostring(properties.privateLinkServiceConnections[0].properties.privateLinkServiceId)
            | where isnotempty(targetId)
            """;

        var content = new ResourceQueryContent(kql);
        content.Subscriptions.Add(conn.SubscriptionId);

        try
        {
            var response = await tenant.GetResourcesAsync(content, ct);
            return ParseConnections(response.Value, knownNodes);
        }
        catch
        {
            return [];
        }
    }

    private static IReadOnlyList<(string, string, string)> ParseConnections(
        ResourceQueryResult result, IReadOnlyList<AzureResourceNode> knownNodes)
    {
        if (result?.Data == null) return [];
        using var doc = JsonDocument.Parse(result.Data.ToString());
        if (doc.RootElement.ValueKind != JsonValueKind.Array) return [];

        var idSet = new HashSet<string>(
            knownNodes.Select(n => n.Id), StringComparer.OrdinalIgnoreCase);

        var connections = new List<(string, string, string)>();
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            var srcId = item.TryGetProperty("sourceId", out var s) ? s.GetString() ?? "" : "";
            var tgtId = item.TryGetProperty("targetId", out var t) ? t.GetString() ?? "" : "";

            if (string.IsNullOrEmpty(srcId) || string.IsNullOrEmpty(tgtId)) continue;

            // Show the edge if either endpoint is in our resource group
            if (idSet.Contains(srcId) || idSet.Contains(tgtId))
                connections.Add((srcId, tgtId, "Private Endpoint"));
        }
        return connections;
    }

    private static IReadOnlyList<AzureResourceNode> ParseNodes(ResourceQueryResult result)
    {
        if (result?.Data == null) return [];

        using var doc = JsonDocument.Parse(result.Data.ToString());
        var root = doc.RootElement;

        // The SDK returns objectArray format by default: a top-level JSON array of objects.
        if (root.ValueKind != JsonValueKind.Array) return [];

        var nodes = new List<AzureResourceNode>();
        foreach (var item in root.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;

            string Str(string key) =>
                item.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
                    ? v.GetString() ?? "" : "";

            JsonElement? El(string key) =>
                item.TryGetProperty(key, out var v) && v.ValueKind != JsonValueKind.Null
                    ? v.Clone() : null;  // Clone so the element survives JsonDocument disposal

            var type = Str("type");

            var tagsEl = El("tags");
            Dictionary<string, string>? tags = null;
            if (tagsEl.HasValue && tagsEl.Value.ValueKind == JsonValueKind.Object)
                tags = tagsEl.Value.EnumerateObject()
                    .ToDictionary(p => p.Name, p => p.Value.GetString() ?? "");

            nodes.Add(new AzureResourceNode(
                Str("id"), Str("name"), type,
                Str("kind") is "" ? null : Str("kind"),
                Str("location") is "" ? null : Str("location"),
                tags, El("properties"), ClassifyType(type)));
        }

        return nodes;
    }

    private static AzureResourceCategory ClassifyType(string type) => type.ToLowerInvariant() switch
    {
        var t when t.Contains("microsoft.compute") => AzureResourceCategory.compute,
        var t when t.Contains("microsoft.web") => AzureResourceCategory.web,
        var t when t.Contains("microsoft.app") => AzureResourceCategory.web,
        var t when t.Contains("microsoft.containerservice") => AzureResourceCategory.compute,
        var t when t.Contains("microsoft.sql") => AzureResourceCategory.data,
        var t when t.Contains("microsoft.documentdb") => AzureResourceCategory.data,
        var t when t.Contains("microsoft.dbforpostgresql") => AzureResourceCategory.data,
        var t when t.Contains("microsoft.dbformysql") => AzureResourceCategory.data,
        var t when t.Contains("microsoft.storage") => AzureResourceCategory.storage,
        var t when t.Contains("microsoft.servicebus") => AzureResourceCategory.messaging,
        var t when t.Contains("microsoft.eventhub") => AzureResourceCategory.messaging,
        var t when t.Contains("microsoft.network") => AzureResourceCategory.network,
        var t when t.Contains("microsoft.cdn") => AzureResourceCategory.network,
        var t when t.Contains("microsoft.insights") => AzureResourceCategory.monitoring,
        var t when t.Contains("microsoft.operationalinsights") => AzureResourceCategory.monitoring,
        var t when t.Contains("microsoft.cognitiveservices") => AzureResourceCategory.ai,
        var t when t.Contains("microsoft.machinelearningservices") => AzureResourceCategory.ai,
        var t when t.Contains("microsoft.search") => AzureResourceCategory.ai,
        _ => AzureResourceCategory.other
    };
}
