using System.Text.Json;
using AiObservability.Api.Data;
using AiObservability.Api.Hubs;
using AiObservability.Api.Pipeline;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("webhook")]
[AllowAnonymous]
public class WebhookController(
    IPipelineOrchestrator pipeline,
    IAlertStorage alertStorage,
    IHubContext<IncidentHub> hubContext,
    ILogger<WebhookController> logger) : ControllerBase
{
    [HttpPost("alert")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> ReceiveAlert([FromBody] JsonElement payload)
    {
        try
        {
            // Store the alert and get the incident ID
            var incidentId = await alertStorage.SaveAlertAsync(payload.Clone());

            logger.LogInformation("Stored alert as incident {IncidentId}", incidentId);

            // Retrieve the stored alert to broadcast via SignalR
            var storedAlert = await alertStorage.GetAlertByIdAsync(incidentId);
            if (storedAlert != null)
            {
                // Broadcast to all connected SignalR clients
                _ = hubContext.Clients.All.SendAsync("AlertReceived", new
                {
                    id = storedAlert.Id,
                    alertRule = storedAlert.AlertRule,
                    severity = storedAlert.Severity,
                    resourceName = storedAlert.ResourceName,
                    originalFiredDateTime = storedAlert.OriginalFiredDateTime,
                    lastReceivedDateTime = storedAlert.LastReceivedDateTime,
                    receivedCount = storedAlert.ReceivedCount,
                    caller = storedAlert.Caller
                });
            }

            // Fire-and-forget: start pipeline processing in background
            _ = Task.Run(() => RunPipelineAsync(payload.Clone()));

            return StatusCode(StatusCodes.Status202Accepted, new
            {
                status = "accepted",
                message = "Alert received, processing started.",
                incidentId
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing webhook alert");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                status = "error",
                message = "Failed to process alert"
            });
        }
    }

    private async Task RunPipelineAsync(JsonElement payload)
    {
        try
        {
            var result = await pipeline.RunAsync(payload);
            var issueUrl = result.GitHubIssueUrl ?? "N/A";
            var error = result.Error;

            if (!string.IsNullOrEmpty(error))
            {
                logger.LogWarning("Pipeline completed with error: {Error} | issue: {IssueUrl}", error, issueUrl);
            }
            else
            {
                logger.LogInformation("Pipeline completed successfully → {IssueUrl}", issueUrl);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Pipeline execution failed");
        }
    }
}
