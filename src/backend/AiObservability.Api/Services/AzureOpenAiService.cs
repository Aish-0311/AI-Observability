using System.Text.Json;
using Azure.AI.OpenAI;
using Azure.Identity;
using AiObservability.Api.Configuration;
using AiObservability.Api.Pipeline;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

namespace AiObservability.Api.Services;

public interface IAzureOpenAiService
{
    Task<RootCauseResult> AnalyzeRootCauseAsync(AlertPayload alert, CorrelatedSignals signals, CorrelationContext? correlation);
}

public class AzureOpenAiService(IOptions<PipelineSettings> options, ILogger<AzureOpenAiService> logger) : IAzureOpenAiService
{
    private readonly PipelineSettings _settings = options.Value;

    private const string SystemPrompt = """
        You are a senior Site Reliability Engineer analyzing a production incident.
        You will receive structured data from MULTIPLE sources:
        - Azure Monitor alerts and metrics
        - Application Insights traces, availability tests, and performance counters
        - Log Analytics exceptions, failed requests, and dependency failures
        - Prometheus metrics (if available)
        - Grafana annotations and firing alerts (if available)

        CRITICAL RULES — hallucination prevention:
        1. ONLY cite evidence that exists in the provided data. Do NOT fabricate log entries,
           metric values, error messages, or timestamps.
        2. Every claim in "likely_cause" MUST have at least one matching entry in "evidence"
           that references REAL data from the input.
        3. If the data is insufficient to determine a root cause, say so explicitly and
           set confidence below 0.3.
        4. In "hallucination_disclaimer", list which parts of your analysis are uncertain
           and which signals were missing or empty.
        5. Include "reasoning_chain" showing HOW you connected evidence to your conclusion.
        6. List at least one "alternative_hypotheses" so the on-call engineer considers
           other possibilities.

        Your task:
        1. Summarise what happened in plain English.
        2. Identify the most likely root cause, citing specific evidence from the data.
        3. Assess the severity (Critical / High / Medium / Low).
        4. Suggest concrete remediation actions in priority order.
        5. Provide an honest confidence score (0-1).
        6. List ALL supporting evidence with source attribution.
        7. Show your reasoning chain.
        8. Propose alternative hypotheses.
        9. Write a hallucination disclaimer.

        Be concise, evidence-based, and actionable.

        Return a JSON object with this exact structure:
        {
          "summary": "...",
          "likely_cause": "...",
          "severity_assessment": "Critical | High | Medium | Low",
          "suggested_actions": ["..."],
          "confidence": 0.0-1.0,
          "evidence": [{"source": "...", "signal_type": "...", "data": "...", "relevance": "..."}],
          "reasoning_chain": ["..."],
          "alternative_hypotheses": ["..."],
          "hallucination_disclaimer": "..."
        }
        """;

    public async Task<RootCauseResult> AnalyzeRootCauseAsync(
        AlertPayload alert, CorrelatedSignals signals, CorrelationContext? correlation)
    {
        var credential = new DefaultAzureCredential();
        var client = new AzureOpenAIClient(new Uri(_settings.AzureOpenAiEndpoint), credential);
        var chatClient = client.GetChatClient(_settings.AzureOpenAiDeployment);

        var userContent = JsonSerializer.Serialize(new
        {
            alert,
            correlation = correlation ?? new CorrelationContext(),
            signals
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(SystemPrompt),
            new UserChatMessage(userContent)
        };

        var completionOptions = new ChatCompletionOptions
        {
            Temperature = 0.2f,
            ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                "root_cause_analysis",
                BinaryData.FromString(RcaJsonSchema)),
        };

        var response = await chatClient.CompleteChatAsync(messages, completionOptions);
        var raw = response.Value.Content[0].Text;
        logger.LogDebug("LLM raw response: {Response}", raw);

        var result = JsonSerializer.Deserialize<RootCauseResult>(raw, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        }) ?? new RootCauseResult();

        // Post-processing: flag low-confidence results
        if (result.Confidence < 0.3)
        {
            logger.LogWarning("Low-confidence RCA ({Confidence:F2}) — evidence may be insufficient", result.Confidence);
        }

        if (result.Evidence.Count == 0)
        {
            logger.LogWarning("RCA returned with no evidence — possible hallucination");
            result.HallucinationDisclaimer = "WARNING: No raw evidence was cited. This analysis may be speculative. " + result.HallucinationDisclaimer;
            result.Confidence = Math.Min(result.Confidence, 0.2);
        }

        return result;
    }

    private const string RcaJsonSchema = """
        {
          "type": "object",
          "properties": {
            "summary": { "type": "string" },
            "likely_cause": { "type": "string" },
            "severity_assessment": { "type": "string" },
            "suggested_actions": { "type": "array", "items": { "type": "string" } },
            "confidence": { "type": "number" },
            "evidence": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "source": { "type": "string" },
                  "signal_type": { "type": "string" },
                  "data": { "type": "string" },
                  "relevance": { "type": "string" }
                },
                "required": ["source", "signal_type", "data", "relevance"],
                "additionalProperties": false
              }
            },
            "reasoning_chain": { "type": "array", "items": { "type": "string" } },
            "alternative_hypotheses": { "type": "array", "items": { "type": "string" } },
            "hallucination_disclaimer": { "type": "string" }
          },
          "required": ["summary", "likely_cause", "severity_assessment", "suggested_actions", "confidence", "evidence", "reasoning_chain", "alternative_hypotheses", "hallucination_disclaimer"],
          "additionalProperties": false
        }
        """;
}
