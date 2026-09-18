using System.Text.Json.Serialization;

namespace AiObservability.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AlertSeverity { Sev0, Sev1, Sev2, Sev3, Sev4 }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AlertStatus { firing, resolved }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AlertSource
{
    [JsonStringEnumMemberName("App Insights")]
    AppInsights,
    Grafana,
    Prometheus,
    [JsonStringEnumMemberName("Log Analytics")]
    LogAnalytics
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SourceKind
{
    [JsonStringEnumMemberName("app-insights")]
    AppInsights,
    [JsonStringEnumMemberName("grafana")]
    Grafana,
    [JsonStringEnumMemberName("prometheus")]
    Prometheus,
    [JsonStringEnumMemberName("github")]
    GitHub
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SourceHealth { healthy, degraded, incident, unknown }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NodeHealth { healthy, degraded, incident, unknown }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum StageStatus { pending, running, success, error, skipped }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ServiceNodeType { frontend, api, service, database, queue, cache, storage, external }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AgentStatus { healthy, degraded, incident }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AgentRunStatus { success, error, skipped }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AgentDepType { azure, llm, @internal, github }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AgentConfigSource { env, hardcoded }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TriggerType { webhook, manual }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PipelineRunStatus { success, error, running }
