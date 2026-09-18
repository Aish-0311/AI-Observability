namespace AiObservability.Api.Models;

public sealed record UserSettings(
    AzureConnection? Azure = null,
    DateTime? LastValidatedAt = null,
    string? LastValidationError = null
);

public sealed record AzureConnection(
    string TenantId,
    string ClientId,
    string ClientSecret,
    string SubscriptionId,
    string ResourceGroup,
    string? AppInsightsResourceName = null,
    string? WorkspaceId = null,
    string? Region = null
);

public sealed record PingResult(bool Ok, long LatencyMs, string? Error = null);
