using System.Diagnostics;
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Azure.ResourceManager;
using AiObservability.Api.Models;

namespace AiObservability.Api.Services;

public sealed class AzureConnectionFactory
{
    public ClientSecretCredential CreateCredential(AzureConnection conn) =>
        new(conn.TenantId, conn.ClientId, conn.ClientSecret);

    public ArmClient CreateArmClient(AzureConnection conn) =>
        new(CreateCredential(conn));

    public LogsQueryClient CreateLogsClient(AzureConnection conn) =>
        new(CreateCredential(conn));

    public async Task<PingResult> PingAsync(AzureConnection conn, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            if (string.IsNullOrWhiteSpace(conn.WorkspaceId))
            {
                // No workspace — just validate ARM access
                var arm = CreateArmClient(conn);
                await arm.GetDefaultSubscriptionAsync(ct);
            }
            else
            {
                var logsClient = CreateLogsClient(conn);
                await logsClient.QueryWorkspaceAsync(
                    conn.WorkspaceId,
                    "print now()",
                    QueryTimeRange.All,
                    cancellationToken: ct);
            }
            return new PingResult(true, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            return new PingResult(false, sw.ElapsedMilliseconds, ex.Message);
        }
    }
}
