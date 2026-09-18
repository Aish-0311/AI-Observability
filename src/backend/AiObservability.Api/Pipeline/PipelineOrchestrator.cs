using System.Text.Json;
using AiObservability.Api.Configuration;
using AiObservability.Api.Services;
using Microsoft.Extensions.Options;

namespace AiObservability.Api.Pipeline;

/// <summary>
/// Orchestrates the 4-stage analysis pipeline matching the Python LangGraph version:
/// 1. Signal Aggregator — queries Azure Monitor, App Insights, Prometheus, Grafana
/// 2. Root Cause Analyzer — calls Azure OpenAI for structured RCA
/// 3. Knowledge Enricher — adds past incidents + recent commits context
/// 4. GitHub Issue Creator — creates a formatted GitHub issue
/// </summary>
public interface IPipelineOrchestrator
{
    Task<PipelineState> RunAsync(JsonElement alertPayload);
}

public class PipelineOrchestrator(
    IAzureMonitorService azureMonitor,
    IPrometheusService prometheus,
    IGrafanaService grafana,
    IAzureOpenAiService openAi,
    IGitHubService gitHub,
    IOptions<PipelineSettings> options,
    ILogger<PipelineOrchestrator> logger) : IPipelineOrchestrator
{
    private readonly PipelineSettings _settings = options.Value;
    private const int WindowMinutes = 5;
    private const double LogAnalyticsCostPerGb = 2.76;
    private const double EstimatedGbPerKql = 0.005;

    public async Task<PipelineState> RunAsync(JsonElement alertPayload)
    {
        var state = new PipelineState
        {
            AlertPayload = new AlertPayload
            {
                Raw = JsonSerializer.Deserialize<Dictionary<string, object?>>(alertPayload.GetRawText()) ?? []
            }
        };

        // Stage 1: Signal Aggregator
        state = await SafeExecuteAsync("Signal Aggregator", state, SignalAggregatorAsync);

        // Stage 2: Root Cause Analyzer
        state = await SafeExecuteAsync("Root Cause Analyzer", state, RootCauseAnalyzerAsync);

        // Conditional: skip enricher if RCA failed
        if (string.IsNullOrEmpty(state.Error))
        {
            // Stage 3: Knowledge Enricher
            state = await SafeExecuteAsync("Knowledge Enricher", state, KnowledgeEnricherAsync);
        }
        else
        {
            // Handle error — create minimal RCA context
            state = HandleError(state);
        }

        // Stage 4: GitHub Issue Creator
        state = await SafeExecuteAsync("GitHub Issue Creator", state, GitHubIssueCreatorAsync);

        return state;
    }

    private async Task<PipelineState> SafeExecuteAsync(
        string stageName, PipelineState state, Func<PipelineState, Task<PipelineState>> stage)
    {
        try
        {
            return await stage(state);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{StageName} failed", stageName);
            var prevError = state.Error ?? "";
            state.Error = string.IsNullOrEmpty(prevError)
                ? $"{stageName}: {ex.Message}"
                : $"{prevError} | {stageName}: {ex.Message}";
            return state;
        }
    }

    private PipelineState HandleError(PipelineState state)
    {
        logger.LogError("Pipeline error: {Error}", state.Error);
        if (string.IsNullOrEmpty(state.RootCauseAnalysis.Summary))
        {
            state.RootCauseAnalysis = new RootCauseResult
            {
                Summary = "Automated analysis failed. Manual investigation required.",
                LikelyCause = "Unknown — analysis pipeline encountered an error.",
                SeverityAssessment = "Unknown",
                SuggestedActions =
                [
                    "Review the raw alert payload in the GitHub issue.",
                    "Check Log Analytics manually for the alert time window."
                ],
                Confidence = 0.0,
                Evidence = [],
                ReasoningChain = ["Pipeline error prevented analysis."],
                AlternativeHypotheses = [],
                HallucinationDisclaimer = "This is a fallback response — no LLM analysis was performed. All findings must be verified manually."
            };
        }
        return state;
    }

    // =========================================================================
    // Stage 1: Signal Aggregator
    // =========================================================================
    private async Task<PipelineState> SignalAggregatorAsync(PipelineState state)
    {
        var raw = state.AlertPayload.Raw;
        var parsed = ParseAlert(raw);
        state.AlertPayload = parsed;

        var correlation = ExtractCorrelation(parsed, raw);
        state.Correlation = correlation;

        logger.LogInformation(
            "Signal Aggregator: alert={AlertRule} severity={Severity} resource={Resource} env={Env}",
            parsed.AlertRuleName, parsed.Severity, parsed.ResourceName, correlation.Environment);

        var kqlCount = 0;
        var metricsApiCalls = 0;
        var promQueries = 0;
        var grafanaCalls = 0;
        var costNotes = new List<string>();
        var sourcesQueried = new List<string>();

        // --- Azure Monitor / Log Analytics ---
        var exceptions = await azureMonitor.QueryExceptionsAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var failedReqs = await azureMonitor.QueryFailedRequestsAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var depFailures = await azureMonitor.QueryDependencyFailuresAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var metrics = await azureMonitor.QueryMetricsAsync(parsed.ResourceId, parsed.FiredAt, WindowMinutes * 2);
        metricsApiCalls += 3;
        sourcesQueried.Add("azure_monitor");
        sourcesQueried.Add("log_analytics");

        // --- Application Insights ---
        var traces = await azureMonitor.QueryTracesAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var e2eTransactions = await azureMonitor.QueryEndToEndTransactionsAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var availability = await azureMonitor.QueryAvailabilityAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        var perfCounters = await azureMonitor.QueryPerformanceCountersAsync(parsed.FiredAt, WindowMinutes);
        kqlCount++;
        sourcesQueried.Add("application_insights");

        // --- Prometheus ---
        Dictionary<string, object?> promMetrics = [];
        try
        {
            promMetrics = await prometheus.QueryDefaultMetricsAsync(parsed.FiredAt, parsed.ResourceName, WindowMinutes * 2);
            promQueries += 4;
            if (promMetrics.Count > 0)
                sourcesQueried.Add("prometheus");
        }
        catch (Exception)
        {
            logger.LogWarning("Prometheus query skipped (not configured or unreachable)");
        }

        // --- Grafana ---
        List<Dictionary<string, object?>> annotations = [];
        List<Dictionary<string, object?>> firingAlerts = [];
        try
        {
            annotations = await grafana.QueryAnnotationsAsync(parsed.FiredAt, 30);
            grafanaCalls++;
            firingAlerts = await grafana.QueryDashboardAlertsAsync(parsed.FiredAt);
            grafanaCalls++;
            if (annotations.Count > 0 || firingAlerts.Count > 0)
                sourcesQueried.Add("grafana");
        }
        catch (Exception)
        {
            logger.LogWarning("Grafana query skipped (not configured or unreachable)");
        }

        // --- Cost estimation ---
        var estimatedGb = kqlCount * EstimatedGbPerKql;
        var estimatedCost = estimatedGb * LogAnalyticsCostPerGb;

        if (kqlCount > 5)
        {
            costNotes.Add($"Ran {kqlCount} KQL queries (~{estimatedGb:F3} GB scanned). Consider using summary tables or materialized views to reduce scan volume.");
        }
        if (estimatedCost > 0.05)
        {
            costNotes.Add($"Estimated Log Analytics cost for this incident: ${estimatedCost:F3}. High-frequency alerts may compound this.");
        }

        var center = DateTimeOffset.Parse(parsed.FiredAt);
        var start = center.AddMinutes(-WindowMinutes);
        var end = center.AddMinutes(WindowMinutes);

        state.CorrelatedSignals = new CorrelatedSignals
        {
            Exceptions = exceptions,
            FailedRequests = failedReqs,
            DependencyFailures = depFailures,
            MetricsSnapshot = metrics,
            Traces = traces,
            EndToEndTransactions = e2eTransactions,
            AvailabilityResults = availability,
            PerformanceCounters = perfCounters,
            PrometheusMetrics = promMetrics,
            GrafanaAnnotations = annotations,
            GrafanaFiringAlerts = firingAlerts,
            SourcesQueried = sourcesQueried,
            TimeWindowStart = start.ToString("o"),
            TimeWindowEnd = end.ToString("o"),
        };

        state.QueryCost = new QueryCostEstimate
        {
            LogAnalyticsQueries = kqlCount,
            LogAnalyticsGbScanned = estimatedGb,
            MetricsApiCalls = metricsApiCalls,
            PrometheusQueries = promQueries,
            GrafanaApiCalls = grafanaCalls,
            EstimatedCostUsd = estimatedCost,
            CostNotes = costNotes,
        };

        return state;
    }

    // =========================================================================
    // Stage 2: Root Cause Analyzer
    // =========================================================================
    private async Task<PipelineState> RootCauseAnalyzerAsync(PipelineState state)
    {
        logger.LogInformation(
            "Root Cause Analyzer: processing alert={AlertRule} with {ExCount} exceptions, {FailedCount} failed requests, sources={Sources}",
            state.AlertPayload.AlertRuleName,
            state.CorrelatedSignals.Exceptions.Count,
            state.CorrelatedSignals.FailedRequests.Count,
            string.Join(", ", state.CorrelatedSignals.SourcesQueried));

        var rca = await openAi.AnalyzeRootCauseAsync(
            state.AlertPayload,
            state.CorrelatedSignals,
            state.Correlation);

        logger.LogInformation(
            "RCA result: cause={Cause} confidence={Confidence:F2} evidence_count={EvidenceCount}",
            rca.LikelyCause.Length > 80 ? rca.LikelyCause[..80] : rca.LikelyCause,
            rca.Confidence,
            rca.Evidence.Count);

        state.RootCauseAnalysis = rca;
        return state;
    }

    // =========================================================================
    // Stage 3: Knowledge Enricher
    // =========================================================================
    private async Task<PipelineState> KnowledgeEnricherAsync(PipelineState state)
    {
        var rca = state.RootCauseAnalysis;
        var alert = state.AlertPayload;

        // Past incidents
        var allIncidents = LoadPastIncidents();
        var similar = FindSimilar(allIncidents, rca.Summary);
        logger.LogInformation("Knowledge Enricher: found {Count} similar past incidents", similar.Count);

        // Recent commits
        var commits = await gitHub.GetRecentCommitsAsync(alert.ResourceName, 24);
        logger.LogInformation("Knowledge Enricher: found {Count} recent commits", commits.Count);

        // Identify suspect commits (within 1 hour of alert)
        var suspect = new List<Dictionary<string, object?>>();
        if (commits.Count > 0 && !string.IsNullOrEmpty(alert.FiredAt))
        {
            var fired = DateTimeOffset.Parse(alert.FiredAt);
            foreach (var c in commits)
            {
                if (c.TryGetValue("date", out var dateObj) && dateObj is string dateStr)
                {
                    var commitDt = DateTimeOffset.Parse(dateStr);
                    var delta = Math.Abs((fired - commitDt).TotalSeconds);
                    if (delta < 3600)
                        suspect.Add(c);
                }
            }
        }

        state.EnrichmentContext = new EnrichmentResult
        {
            SimilarPastIncidents = similar,
            RecentCommits = commits,
            SuspectCommits = suspect,
        };

        return state;
    }

    // =========================================================================
    // Stage 4: GitHub Issue Creator
    // =========================================================================
    private async Task<PipelineState> GitHubIssueCreatorAsync(PipelineState state)
    {
        var alert = state.AlertPayload;
        var rca = state.RootCauseAnalysis;

        var causeSnippet = rca.LikelyCause.Length > 80 ? rca.LikelyCause[..80] : rca.LikelyCause;
        var title = $"[{alert.Severity}] {alert.AlertRuleName}: {causeSnippet}";
        var body = BuildIssueBody(state);
        var labels = new List<string> { "incident", SeverityLabel(alert.Severity), "ai-generated" };

        var url = await gitHub.CreateIssueAsync(title, body, labels);
        logger.LogInformation("GitHub issue created: {Url}", url);

        state.GitHubIssueUrl = url;
        return state;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private static AlertPayload ParseAlert(Dictionary<string, object?> raw)
    {
        var rawJson = JsonSerializer.Serialize(raw);
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var essentials = root.TryGetProperty("data", out var data) && data.TryGetProperty("essentials", out var ess)
            ? ess
            : default;

        var resourceIds = essentials.ValueKind != JsonValueKind.Undefined &&
                          essentials.TryGetProperty("alertTargetIDs", out var ids)
            ? ids.EnumerateArray().Select(x => x.GetString() ?? "").ToList()
            : [];

        var resourceId = resourceIds.Count > 0 ? resourceIds[0] : "";
        var firedAt = essentials.ValueKind != JsonValueKind.Undefined &&
                      essentials.TryGetProperty("firedDateTime", out var fd)
            ? fd.GetString() ?? DateTimeOffset.UtcNow.ToString("o")
            : DateTimeOffset.UtcNow.ToString("o");

        return new AlertPayload
        {
            AlertId = GetString(essentials, "alertId"),
            Severity = GetString(essentials, "severity", "Sev3"),
            FiredAt = firedAt,
            ResourceId = resourceId,
            ResourceName = resourceId.Contains('/') ? resourceId.Split('/').Last() : resourceId,
            ResourceType = GetString(essentials, "targetResourceType"),
            ConditionType = GetString(essentials, "monitorCondition"),
            Description = GetString(essentials, "description"),
            AlertRuleName = GetString(essentials, "alertRule"),
            Raw = raw,
        };
    }

    private static CorrelationContext ExtractCorrelation(AlertPayload parsed, Dictionary<string, object?> _)
    {
        var serviceName = parsed.ResourceName;

        // Try to detect environment from resource ID
        var env = "";
        var nameLower = parsed.ResourceId.ToLowerInvariant();
        foreach (var candidate in new[] { "production", "prod", "staging", "dev" })
        {
            if (nameLower.Contains(candidate))
            {
                env = candidate;
                break;
            }
        }

        return new CorrelationContext
        {
            CorrelationId = parsed.AlertId,
            ServiceName = serviceName,
            Environment = string.IsNullOrEmpty(env) ? "unknown" : env,
        };
    }

    private List<Dictionary<string, object?>> LoadPastIncidents()
    {
        var path = _settings.PastIncidentsPath;
        if (!File.Exists(path))
        {
            logger.LogInformation("No past incidents file at {Path}", path);
            return [];
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(json) ?? [];
    }

    private static List<Dictionary<string, object?>> FindSimilar(List<Dictionary<string, object?>> incidents, string summary)
    {
        if (string.IsNullOrEmpty(summary)) return [];

        var keywords = summary.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 4)
            .Select(w => w.ToLowerInvariant())
            .ToHashSet();

        var scored = new List<(int Score, Dictionary<string, object?> Incident)>();
        foreach (var inc in incidents)
        {
            var text = $"{inc.GetValueOrDefault("summary")} {inc.GetValueOrDefault("cause")}".ToLowerInvariant();
            var overlap = keywords.Count(kw => text.Contains(kw));
            if (overlap > 0)
                scored.Add((overlap, inc));
        }

        return scored.OrderByDescending(x => x.Score).Take(5).Select(x => x.Incident).ToList();
    }

    private static string SeverityLabel(string severity) => severity switch
    {
        "Sev0" => "critical",
        "Sev1" => "high",
        "Sev2" => "medium",
        "Sev3" => "low",
        "Sev4" => "informational",
        _ => "incident"
    };

    private static string BuildIssueBody(PipelineState state)
    {
        var alert = state.AlertPayload;
        var signals = state.CorrelatedSignals;
        var rca = state.RootCauseAnalysis;
        var enrichment = state.EnrichmentContext;
        var correlation = state.Correlation;
        var cost = state.QueryCost;
        var sections = new List<string>();

        // Header
        sections.Add($"## \U0001f6a8 Incident Report — {alert.AlertRuleName}");
        sections.Add("");

        // Hallucination disclaimer
        if (rca.Confidence < 0.5)
        {
            sections.Add($"> \u26a0\ufe0f **Low confidence analysis ({rca.Confidence:P0})** — This RCA may be speculative. Verify findings manually.");
            sections.Add("");
        }
        if (!string.IsNullOrEmpty(rca.HallucinationDisclaimer))
        {
            sections.Add($"> \U0001f916 **AI Disclaimer:** {rca.HallucinationDisclaimer}");
            sections.Add("");
        }

        // Summary
        sections.Add("### Summary");
        sections.Add(string.IsNullOrEmpty(rca.Summary) ? "_No RCA summary available._" : rca.Summary);
        sections.Add("");

        // Correlation context
        if (!string.IsNullOrEmpty(correlation.CorrelationId))
        {
            sections.Add("### Correlation Context");
            sections.Add("| Field | Value |");
            sections.Add("|-------|-------|");
            sections.Add($"| **Correlation ID** | `{correlation.CorrelationId}` |");
            sections.Add($"| **Service** | {correlation.ServiceName} |");
            sections.Add($"| **Environment** | {correlation.Environment} |");
            sections.Add("");
        }

        // Alert details
        sections.Add("### Alert Details");
        sections.Add("| Field | Value |");
        sections.Add("|-------|-------|");
        sections.Add($"| **Severity** | {alert.Severity} |");
        sections.Add($"| **Fired At** | {alert.FiredAt} |");
        sections.Add($"| **Resource** | `{alert.ResourceName}` |");
        sections.Add($"| **Resource Type** | {alert.ResourceType} |");
        sections.Add($"| **Description** | {alert.Description} |");
        sections.Add("");

        // RCA
        sections.Add("### Root Cause Analysis");
        sections.Add($"**Likely Cause:** {rca.LikelyCause}");
        sections.Add($"**Severity Assessment:** {rca.SeverityAssessment}");
        sections.Add($"**Confidence:** {rca.Confidence:P0}");
        sections.Add("");

        // Evidence
        if (rca.Evidence.Count > 0)
        {
            sections.Add("### \U0001f4cb Supporting Evidence");
            for (var i = 0; i < rca.Evidence.Count; i++)
            {
                var ev = rca.Evidence[i];
                sections.Add($"**{i + 1}. [{ev.Source}] {ev.SignalType}**");
                sections.Add($"  - Relevance: {ev.Relevance}");
                if (!string.IsNullOrEmpty(ev.Data))
                {
                    sections.Add("  ```json");
                    sections.Add($"  {(ev.Data.Length > 500 ? ev.Data[..500] : ev.Data)}");
                    sections.Add("  ```");
                }
            }
            sections.Add("");
        }

        // Reasoning chain
        if (rca.ReasoningChain.Count > 0)
        {
            sections.Add("### \U0001f517 Reasoning Chain");
            for (var i = 0; i < rca.ReasoningChain.Count; i++)
                sections.Add($"{i + 1}. {rca.ReasoningChain[i]}");
            sections.Add("");
        }

        // Alternative hypotheses
        if (rca.AlternativeHypotheses.Count > 0)
        {
            sections.Add("### \U0001f504 Alternative Hypotheses");
            foreach (var alt in rca.AlternativeHypotheses)
                sections.Add($"- {alt}");
            sections.Add("");
        }

        // Data sources
        if (signals.SourcesQueried.Count > 0)
        {
            sections.Add($"### \U0001f4e1 Data Sources Queried: {string.Join(", ", signals.SourcesQueried)}");
            sections.Add("");
        }

        // Correlated signals
        sections.Add("### Correlated Signals");
        sections.Add($"_Time window: {signals.TimeWindowStart} \u2192 {signals.TimeWindowEnd}_");
        sections.Add("");

        // Exceptions
        if (signals.Exceptions.Count > 0)
        {
            sections.Add($"#### Exceptions ({signals.Exceptions.Count})");
            sections.Add("```");
            foreach (var ex in signals.Exceptions.Take(5))
                sections.Add($"[{ex.GetValueOrDefault("TimeGenerated")}] {ex.GetValueOrDefault("ExceptionType")}: {ex.GetValueOrDefault("OuterMessage") ?? ex.GetValueOrDefault("InnermostMessage")}");
            if (signals.Exceptions.Count > 5)
                sections.Add($"... and {signals.Exceptions.Count - 5} more");
            sections.Add("```");
            sections.Add("");
        }

        // Failed requests
        if (signals.FailedRequests.Count > 0)
        {
            sections.Add($"#### Failed Requests ({signals.FailedRequests.Count})");
            sections.Add("```");
            foreach (var req in signals.FailedRequests.Take(5))
                sections.Add($"[{req.GetValueOrDefault("TimeGenerated")}] {req.GetValueOrDefault("Name")} \u2192 {req.GetValueOrDefault("ResultCode")} ({req.GetValueOrDefault("DurationMs")}ms)");
            if (signals.FailedRequests.Count > 5)
                sections.Add($"... and {signals.FailedRequests.Count - 5} more");
            sections.Add("```");
            sections.Add("");
        }

        // Traces
        if (signals.Traces.Count > 0)
        {
            sections.Add($"#### App Insights Traces ({signals.Traces.Count})");
            sections.Add("```");
            foreach (var t in signals.Traces.Take(5))
            {
                var msg = t.GetValueOrDefault("Message") ?? "";
                sections.Add($"[{t.GetValueOrDefault("TimeGenerated")}] Sev{t.GetValueOrDefault("SeverityLevel")}: {(msg.Length > 120 ? msg[..120] : msg)}");
            }
            if (signals.Traces.Count > 5)
                sections.Add($"... and {signals.Traces.Count - 5} more");
            sections.Add("```");
            sections.Add("");
        }

        // Availability
        if (signals.AvailabilityResults.Count > 0)
        {
            sections.Add($"#### Availability Tests ({signals.AvailabilityResults.Count})");
            foreach (var a in signals.AvailabilityResults.Take(5))
            {
                var status = a.GetValueOrDefault("Success") == "True" ? "\u2705" : "\u274c";
                sections.Add($"- {status} {a.GetValueOrDefault("Name")} from {a.GetValueOrDefault("Location")} \u2014 {a.GetValueOrDefault("DurationMs")}ms");
            }
            sections.Add("");
        }

        // Metrics
        if (signals.MetricsSnapshot.Count > 0)
        {
            sections.Add("#### Azure Monitor Metrics");
            foreach (var (name, points) in signals.MetricsSnapshot)
            {
                if (points.Count > 0)
                {
                    var avg = points.Average(p => Convert.ToDouble(p.GetValueOrDefault("average") ?? 0));
                    var peak = points.Max(p => Convert.ToDouble(p.GetValueOrDefault("maximum") ?? 0));
                    sections.Add($"- **{name}**: avg={avg:F2}, peak={peak:F2}");
                }
            }
            sections.Add("");
        }

        // Enrichment — past incidents
        if (enrichment.SimilarPastIncidents.Count > 0)
        {
            sections.Add("### Similar Past Incidents");
            foreach (var inc in enrichment.SimilarPastIncidents.Take(3))
                sections.Add($"- **{inc.GetValueOrDefault("title") ?? inc.GetValueOrDefault("summary")}** ({inc.GetValueOrDefault("date")}): {inc.GetValueOrDefault("cause")}");
            sections.Add("");
        }

        // Enrichment — suspect commits
        if (enrichment.SuspectCommits.Count > 0)
        {
            sections.Add("### \U0001f50d Suspect Commits (within 1h of alert)");
            foreach (var c in enrichment.SuspectCommits)
                sections.Add($"- [`{c.GetValueOrDefault("sha")}`]({c.GetValueOrDefault("url")}) {c.GetValueOrDefault("message")} \u2014 {c.GetValueOrDefault("author")}");
            sections.Add("");
        }

        // Suggested actions
        if (rca.SuggestedActions.Count > 0)
        {
            sections.Add("### Suggested Actions");
            for (var i = 0; i < rca.SuggestedActions.Count; i++)
                sections.Add($"{i + 1}. {rca.SuggestedActions[i]}");
            sections.Add("");
        }

        // Cost estimate
        if (cost.LogAnalyticsQueries > 0)
        {
            sections.Add("### \U0001f4b0 Query Cost Estimate");
            sections.Add($"- Log Analytics queries: {cost.LogAnalyticsQueries}");
            sections.Add($"- Estimated data scanned: {cost.LogAnalyticsGbScanned:F3} GB");
            sections.Add($"- Metrics API calls: {cost.MetricsApiCalls}");
            sections.Add($"- Prometheus queries: {cost.PrometheusQueries}");
            sections.Add($"- Grafana API calls: {cost.GrafanaApiCalls}");
            sections.Add($"- **Estimated cost: ${cost.EstimatedCostUsd:F4}**");
            foreach (var note in cost.CostNotes)
                sections.Add($"  - \u26a0\ufe0f {note}");
            sections.Add("");
        }

        sections.Add("---");
        sections.Add("_Generated by AI Observability Platform \u00b7 Evidence-based RCA with hallucination safeguards_");

        return string.Join("\n", sections);
    }

    private static string GetString(JsonElement el, string property, string defaultValue = "")
    {
        if (el.ValueKind == JsonValueKind.Undefined) return defaultValue;
        return el.TryGetProperty(property, out var val) ? val.GetString() ?? defaultValue : defaultValue;
    }
}
