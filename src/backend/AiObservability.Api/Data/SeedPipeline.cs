namespace AiObservability.Api.Data;

using Models;

public static class SeedPipeline
{
    private static string Ago(int minutes) => DateTime.UtcNow.AddMinutes(-minutes).ToString("o");

    public static List<PipelineRun> Get() =>
    [
        new("run-0001", Ago(47), TriggerType.webhook, 18420, PipelineRunStatus.success, "checkout-api", "Sev0",
            [
                new("signal_aggregator", "Signal Aggregator", "", StageStatus.success, 4200, "Queried 4 sources. 47 signals collected. 3.8 GB Log Analytics."),
                new("rca", "Root Cause Analyzer", "", StageStatus.success, 8700, "RCA produced. Confidence: 91%. Likely cause: payment-gateway v3.2.0 connection timeout misconfiguration."),
                new("knowledge_enricher", "Knowledge Enricher", "", StageStatus.success, 2100, "1 similar past incident found. 2 suspect commits identified."),
                new("github_issue_creator", "GitHub Issue Creator", "", StageStatus.success, 3420, "Issue #142 created with labels: incident, critical, ai-generated."),
            ], "INC-2026-001", "https://github.com/contoso/aiops-platform/issues/142"),
        new("run-0002", Ago(180), TriggerType.webhook, 14850, PipelineRunStatus.success, "auth-service", "Sev1",
            [
                new("signal_aggregator", "Signal Aggregator", "", StageStatus.success, 3800, "Queried 3 sources. 31 signals collected."),
                new("rca", "Root Cause Analyzer", "", StageStatus.success, 7200, "Confidence: 87%. Likely cause: unindexed analytics query holding dbo.Users lock."),
                new("knowledge_enricher", "Knowledge Enricher", "", StageStatus.success, 1850, "1 similar past incident. 1 suspect commit."),
                new("github_issue_creator", "GitHub Issue Creator", "", StageStatus.success, 2000, "Issue #141 created."),
            ], "INC-2026-002", "https://github.com/contoso/aiops-platform/issues/141"),
        new("run-0003", Ago(320), TriggerType.webhook, 9200, PipelineRunStatus.error, "orders-processed-consumer", "Sev1",
            [
                new("signal_aggregator", "Signal Aggregator", "", StageStatus.success, 3100, "Queried 3 sources. 22 signals collected."),
                new("rca", "Root Cause Analyzer", "", StageStatus.error, 6100, Error: "OpenAI API rate limit exceeded (429). Retried 3× — exhausted."),
                new("knowledge_enricher", "Knowledge Enricher", "", StageStatus.skipped, OutputSummary: "Skipped — RCA stage failed."),
                new("github_issue_creator", "GitHub Issue Creator", "", StageStatus.skipped, OutputSummary: "Skipped — RCA stage failed."),
            ]),
        new("run-0004", Ago(360), TriggerType.manual, 16300, PipelineRunStatus.success, "payment-gateway", "Sev2",
            [
                new("signal_aggregator", "Signal Aggregator", "", StageStatus.success, 4400, "Queried 4 sources. 38 signals. 1.8 GB scanned."),
                new("rca", "Root Cause Analyzer", "", StageStatus.success, 7900, "Confidence: 84%. Memory leak via undisposed HttpClient."),
                new("knowledge_enricher", "Knowledge Enricher", "", StageStatus.success, 1800, "1 similar past incident. 1 suspect commit."),
                new("github_issue_creator", "GitHub Issue Creator", "", StageStatus.success, 2200, "Issue #138 created."),
            ], "INC-2026-004", "https://github.com/contoso/aiops-platform/issues/138"),
        new("run-0005", Ago(722), TriggerType.webhook, 13700, PipelineRunStatus.success, "aks-prod-westeu", "Sev2",
            [
                new("signal_aggregator", "Signal Aggregator", "", StageStatus.success, 3700, "Queried 3 sources. 29 signals."),
                new("rca", "Root Cause Analyzer", "", StageStatus.success, 7200, "Confidence: 79%. Batch ML job without CPU limits consumed 14.2 vCPUs."),
                new("knowledge_enricher", "Knowledge Enricher", "", StageStatus.success, 1400, "No similar past incidents."),
                new("github_issue_creator", "GitHub Issue Creator", "", StageStatus.skipped, OutputSummary: "Skipped — severity below auto-issue threshold."),
            ], "INC-2026-005"),
    ];
}
