using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Models;
using AiObservability.Api.Services;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController(IUserDataStore store, AzureConnectionFactory factory) : ControllerBase
{
    private string UserKey => User.FindFirstValue(ClaimTypes.Email) ?? "default";

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await store.LoadAsync(UserKey, ct);
        return Ok(MaskSecret(settings));
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] UserSettings incoming, CancellationToken ct)
    {
        var current = await store.LoadAsync(UserKey, ct);
        var azure = MergeConnection(incoming.Azure, current.Azure);

        DateTime? validatedAt = current.LastValidatedAt;
        string? validationError = current.LastValidationError;

        if (azure != null)
        {
            var ping = await factory.PingAsync(azure, ct);
            validatedAt = ping.Ok ? DateTime.UtcNow : current.LastValidatedAt;
            validationError = ping.Ok ? null : ping.Error;
        }

        var updated = new UserSettings(azure, validatedAt, validationError);
        await store.SaveAsync(UserKey, updated, ct);
        return Ok(MaskSecret(updated));
    }

    [HttpDelete("azure")]
    public async Task<IActionResult> DeleteAzure(CancellationToken ct)
    {
        var current = await store.LoadAsync(UserKey, ct);
        var cleared = current with { Azure = null, LastValidatedAt = null, LastValidationError = null };
        await store.SaveAsync(UserKey, cleared, ct);
        return NoContent();
    }

    [HttpPost("test")]
    public async Task<IActionResult> Test([FromBody] UserSettings incoming, CancellationToken ct)
    {
        var current = await store.LoadAsync(UserKey, ct);
        var azure = MergeConnection(incoming.Azure, current.Azure);
        if (azure == null) return BadRequest(new { error = "No Azure configuration provided." });

        var ping = await factory.PingAsync(azure, ct);
        return Ok(ping);
    }

    private static AzureConnection? MergeConnection(AzureConnection? incoming, AzureConnection? current)
    {
        if (incoming == null) return current;
        var secret = (incoming.ClientSecret is null or "********")
            ? current?.ClientSecret ?? ""
            : incoming.ClientSecret;
        return incoming with { ClientSecret = secret };
    }

    private static UserSettings MaskSecret(UserSettings s) =>
        s.Azure == null ? s : s with { Azure = s.Azure with { ClientSecret = "********" } };
}
