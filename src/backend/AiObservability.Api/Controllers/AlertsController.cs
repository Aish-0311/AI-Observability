using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;
using AiObservability.Api.Models;
using System.Text.Json;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize]
public class AlertsController(IAlertStorage alertStorage) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] AlertSeverity? severity,
        [FromQuery] AlertSource? source,
        [FromQuery] AlertStatus? status,
        [FromQuery] string? q)
    {
        var alerts = SeedAlerts.Get();
        var storedFeedAlerts = await alertStorage.GetAllFeedAlertsAsync();
        var dynamicAlerts = storedFeedAlerts
            .Select(MapStoredFeedAlertToAlertPayload)
            .ToList();

        alerts = alerts
            .Concat(dynamicAlerts)
            .OrderByDescending(a => ParseDateForSorting(a.FiredAt))
            .ToList();

        if (severity.HasValue)
            alerts = alerts.Where(a => a.Severity == severity.Value).ToList();

        if (source.HasValue)
            alerts = alerts.Where(a => a.Source == source.Value).ToList();

        if (status.HasValue)
            alerts = alerts.Where(a => a.Status == status.Value).ToList();

        if (!string.IsNullOrWhiteSpace(q))
        {
            alerts = alerts.Where(a =>
                a.AlertRuleName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                a.ResourceName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                a.Description.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                a.AlertId.Contains(q, StringComparison.OrdinalIgnoreCase)
            ).ToList();
        }

        return Ok(alerts);
    }

    private static AlertPayload MapStoredFeedAlertToAlertPayload(StoredFeedAlert alert)
    {
        var severity = ParseSeverity(alert.Severity);
        var source = InferSource(alert.MonitoringService, alert.SignalType, alert.RawPayload);
        var status = InferStatus(alert.MonitorCondition);
        var firedAt = string.IsNullOrWhiteSpace(alert.FiredDateTime)
            ? alert.ReceivedDateTime
            : alert.FiredDateTime;

        return new AlertPayload(
            AlertId: alert.Id,
            Severity: severity,
            FiredAt: firedAt,
            ResourceId: alert.ResourceId,
            ResourceName: alert.ResourceName,
            ResourceType: InferResourceType(alert.ResourceId),
            ConditionType: alert.OperationName,
            Description: alert.Description,
            AlertRuleName: alert.AlertRule,
            Source: source,
            Status: status,
            IncidentId: alert.IncidentId
        );
    }

    private static AlertSeverity ParseSeverity(string value)
        => Enum.TryParse<AlertSeverity>(value, ignoreCase: true, out var parsed) ? parsed : AlertSeverity.Sev4;

    private static AlertSource InferSource(string monitoringService, string signalType, JsonElement payload)
    {
        var payloadText = payload.GetRawText();
        if (monitoringService.Contains("Prometheus", StringComparison.OrdinalIgnoreCase)
            || payloadText.Contains("Prometheus", StringComparison.OrdinalIgnoreCase)) return AlertSource.Prometheus;
        if (monitoringService.Contains("Grafana", StringComparison.OrdinalIgnoreCase)
            || payloadText.Contains("Grafana", StringComparison.OrdinalIgnoreCase)) return AlertSource.Grafana;
        if (monitoringService.Contains("Log Analytics", StringComparison.OrdinalIgnoreCase)
            || signalType.Contains("Log", StringComparison.OrdinalIgnoreCase)
            || payloadText.Contains("Log Analytics", StringComparison.OrdinalIgnoreCase)) return AlertSource.LogAnalytics;
        return AlertSource.AppInsights;
    }

    private static AlertStatus InferStatus(string monitorCondition)
        => monitorCondition.Equals("Resolved", StringComparison.OrdinalIgnoreCase)
            ? AlertStatus.resolved
            : AlertStatus.firing;

    private static string InferResourceType(string resourceId)
    {
        if (string.IsNullOrWhiteSpace(resourceId)) return "unknown";
        var parts = resourceId.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2)
        {
            return $"{parts[^2]}/{parts[^1]}";
        }

        return resourceId;
    }

    private static DateTime ParseDateForSorting(string value)
        => DateTime.TryParse(value, out var parsed) ? parsed : DateTime.MinValue;
}
