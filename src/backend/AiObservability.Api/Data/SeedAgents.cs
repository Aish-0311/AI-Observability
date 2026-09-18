namespace AiObservability.Api.Data;

using Models;

public static class SeedAgents
{
    private static string Ago(int minutes) => DateTime.UtcNow.AddMinutes(-minutes).ToString("o");

    public static List<Agent> Get() =>
    [
        new(
            "signal_aggregator", "Signal Aggregator",
            "Pulls correlated signals from App Insights, Grafana, Prometheus, and Log Analytics within a 5-minute correlation window. Estimates query costs per source.",
            AgentStatus.healthy,
            new AgentMetrics(47, 0.94, 3800, Ago(47)),
            [new(AgentRunStatus.success, 4200), new(AgentRunStatus.success, 3800), new(AgentRunStatus.success, 3100), new(AgentRunStatus.error), new(AgentRunStatus.success, 4400)],
            [new("alert_payload", "AlertPayload", "Incoming webhook alert with resource_id, severity, fired_at")],
            [new("correlated_signals", "CorrelatedSignals", "Aggregated signals from all configured sources"), new("cost_estimates", "QueryCostEstimate[]", "Per-source cost breakdown for the query run")],
            [
                new("Azure App Insights", AgentDepType.azure, "REST API — /metrics, /events, /dependencies, /traces"),
                new("Grafana", AgentDepType.azure, "HTTP API — dashboard panels and datasource proxy"),
                new("Prometheus", AgentDepType.azure, "PromQL HTTP API — range queries and instant queries"),
                new("Azure Log Analytics", AgentDepType.azure, "KQL queries via Azure Monitor REST API"),
            ],
            [
                new("WINDOW_MINUTES", "5", AgentConfigSource.hardcoded),
                new("LOG_ANALYTICS_COST_PER_GB", "$2.76", AgentConfigSource.hardcoded),
                new("APP_INSIGHTS_APP_ID", "from env", AgentConfigSource.env),
                new("APP_INSIGHTS_API_KEY", "***", AgentConfigSource.env),
                new("GRAFANA_URL", "from env", AgentConfigSource.env),
                new("GRAFANA_API_KEY", "***", AgentConfigSource.env),
                new("PROMETHEUS_URL", "from env", AgentConfigSource.env),
                new("LOG_ANALYTICS_WORKSPACE_ID", "from env", AgentConfigSource.env),
            ],
            "Each source query is isolated in a try/except block. Failures are logged and the source is skipped; the pipeline continues with partial signals. If all sources fail, the stage returns an empty CorrelatedSignals with an error note."
        ),
        new(
            "rca", "Root Cause Analyzer",
            "Sends correlated signals to Azure OpenAI (GPT-4o) with a structured JSON schema prompt. Produces a full RCA with confidence score, evidence citations, reasoning chain, and alternative hypotheses.",
            AgentStatus.healthy,
            new AgentMetrics(44, 0.89, 7800, Ago(47)),
            [new(AgentRunStatus.success, 8700), new(AgentRunStatus.success, 7200), new(AgentRunStatus.error), new(AgentRunStatus.success, 7900), new(AgentRunStatus.success, 7200)],
            [new("correlated_signals", "CorrelatedSignals", "Signals from Signal Aggregator"), new("alert_payload", "AlertPayload", "Original alert for context")],
            [new("rca", "RootCauseAnalysis", "Structured RCA with confidence, evidence, and reasoning chain")],
            [new("Azure OpenAI", AgentDepType.llm, "GPT-4o — structured output mode with JSON schema")],
            [
                new("AZURE_OPENAI_ENDPOINT", "from env", AgentConfigSource.env),
                new("MODEL", "gpt-4o", AgentConfigSource.hardcoded),
                new("MAX_TOKENS", "4096", AgentConfigSource.hardcoded),
                new("TEMPERATURE", "0", AgentConfigSource.hardcoded),
                new("RESPONSE_FORMAT", "json_schema (strict)", AgentConfigSource.hardcoded),
            ],
            "On 429 rate limit, retries 3x with exponential backoff (2s, 4s, 8s). On persistent failure, sets rca.confidence=0 and rca.summary to error message. Downstream stages check confidence > 0 before proceeding."
        ),
        new(
            "knowledge_enricher", "Knowledge Enricher",
            "Searches historical incidents for similar patterns using vector similarity. Queries the GitHub API for commits touching affected files within the 24-hour window before the alert. Produces suspect commits with relevance scores.",
            AgentStatus.healthy,
            new AgentMetrics(39, 0.97, 1850, Ago(47)),
            [new(AgentRunStatus.success, 2100), new(AgentRunStatus.success, 1850), new(AgentRunStatus.skipped), new(AgentRunStatus.success, 1800), new(AgentRunStatus.success, 1400)],
            [new("rca", "RootCauseAnalysis", "RCA output used to search similar past incidents"), new("alert_payload", "AlertPayload", "resource_name used to query GitHub commits")],
            [new("enrichment", "EnrichmentContext", "Similar past incidents and suspect commits with relevance scores")],
            [new("GitHub API", AgentDepType.github, "REST API — commits, repos, search/commits endpoint"), new("Past Incidents Store", AgentDepType.@internal, "data/past_incidents.json — local knowledge base")],
            [
                new("GITHUB_TOKEN", "***", AgentConfigSource.env),
                new("GITHUB_REPO", "from env", AgentConfigSource.env),
                new("COMMIT_LOOKBACK_HOURS", "24", AgentConfigSource.hardcoded),
                new("SUSPECT_WINDOW_SECONDS", "3600", AgentConfigSource.hardcoded),
                new("SIMILARITY_THRESHOLD", "0.6", AgentConfigSource.hardcoded),
            ],
            "GitHub API failures are gracefully handled — enrichment returns empty suspect_commits rather than failing the pipeline. Past incident search is local and does not fail. Skipped automatically if RCA confidence is 0."
        ),
        new(
            "github_issue_creator", "GitHub Issue Creator",
            "Creates a labeled GitHub issue with the full incident report formatted as Markdown. Applies severity-appropriate labels (critical/high/medium/low/informational), adds incident and ai-generated labels, and links back to the alert source.",
            AgentStatus.healthy,
            new AgentMetrics(31, 0.97, 2800, Ago(47)),
            [new(AgentRunStatus.success, 3420), new(AgentRunStatus.success, 2000), new(AgentRunStatus.skipped), new(AgentRunStatus.success, 2200), new(AgentRunStatus.skipped)],
            [new("rca", "RootCauseAnalysis", "Full RCA for issue body"), new("enrichment", "EnrichmentContext", "Similar incidents and suspect commits for issue body"), new("alert_payload", "AlertPayload", "Alert metadata for issue title and labels")],
            [new("github_issue_url", "string | null", "URL of the created GitHub issue, or null if skipped")],
            [new("GitHub API", AgentDepType.github, "REST API — POST /repos/{owner}/{repo}/issues")],
            [
                new("GITHUB_TOKEN", "***", AgentConfigSource.env),
                new("GITHUB_REPO", "from env", AgentConfigSource.env),
                new("AUTO_ISSUE_MIN_SEVERITY", "Sev2", AgentConfigSource.hardcoded),
                new("LABEL_MAP", "Sev0→critical, Sev1→high, Sev2→medium, Sev3→low, Sev4→informational", AgentConfigSource.hardcoded),
                new("ALWAYS_LABELS", "incident, ai-generated", AgentConfigSource.hardcoded),
            ],
            "If labels do not exist in the repo, they are created automatically before issue creation. If issue creation fails, the error is logged but does not fail the pipeline — github_issue_url is set to null. Issues below Sev2 are skipped unless triggered manually."
        ),
    ];
}
