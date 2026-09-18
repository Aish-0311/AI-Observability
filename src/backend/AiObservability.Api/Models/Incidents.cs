namespace AiObservability.Api.Models;

public record Incident(
    string Id,
    string AlertId,
    AlertSeverity Severity,
    string FiredAt,
    string ResourceId,
    string ResourceName,
    string ResourceType,
    string ConditionType,
    string Description,
    string AlertRuleName,
    AlertSource Source,
    AlertStatus Status,
    string IncidentId,
    RootCauseAnalysis Rca,
    EnrichmentContext Enrichment,
    string? GithubIssueUrl = null
);

public record RootCauseAnalysis(
    string Summary,
    string LikelyCause,
    string SeverityAssessment,
    double Confidence,
    List<SuggestedAction> SuggestedActions,
    List<Evidence> Evidence,
    List<ReasoningStep> ReasoningChain,
    List<AlternativeHypothesis> AlternativeHypotheses,
    string? HallucinationDisclaimer = null
);

public record SuggestedAction(int Order, string Action, string Priority);

public record Evidence(string Id, string Source, string SignalType, double Relevance, string Data, string Description);

public record ReasoningStep(int Step, string Observation);

public record AlternativeHypothesis(string Hypothesis, double Confidence, string Reasoning);

public record EnrichmentContext(
    List<SimilarPastIncident> SimilarPastIncidents,
    List<SuspectCommit> SuspectCommits
);

public record SimilarPastIncident(
    string IncidentId,
    string Title,
    double SimilarityScore,
    string Resolution,
    string ResolvedAt
);

public record SuspectCommit(
    string Sha,
    string Author,
    string Message,
    string CommittedAt,
    double RelevanceScore,
    List<string> FilesChanged
);
