namespace AiObservability.Api.Models;

public record Runbook(
    string Id,
    string Title,
    string Category,
    List<string> AlertRules,
    List<string> Services,
    string SeverityRange,
    int EstimatedResolutionMinutes,
    string Summary,
    List<RunbookStep> Steps,
    string Escalation,
    string LastUpdated
);

public record RunbookStep(int Order, string Action, string? Command = null, string? Note = null);
