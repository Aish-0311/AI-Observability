using System.Text.Json.Serialization;

namespace AiObservability.Api.Models;

public record SourceIntegration(
    string Id,
    string Name,
    SourceKind Kind,
    SourceHealth Health,
    string LastQueryAt,
    [property: JsonPropertyName("queries_24h")] int Queries24h,
    double ErrorRate,
    Dictionary<string, object> Config,
    bool Enabled = true,
    bool ComingSoon = false
);
