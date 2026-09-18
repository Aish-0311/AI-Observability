using System.Text.Json.Serialization;

namespace AiObservability.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AzureResourceCategory
{
    compute, web, data, ai, messaging, network, storage, monitoring, other
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ResourceLayer { infra, app }

public record ServiceMapData(
    List<ServiceMapNode> Nodes,
    List<ServiceMapEdge> Edges,
    string GeneratedAt,
    string? ResourceGroup,
    string? SubscriptionId,
    bool Configured
);

public record ServiceMapNode(
    string Id,
    string Label,
    string Type,
    AzureResourceCategory Category,
    string? Region,
    ResourceLayer Layer,
    NodeHealth Health,
    int Col,
    int Row,
    string? RawId,
    bool HasTelemetry,
    Dictionary<string, object?>? PropertiesSummary
);

public record ServiceMapEdge(
    string From,
    string To,
    string? Label = null,
    long? Calls = null,
    long? Failures = null,
    double? AvgDurationMs = null,
    string EdgeKind = "telemetry"   // "telemetry" | "network"
);

public record ServiceDetailResponse(
    string Id,
    string Name,
    string Type,
    string? Region,
    string? ResourceGroup,
    Dictionary<string, string>? Tags,
    Dictionary<string, object?>? Properties,
    TelemetrySnapshot? Telemetry
);

public record TelemetrySnapshot(
    long RequestCount,
    double AvgDurationMs,
    double FailureRate
);

// Internal models for App Insights topology
public record AppMapData(
    List<AppMapNode> Nodes,
    List<AppMapEdge> Edges
);

public record AppMapNode(string RoleName, long CallCount);

public record AppMapEdge(
    string Source,
    string Target,
    long Calls,
    long Failures,
    double AvgDurationMs
);
