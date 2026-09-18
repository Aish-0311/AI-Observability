namespace AiObservability.Api.Configuration;

public class PipelineSettings
{
    public const string SectionName = "Pipeline";

    // Azure Monitor / Log Analytics
    public string AzureLogAnalyticsWorkspaceId { get; set; } = "";
    public string AzureSubscriptionId { get; set; } = "";

    // Azure OpenAI
    public string AzureOpenAiEndpoint { get; set; } = "";
    public string AzureOpenAiDeployment { get; set; } = "gpt-4o";
    public string AzureOpenAiApiVersion { get; set; } = "2024-12-01-preview";

    // Prometheus (optional)
    public string PrometheusEndpoint { get; set; } = "";

    // Grafana (optional)
    public string GrafanaEndpoint { get; set; } = "";
    public string GrafanaApiKey { get; set; } = "";

    // GitHub
    public string GitHubToken { get; set; } = "";
    public string GitHubRepo { get; set; } = ""; // "owner/repo"

    // Past incidents
    public string PastIncidentsPath { get; set; } = "data/past_incidents.json";
}
