using System.Text.Json.Serialization;

namespace AiObservability.Api.Models;

public record Agent(
    string Id,
    string Name,
    string Description,
    AgentStatus Status,
    AgentMetrics Metrics,
    List<AgentRun> RecentRuns,
    List<AgentInput> Inputs,
    List<AgentOutput> Outputs,
    List<AgentDep> Dependencies,
    List<AgentConfigEntry> Config,
    string ErrorHandling
);

public record AgentMetrics([property: JsonPropertyName("runs_24h")] int Runs24h, double SuccessRate, int AvgDurationMs, string LastRunAt);

public record AgentRun(AgentRunStatus Status, int? DurationMs = null);

public record AgentInput(string Name, string Type, string Description);

public record AgentOutput(string Name, string Type, string Description);

public record AgentDep(string Name, AgentDepType Type, string Description);

public record AgentConfigEntry(string Key, string Value, AgentConfigSource Source);
