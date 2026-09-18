using System.Text.Json;
using AiObservability.Api.Configuration;
using AiObservability.Api.Data;
using AiObservability.Api.Hubs;
using AiObservability.Api.Pipeline;
using AiObservability.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Pipeline configuration
builder.Services.Configure<PipelineSettings>(builder.Configuration.GetSection(PipelineSettings.SectionName));

// HTTP clients for Prometheus and Grafana
builder.Services.AddHttpClient("Prometheus");
builder.Services.AddHttpClient("Grafana");

// Pipeline services
builder.Services.AddSingleton<IAzureMonitorService, AzureMonitorService>();
builder.Services.AddSingleton<IPrometheusService, PrometheusService>();
builder.Services.AddSingleton<IGrafanaService, GrafanaService>();
builder.Services.AddSingleton<IAzureOpenAiService, AzureOpenAiService>();
builder.Services.AddSingleton<IGitHubService, GitHubService>();
builder.Services.AddSingleton<IPipelineOrchestrator, PipelineOrchestrator>();
builder.Services.AddApplicationInsightsTelemetry();

// Azure integration services
builder.Services.AddSingleton<IUserDataStore, UserDataStore>();
builder.Services.AddSingleton<AzureConnectionFactory>();
builder.Services.AddSingleton<AzureResourceGraphService>();
builder.Services.AddSingleton<AppInsightsTopologyService>();

// Data storage
builder.Services.AddScoped<IAlertStorage, AlertStorage>();

// SignalR for real-time updates
builder.Services.AddSignalR();

// JSON serialization — snake_case to match frontend expectations
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

// Cookie authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = ".AiObs.Auth";
        // Local dev runs over http (same-origin via the Vite proxy), so a
        // SameSite=None+Secure cookie would be dropped by the browser.
        // Use relaxed settings in Development and strict cross-site settings
        // in production where the frontend is served from a different HTTPS origin.
        if (builder.Environment.IsDevelopment())
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        }
        else
        {
            options.Cookie.SameSite = SameSiteMode.None;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        }
        options.Cookie.HttpOnly = true;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = 401;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync("{\"message\":\"Unauthorized\"}");
        };
    });

builder.Services.AddAuthorization();

// CORS — allow frontend dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5270",
                  "https://ai-obs-poc-frontend.lemonbush-412008ac.swedencentral.azurecontainerapps.io")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// OpenAPI + Scalar UI at /scalar
app.MapOpenApi();
app.MapScalarApiReference();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<IncidentHub>("/hubs/incidents");

app.Run();
