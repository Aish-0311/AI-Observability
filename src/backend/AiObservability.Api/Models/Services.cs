namespace AiObservability.Api.Models;

public record ServicesData(List<ServiceNode> Nodes, List<ServiceEdge> Edges);

public record ServiceNode(
    string Id,
    string Label,
    ServiceNodeType Type,
    NodeHealth Health,
    int IncidentCount,
    string Description,
    string TechStack,
    int Col,
    int Row
);

public record ServiceEdge(string From, string To, string? Label = null);
