namespace AiObservability.Api.Models;

public record PipelineRun(
    string RunId,
    string TriggeredAt,
    TriggerType TriggeredBy,
    int DurationMs,
    PipelineRunStatus Status,
    string ResourceName,
    string Severity,
    List<PipelineStage> Stages,
    string? IncidentId = null,
    string? GithubIssueUrl = null
);

public record PipelineStage(
    string Id,
    string Name,
    string Description,
    StageStatus Status,
    int? DurationMs = null,
    string? OutputSummary = null,
    string? Error = null
);
