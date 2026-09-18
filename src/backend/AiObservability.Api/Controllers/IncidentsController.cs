using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;
using AiObservability.Api.Models;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/incidents")]
[Authorize]
public class IncidentsController(IAlertStorage alertStorage) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] AlertSeverity? severity,
        [FromQuery] AlertSource? source,
        [FromQuery] string? q,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        // Validate pagination parameters
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 100) pageSize = 100; // Cap at 100 items per page

        var incidents = SeedIncidents.Get();
        var storedAlerts = await alertStorage.GetAllAlertsAsync();
        var dynamicIncidents = storedAlerts
            .Select(MapStoredAlertToIncident)
            .ToList();

        incidents = incidents
            .Concat(dynamicIncidents)
            .GroupBy(i => i.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderByDescending(i => ParseDateForSorting(i.FiredAt))
            .ToList();

        if (severity.HasValue)
            incidents = incidents.Where(i => i.Severity == severity.Value).ToList();

        if (source.HasValue)
            incidents = incidents.Where(i => i.Source == source.Value).ToList();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var query = q.ToLowerInvariant();
            incidents = incidents.Where(i =>
                i.Id.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                i.ResourceName.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                i.Rca.Summary.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                i.AlertRuleName.Contains(query, StringComparison.OrdinalIgnoreCase)
            ).ToList();
        }

        // Create paginated response
        var paginatedResponse = PaginatedResponse<Incident>.Create(incidents, pageNumber, pageSize);
        
        return Ok(paginatedResponse);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var storedAlert = await alertStorage.GetAlertByIdAsync(id);
        if (storedAlert is not null)
        {
            return Ok(MapStoredAlertToIncident(storedAlert));
        }

        var incident = SeedIncidents.Get().FirstOrDefault(i => i.Id == id);
        if (incident is null)
            return NotFound(new { message = $"Incident '{id}' not found" });
        return Ok(incident);
    }

    private static Incident MapStoredAlertToIncident(StoredAlert alert)
    {
        var severity = ParseSeverity(alert.Severity);
        var source = InferSource(alert);

        var summaryText = string.IsNullOrWhiteSpace(alert.Description)
            ? $"Alert {alert.AlertRule} fired for {alert.ResourceName}."
            : alert.Description;

        var evidence = new List<Evidence>
        {
            new(
                Id: $"{alert.Id}-e1",
                Source: source.ToString(),
                SignalType: "webhook",
                Relevance: 0.74,
                Data: $"{{\"receivedCount\":{alert.ReceivedCount},\"lastReceivedDateTime\":\"{alert.LastReceivedDateTime}\"}}",
                Description: "Incident created from webhook payload persisted to incidents storage."
            )
        };

        return new Incident(
            Id: alert.Id,
            AlertId: alert.DeduplicationKey,
            Severity: severity,
            FiredAt: alert.LastReceivedDateTime,
            ResourceId: alert.ResourceId,
            ResourceName: alert.ResourceName,
            ResourceType: InferResourceType(alert.ResourceId),
            ConditionType: alert.OperationName,
            Description: alert.Description,
            AlertRuleName: alert.AlertRule,
            Source: source,
            Status: AlertStatus.firing,
            IncidentId: alert.Id,
            Rca: new RootCauseAnalysis(
                Summary: summaryText,
                LikelyCause: "Pending automated RCA analysis",
                SeverityAssessment: "Assessment in progress",
                Confidence: 0.5,
                SuggestedActions:
                [
                    new SuggestedAction(1, "Inspect alert context and recent deployments", "immediate"),
                    new SuggestedAction(2, "Review runbook recommendations for this service", "short_term")
                ],
                Evidence: evidence,
                ReasoningChain:
                [
                    new ReasoningStep(1, "Webhook alert persisted in incidents storage"),
                    new ReasoningStep(2, "Incident promoted to API response for operator visibility")
                ],
                AlternativeHypotheses: [],
                HallucinationDisclaimer: "This incident is webhook-derived and awaits full RCA enrichment."
            ),
            Enrichment: new EnrichmentContext(new List<SimilarPastIncident>(), new List<SuspectCommit>()),
            GithubIssueUrl: null
        );
    }

    private static AlertSeverity ParseSeverity(string value)
        => Enum.TryParse<AlertSeverity>(value, ignoreCase: true, out var parsed) ? parsed : AlertSeverity.Sev4;

    private static AlertSource InferSource(StoredAlert alert)
    {
        var payloadText = alert.RawPayload.GetRawText();
        if (payloadText.Contains("Prometheus", StringComparison.OrdinalIgnoreCase)) return AlertSource.Prometheus;
        if (payloadText.Contains("Grafana", StringComparison.OrdinalIgnoreCase)) return AlertSource.Grafana;
        if (payloadText.Contains("Log Analytics", StringComparison.OrdinalIgnoreCase)) return AlertSource.LogAnalytics;
        return AlertSource.AppInsights;
    }

    private static string InferResourceType(string resourceId)
    {
        if (string.IsNullOrWhiteSpace(resourceId)) return "unknown";
        var parts = resourceId.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length >= 2 ? $"{parts[^2]}/{parts[^1]}" : resourceId;
    }

    private static DateTime ParseDateForSorting(string value)
        => DateTime.TryParse(value, out var parsed) ? parsed : DateTime.MinValue;
}
