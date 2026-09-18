namespace AiObservability.Api.Models;

public record LoginRequest(string? Email, string? Password);

public record UserInfo(string Email, string Name, string Role);
