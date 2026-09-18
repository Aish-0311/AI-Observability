using AiObservability.Api.Configuration;
using Microsoft.Extensions.Options;
using Octokit;

namespace AiObservability.Api.Services;

public interface IGitHubService
{
    Task<string> CreateIssueAsync(string title, string body, List<string>? labels = null);
    Task<List<Dictionary<string, object?>>> GetRecentCommitsAsync(string? serviceName = null, int hours = 24);
}

public class GitHubService(IOptions<PipelineSettings> options, ILogger<GitHubService> logger) : IGitHubService
{
    private readonly PipelineSettings _settings = options.Value;

    private GitHubClient CreateClient()
    {
        var client = new GitHubClient(new ProductHeaderValue("AiObservability"))
        {
            Credentials = new Credentials(_settings.GitHubToken)
        };
        return client;
    }

    private (string Owner, string Repo) ParseRepo()
    {
        var parts = _settings.GitHubRepo.Split('/');
        return (parts[0], parts[1]);
    }

    public async Task<string> CreateIssueAsync(string title, string body, List<string>? labels = null)
    {
        var client = CreateClient();
        var (owner, repo) = ParseRepo();

        // Ensure labels exist
        if (labels is { Count: > 0 })
        {
            await EnsureLabelsExistAsync(client, owner, repo, labels);
        }

        var newIssue = new NewIssue(title) { Body = body };
        if (labels is not null)
        {
            foreach (var label in labels)
                newIssue.Labels.Add(label);
        }

        var issue = await client.Issue.Create(owner, repo, newIssue);
        logger.LogInformation("Created GitHub issue #{Number}: {Url}", issue.Number, issue.HtmlUrl);
        return issue.HtmlUrl;
    }

    public async Task<List<Dictionary<string, object?>>> GetRecentCommitsAsync(string? serviceName = null, int hours = 24)
    {
        var client = CreateClient();
        var (owner, repo) = ParseRepo();
        var since = DateTimeOffset.UtcNow.AddHours(-hours);

        var request = new CommitRequest { Since = since };
        var commits = await client.Repository.Commit.GetAll(owner, repo, request);

        var results = new List<Dictionary<string, object?>>();
        foreach (var c in commits.Take(20))
        {
            var entry = new Dictionary<string, object?>
            {
                ["sha"] = c.Sha[..8],
                ["message"] = c.Commit.Message.Split('\n')[0],
                ["author"] = c.Commit.Author?.Name ?? "unknown",
                ["date"] = c.Commit.Author?.Date.ToString("o"),
                ["url"] = c.HtmlUrl,
            };

            // Filter by service name if provided
            if (!string.IsNullOrEmpty(serviceName))
            {
                try
                {
                    var detail = await client.Repository.Commit.Get(owner, repo, c.Sha);
                    var files = detail.Files?.Select(f => f.Filename).ToList() ?? [];
                    if (!files.Any(f => f.Contains(serviceName, StringComparison.OrdinalIgnoreCase)))
                        continue;
                }
                catch
                {
                    // Skip filtering if file list unavailable
                }
            }

            results.Add(entry);
        }

        return results;
    }

    private async Task EnsureLabelsExistAsync(GitHubClient client, string owner, string repo, List<string> labels)
    {
        var colors = new Dictionary<string, string>
        {
            ["incident"] = "d73a4a",
            ["critical"] = "b60205",
            ["high"] = "d93f0b",
            ["medium"] = "fbca04",
            ["low"] = "0e8a16",
            ["informational"] = "c5def5",
            ["ai-generated"] = "7057ff",
        };

        try
        {
            var existing = await client.Issue.Labels.GetAllForRepository(owner, repo);
            var existingNames = existing.Select(l => l.Name).ToHashSet();

            foreach (var label in labels.Where(l => !existingNames.Contains(l)))
            {
                var color = colors.GetValueOrDefault(label, "ededed");
                await client.Issue.Labels.Create(owner, repo, new NewLabel(label, color));
                logger.LogInformation("Created label '{Label}' in repo", label);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to ensure labels exist");
        }
    }
}
