using AiObservability.Api.Data;
using Microsoft.AspNetCore.SignalR;

namespace AiObservability.Api.Hubs;

public class IncidentHub : Hub
{
    private readonly IAlertStorage _alertStorage;
    private readonly ILogger<IncidentHub> _logger;

    public IncidentHub(IAlertStorage alertStorage, ILogger<IncidentHub> logger)
    {
        _alertStorage = alertStorage;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected to IncidentHub: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected from IncidentHub: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client calls this to subscribe to incident updates
    /// </summary>
    public async Task SubscribeToIncidents()
    {
        _logger.LogInformation("Client {ConnectionId} subscribing to incidents", Context.ConnectionId);
        
        // Return all existing alerts to the client
        var alerts = await _alertStorage.GetAllAlertsAsync();
        
        // Convert alerts to a serializable format (exclude raw payload)
        var alertSummaries = alerts.Select(a => new
        {
            id = a.Id,
            alertRule = a.AlertRule,
            severity = a.Severity,
            resourceName = a.ResourceName,
            originalFiredDateTime = a.OriginalFiredDateTime,
            lastReceivedDateTime = a.LastReceivedDateTime,
            receivedCount = a.ReceivedCount,
            caller = a.Caller
        }).ToList();

        await Clients.Caller.SendAsync("InitialIncidents", alertSummaries);
    }

    /// <summary>
    /// Server calls this to broadcast a new/updated incident to all connected clients
    /// </summary>
    public async Task BroadcastAlertReceived(StoredAlert alert)
    {
        var alertSummary = new
        {
            id = alert.Id,
            alertRule = alert.AlertRule,
            severity = alert.Severity,
            resourceName = alert.ResourceName,
            originalFiredDateTime = alert.OriginalFiredDateTime,
            lastReceivedDateTime = alert.LastReceivedDateTime,
            receivedCount = alert.ReceivedCount,
            caller = alert.Caller
        };

        await Clients.All.SendAsync("AlertReceived", alertSummary);
    }
}
