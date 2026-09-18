namespace AiObservability.Api.Models;

public record AlertPayload(
    string AlertId,
    AlertSeverity Severity,
    string FiredAt,
    string ResourceId,
    string ResourceName,
    string ResourceType,
    string ConditionType,
    string Description,
    string AlertRuleName,
    AlertSource? Source = null,
    AlertStatus? Status = null,
    string? IncidentId = null
);
