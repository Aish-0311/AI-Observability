using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiObservability.Api.Data;

public interface IAlertStorage
{
    /// <summary>
    /// Saves an alert from Azure webhook, deduplicating by (alertRule + resourceId).
    /// Returns the incident ID (CARIAD-YYYY-### format).
    /// </summary>
    Task<string> SaveAlertAsync(JsonElement payload);

    /// <summary>
    /// Gets all stored incidents from incidents.json
    /// </summary>
    Task<List<StoredAlert>> GetAllAlertsAsync();

    /// <summary>
    /// Gets all raw alert feed events from alerts.json
    /// </summary>
    Task<List<StoredFeedAlert>> GetAllFeedAlertsAsync();

    /// <summary>
    /// Gets a single alert by incident ID
    /// </summary>
    Task<StoredAlert?> GetAlertByIdAsync(string incidentId);
}

/// <summary>
/// Represents a stored alert in the JSON file with metadata
/// </summary>
public record StoredAlert(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("deduplicationKey")] string DeduplicationKey,
    [property: JsonPropertyName("alertRule")] string AlertRule,
    [property: JsonPropertyName("severity")] string Severity,
    [property: JsonPropertyName("resourceId")] string ResourceId,
    [property: JsonPropertyName("resourceName")] string ResourceName,
    [property: JsonPropertyName("operationName")] string OperationName,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("originalFiredDateTime")] string OriginalFiredDateTime,
    [property: JsonPropertyName("lastReceivedDateTime")] string LastReceivedDateTime,
    [property: JsonPropertyName("receivedCount")] int ReceivedCount,
    [property: JsonPropertyName("rawPayload")] JsonElement RawPayload,
    [property: JsonPropertyName("caller")] string? Caller = null
);

/// <summary>
/// Represents a raw alert event in alerts.json (alerts feed source).
/// </summary>
public record StoredFeedAlert(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("incidentId")] string IncidentId,
    [property: JsonPropertyName("alertRule")] string AlertRule,
    [property: JsonPropertyName("severity")] string Severity,
    [property: JsonPropertyName("resourceId")] string ResourceId,
    [property: JsonPropertyName("resourceName")] string ResourceName,
    [property: JsonPropertyName("operationName")] string OperationName,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("firedDateTime")] string FiredDateTime,
    [property: JsonPropertyName("receivedDateTime")] string ReceivedDateTime,
    [property: JsonPropertyName("monitorCondition")] string MonitorCondition,
    [property: JsonPropertyName("monitoringService")] string MonitoringService,
    [property: JsonPropertyName("signalType")] string SignalType,
    [property: JsonPropertyName("rawPayload")] JsonElement RawPayload,
    [property: JsonPropertyName("caller")] string? Caller = null
);

/// <summary>
/// Root object for incidents.json
/// </summary>
public record IncidentsFile(
    [property: JsonPropertyName("version")] int Version,
    [property: JsonPropertyName("lastAutoIncrementId")] int LastAutoIncrementId,
    [property: JsonPropertyName("incidents")] List<StoredAlert> Incidents
);

/// <summary>
/// Root object for alerts.json
/// </summary>
public record AlertsFeedFile(
    [property: JsonPropertyName("version")] int Version,
    [property: JsonPropertyName("alerts")] List<StoredFeedAlert> Alerts
);

public class AlertStorage : IAlertStorage
{
    private readonly string _incidentsFilePath;
    private readonly string _alertsFeedFilePath;
    private readonly ILogger<AlertStorage> _logger;
    private static readonly ReaderWriterLockSlim FileLock = new();

