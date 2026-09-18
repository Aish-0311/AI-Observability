using System.Text.Json;
using System.Text.RegularExpressions;
using AiObservability.Api.Models;

namespace AiObservability.Api.Services;

public interface IUserDataStore
{
    Task<UserSettings> LoadAsync(string userKey, CancellationToken ct = default);
    Task SaveAsync(string userKey, UserSettings settings, CancellationToken ct = default);
}

public sealed class UserDataStore : IUserDataStore
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = true,
    };

    private readonly string _baseDir;

    public UserDataStore(IWebHostEnvironment env)
    {
        _baseDir = Path.Combine(env.ContentRootPath, "data", "users");
        Directory.CreateDirectory(_baseDir);
    }

    public async Task<UserSettings> LoadAsync(string userKey, CancellationToken ct = default)
    {
        var path = FilePath(userKey);
        if (!File.Exists(path)) return new UserSettings();
        var json = await File.ReadAllTextAsync(path, ct);
        return JsonSerializer.Deserialize<UserSettings>(json, _json) ?? new UserSettings();
    }

    public async Task SaveAsync(string userKey, UserSettings settings, CancellationToken ct = default)
    {
        var path = FilePath(userKey);
        var json = JsonSerializer.Serialize(settings, _json);
        await File.WriteAllTextAsync(path, json, ct);
    }

    private string FilePath(string userKey)
    {
        var safe = Regex.Replace(userKey.ToLowerInvariant(), @"[^a-z0-9._\-]", "_");
        return Path.Combine(_baseDir, $"{safe}.json");
    }
}