    public AlertStorage(IWebHostEnvironment env, ILogger<AlertStorage> logger)
    {
        _incidentsFilePath = Path.Combine(env.ContentRootPath, "Data", "incidents.json");
        _alertsFeedFilePath = Path.Combine(env.ContentRootPath, "Data", "alerts.json");
        _logger = logger;

        // Ensure Data directory exists
        var dataDir = Path.Combine(env.ContentRootPath, "Data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }

    }

    public async Task<string> SaveAlertAsync(JsonElement payload)
    {
        return await Task.Run(() =>
        {
            FileLock.EnterUpgradeableReadLock();
            try
            {
                var incidentsFile = LoadIncidentsFile();
                var alertsFeedFile = LoadAlertsFeedFile();

                // Extract essential fields from Azure webhook payload
                var (alertRule, severity, resourceId, resourceName, operationName, description, firedDateTime, caller, monitorCondition, monitoringService, signalType, alertEventId)
                    = ExtractWebhookFields(payload);

                // Deduplication key defaults to (alertRule + resourceId), but falls back for schema variants.
                var deduplicationKey = BuildDeduplicationKey(alertRule, resourceId, alertEventId, monitoringService, operationName);

                // Check if alert already exists
                var existingAlert = incidentsFile.Incidents.FirstOrDefault(a => a.DeduplicationKey == deduplicationKey);

                string incidentId;

                if (existingAlert != null)
                {
                    // Update existing alert
                    incidentId = existingAlert.Id;
                    var updated = existingAlert with
                    {
                        LastReceivedDateTime = DateTime.UtcNow.ToString("O"),
                        ReceivedCount = existingAlert.ReceivedCount + 1,
                        RawPayload = payload
                    };

                    incidentsFile = incidentsFile with
                    {
                        Incidents = incidentsFile.Incidents.Select(a => a.Id == incidentId ? updated : a).ToList()
                    };

                    _logger.LogInformation("Updated existing incident {IncidentId}: received count now {Count}", incidentId, updated.ReceivedCount);
                }
                else
                {
                    // Create new incident
                    FileLock.EnterWriteLock();
                    try
                    {
                        // Re-read in case another thread incremented
                        incidentsFile = LoadIncidentsFile();
                        var nextId = incidentsFile.LastAutoIncrementId + 1;
                        incidentId = $"CARIAD-{DateTime.UtcNow.Year}-{nextId:D3}";

                        var newAlert = new StoredAlert(
                            Id: incidentId,
                            DeduplicationKey: deduplicationKey,
                            AlertRule: alertRule,
                            Severity: severity,
                            ResourceId: resourceId,
                            ResourceName: resourceName,
                            OperationName: operationName,
                            Description: description,
                            OriginalFiredDateTime: firedDateTime,
                            LastReceivedDateTime: DateTime.UtcNow.ToString("O"),
                            ReceivedCount: 1,
                            RawPayload: payload,
                            Caller: caller
                        );

                        incidentsFile = incidentsFile with
                        {
                            LastAutoIncrementId = nextId,
                            Incidents = new List<StoredAlert>(incidentsFile.Incidents) { newAlert }
                        };

                        _logger.LogInformation("Created new incident {IncidentId} for alert rule {AlertRule}", incidentId, alertRule);
                    }
                    finally
                    {
                        FileLock.ExitWriteLock();
                    }
                }

                var feedAlertId = string.IsNullOrWhiteSpace(alertEventId)
                    ? $"ALERT-{DateTime.UtcNow:yyyyMMddHHmmssfff}"
                    : alertEventId;
                if (alertsFeedFile.Alerts.Any(a => a.Id.Equals(feedAlertId, StringComparison.OrdinalIgnoreCase)))
                {
                    feedAlertId = $"{feedAlertId}-{DateTime.UtcNow.Ticks}";
                }

                var feedAlert = new StoredFeedAlert(
                    Id: feedAlertId,
                    IncidentId: incidentId,
                    AlertRule: alertRule,
                    Severity: severity,
                    ResourceId: resourceId,
                    ResourceName: resourceName,
                    OperationName: operationName,
                    Description: description,
                    FiredDateTime: firedDateTime,
                    ReceivedDateTime: DateTime.UtcNow.ToString("O"),
                    MonitorCondition: monitorCondition,
                    MonitoringService: monitoringService,
                    SignalType: signalType,
                    RawPayload: payload,
                    Caller: caller
                );

                alertsFeedFile = alertsFeedFile with
                {
                    Alerts = new List<StoredFeedAlert>(alertsFeedFile.Alerts) { feedAlert }
                };

                // Save to file
                SaveIncidentsFile(incidentsFile);
                SaveAlertsFeedFile(alertsFeedFile);

                return incidentId;
            }
            finally
            {
                FileLock.ExitUpgradeableReadLock();
            }
        });
    }

    public async Task<List<StoredAlert>> GetAllAlertsAsync()
    {
        return await Task.Run(() =>
        {
            FileLock.EnterReadLock();
            try
            {
                var incidentsFile = LoadIncidentsFile();
                return incidentsFile.Incidents;
            }
            finally
            {
                FileLock.ExitReadLock();
            }
        });
    }

    public async Task<List<StoredFeedAlert>> GetAllFeedAlertsAsync()
    {
        return await Task.Run(() =>
        {
            FileLock.EnterReadLock();
            try
            {
                var alertsFile = LoadAlertsFeedFile();
                if (alertsFile.Alerts.Count > 0)
                {
                    return alertsFile.Alerts;
                }

                // Compatibility fallback: derive a feed row per incident when alerts.json is empty.
                return LoadIncidentsFile().Incidents
                    .Select(i => new StoredFeedAlert(
                        Id: i.Id,
                        IncidentId: i.Id,
                        AlertRule: i.AlertRule,
                        Severity: i.Severity,
                        ResourceId: i.ResourceId,
                        ResourceName: i.ResourceName,
                        OperationName: i.OperationName,
                        Description: i.Description,
                        FiredDateTime: i.OriginalFiredDateTime,
                        ReceivedDateTime: i.LastReceivedDateTime,
                        MonitorCondition: "Fired",
                        MonitoringService: "unknown",
                        SignalType: "unknown",
                        RawPayload: i.RawPayload,
                        Caller: i.Caller
                    ))
                    .ToList();
            }
            finally
            {
                FileLock.ExitReadLock();
            }
        });
    }

    public async Task<StoredAlert?> GetAlertByIdAsync(string incidentId)
    {
        return await Task.Run(() =>
        {
            FileLock.EnterReadLock();
            try
            {
                var incidentsFile = LoadIncidentsFile();
                return incidentsFile.Incidents.FirstOrDefault(a => a.Id == incidentId);
            }
            finally
            {
                FileLock.ExitReadLock();
            }
        });
    }

    private IncidentsFile LoadIncidentsFile()
    {
        if (!File.Exists(_incidentsFilePath))
        {
            return new IncidentsFile(Version: 1, LastAutoIncrementId: 0, Incidents: new List<StoredAlert>());
        }

        try
        {
            var json = File.ReadAllText(_incidentsFilePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var version = root.TryGetProperty("version", out var versionElement)
                ? versionElement.GetInt32()
                : 1;
            var lastAutoIncrementId = root.TryGetProperty("lastAutoIncrementId", out var idElement)
                ? idElement.GetInt32()
                : 0;

            List<StoredAlert> incidents;
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            if (root.TryGetProperty("incidents", out var incidentsElement))
            {
                incidents = JsonSerializer.Deserialize<List<StoredAlert>>(incidentsElement.GetRawText(), options)
                    ?? new List<StoredAlert>();
            }
            else if (root.TryGetProperty("alerts", out var alertsElement))
            {
                // Backward compatibility with legacy alerts.json schema.
                incidents = JsonSerializer.Deserialize<List<StoredAlert>>(alertsElement.GetRawText(), options)
                    ?? new List<StoredAlert>();
            }
            else
            {
                incidents = new List<StoredAlert>();
            }

            return new IncidentsFile(version, lastAutoIncrementId, incidents);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load incidents.json, returning empty file");
            return new IncidentsFile(Version: 1, LastAutoIncrementId: 0, Incidents: new List<StoredAlert>());
        }
    }

    private void SaveIncidentsFile(IncidentsFile incidentsFile)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            var json = JsonSerializer.Serialize(incidentsFile, options);
            File.WriteAllText(_incidentsFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save incidents.json");
            throw;
        }
    }

    private AlertsFeedFile LoadAlertsFeedFile()
    {
        if (!File.Exists(_alertsFeedFilePath))
        {
            return new AlertsFeedFile(Version: 1, Alerts: new List<StoredFeedAlert>());
        }

        try
        {
            var json = File.ReadAllText(_alertsFeedFilePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var version = root.TryGetProperty("version", out var versionElement)
                ? versionElement.GetInt32()
                : 1;

            List<StoredFeedAlert> alerts;
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            if (root.TryGetProperty("alerts", out var alertsElement))
            {
                alerts = JsonSerializer.Deserialize<List<StoredFeedAlert>>(alertsElement.GetRawText(), options)
                    ?? new List<StoredFeedAlert>();
            }
            else
            {
                alerts = new List<StoredFeedAlert>();
            }

            return new AlertsFeedFile(version, alerts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load alerts.json, returning empty feed file");
            return new AlertsFeedFile(Version: 1, Alerts: new List<StoredFeedAlert>());
        }
    }

    private void SaveAlertsFeedFile(AlertsFeedFile alertsFile)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            var json = JsonSerializer.Serialize(alertsFile, options);
            File.WriteAllText(_alertsFeedFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save alerts.json");
            throw;
        }
    }

    /// <summary>
    /// Extracts key fields from Azure Monitor Common Alert Schema webhook payload
    /// </summary>
    private (string alertRule, string severity, string resourceId, string resourceName, string operationName, string description, string firedDateTime, string? caller, string monitorCondition, string monitoringService, string signalType, string alertEventId)
        ExtractWebhookFields(JsonElement payload)
    {
        var alertRule = "unknown";
        var severity = "Sev4";
        var resourceId = "unknown";
        var resourceName = "unknown";
        var operationName = "unknown";
        var description = "unknown";
        var firedDateTime = DateTime.UtcNow.ToString("O");
        var monitorCondition = "Fired";
        var monitoringService = "unknown";
        var signalType = "unknown";
        var alertEventId = string.Empty;
        string? caller = null;

        try
        {
            if (payload.TryGetProperty("data", out var data))
            {
                // Extract from essentials
                if (data.TryGetProperty("essentials", out var essentials))
                {
                    if (essentials.TryGetProperty("alertRule", out var rule))
                    {
                        alertRule = rule.GetString() ?? "unknown";
                    }

                    if (string.Equals(alertRule, "unknown", StringComparison.OrdinalIgnoreCase)
                        && essentials.TryGetProperty("configurationItems", out var configItems)
                        && configItems.ValueKind == JsonValueKind.Array)
                    {
                        var firstConfig = configItems.EnumerateArray().FirstOrDefault();
                        if (firstConfig.ValueKind == JsonValueKind.String)
                        {
                            alertRule = firstConfig.GetString() ?? "unknown";
                        }
                    }

                    severity = essentials.TryGetProperty("severity", out var sev) 
                        ? sev.GetString() ?? "Sev4" 
                        : "Sev4";

                    monitorCondition = essentials.TryGetProperty("monitorCondition", out var monitorConditionElement)
                        ? monitorConditionElement.GetString() ?? "Fired"
                        : "Fired";

                    monitoringService = essentials.TryGetProperty("monitoringService", out var monitoringServiceElement)
                        ? monitoringServiceElement.GetString() ?? "unknown"
                        : "unknown";

                    signalType = essentials.TryGetProperty("signalType", out var signalTypeElement)
                        ? signalTypeElement.GetString() ?? "unknown"
                        : "unknown";

                    alertEventId = essentials.TryGetProperty("alertId", out var alertIdElement)
                        ? alertIdElement.GetString() ?? string.Empty
                        : string.Empty;

                    firedDateTime = essentials.TryGetProperty("firedDateTime", out var fired) 
                        ? fired.GetString() ?? DateTime.UtcNow.ToString("O") 
                        : DateTime.UtcNow.ToString("O");

                    description = essentials.TryGetProperty("description", out var essentialsDescription)
                        ? essentialsDescription.GetString() ?? description
                        : description;

                    // Get first resource ID from alertTargetIDs array
                    if (essentials.TryGetProperty("alertTargetIDs", out var targetIds) && targetIds.ValueKind == JsonValueKind.Array)
                    {
                        var targets = targetIds.EnumerateArray().ToList();
                        if (targets.Count > 0)
                        {
                            resourceId = targets[0].GetString() ?? "unknown";
                            // Extract resource name from the resource ID path
                            resourceName = ExtractResourceName(resourceId);
                        }
                    }
                }

                // Extract from alertContext
                if (data.TryGetProperty("alertContext", out var alertContext))
                {
                    operationName = alertContext.TryGetProperty("operationName", out var opName) 
                        ? opName.GetString() ?? "unknown" 
                        : "unknown";

                    if (alertContext.TryGetProperty("message", out var msg))
                    {
                        description = msg.GetString() ?? description;
                    }

                    if (string.Equals(description, "unknown", StringComparison.OrdinalIgnoreCase)
                        && alertContext.TryGetProperty("Activity Log Event Description", out var activityDescription))
                    {
                        description = activityDescription.GetString() ?? description;
                    }

                    if (string.Equals(resourceId, "unknown", StringComparison.OrdinalIgnoreCase)
                        && alertContext.TryGetProperty("AlertData", out var alertData)
                        && alertData.TryGetProperty("Scope", out var scope))
                    {
                        resourceId = scope.GetString() ?? resourceId;
                        resourceName = ExtractResourceName(resourceId);
                    }

                    caller = alertContext.TryGetProperty("caller", out var cal) 
                        ? cal.GetString() 
                        : null;

                    if (caller is null
                        && alertContext.TryGetProperty("AlertData", out var alertDataForCaller)
                        && alertDataForCaller.TryGetProperty("BudgetCreator", out var budgetCreator))
                    {
                        caller = budgetCreator.GetString();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error extracting webhook fields, using defaults");
        }

        if (string.Equals(alertRule, "unknown", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(alertEventId))
        {
            alertRule = alertEventId;
        }

        if (string.Equals(resourceName, "unknown", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(resourceId, "unknown", StringComparison.OrdinalIgnoreCase))
        {
            resourceName = ExtractResourceName(resourceId);
        }

        return (alertRule, severity, resourceId, resourceName, operationName, description, firedDateTime, caller, monitorCondition, monitoringService, signalType, alertEventId);
    }

    private static string BuildDeduplicationKey(
        string alertRule,
        string resourceId,
        string alertEventId,
        string monitoringService,
        string operationName)
    {
        if (!string.Equals(alertRule, "unknown", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(resourceId, "unknown", StringComparison.OrdinalIgnoreCase))
        {
            return $"{alertRule}#{resourceId}";
        }

        if (!string.IsNullOrWhiteSpace(alertEventId))
        {
            return $"{alertEventId}#{resourceId}";
        }

        return $"{monitoringService}#{resourceId}#{operationName}";
    }

    /// <summary>
    /// Extracts the last segment of a resource ID as the resource name
    /// e.g., "/subscriptions/.../virtualMachines/test-VM" → "test-VM"
    /// </summary>
    private string ExtractResourceName(string resourceId)
    {
        if (string.IsNullOrEmpty(resourceId))
            return "unknown";

        var parts = resourceId.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[^1] : "unknown";
    }
}
