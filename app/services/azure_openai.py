"""Azure OpenAI client wrapper for structured root-cause analysis.

Enforces evidence-based reasoning, confidence scoring, and explicit
hallucination disclaimers to reduce the risk of speculative RCA output.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from app.config import settings

logger = logging.getLogger(__name__)

_token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default",
)

_client = AzureOpenAI(
    azure_endpoint=settings.azure_openai_endpoint,
    azure_ad_token_provider=_token_provider,
    api_version=settings.azure_openai_api_version,
)

# ---------------------------------------------------------------------------
# JSON-schema for structured output (root cause analysis with evidence)
# ---------------------------------------------------------------------------

_EVIDENCE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "source": {
            "type": "string",
            "description": "Data source: Log Analytics, Application Insights, Prometheus, Grafana, or Metrics API.",
        },
        "signal_type": {
            "type": "string",
            "description": "Kind of signal: exception, metric_spike, failed_dependency, trace_error, availability_failure, etc.",
        },
        "data": {
            "type": "string",
            "description": "JSON-stringified raw data point or summary extracted from the signal.",
        },
        "relevance": {
            "type": "string",
            "description": "Explain why this evidence supports the root cause conclusion.",
        },
    },
    "required": ["source", "signal_type", "data", "relevance"],
    "additionalProperties": False,
}

_RCA_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "root_cause_analysis",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "One-paragraph plain-English summary of the incident.",
                },
                "likely_cause": {
                    "type": "string",
                    "description": "Most probable root cause, citing specific evidence.",
                },
                "severity_assessment": {
                    "type": "string",
                    "description": "Impact severity: Critical / High / Medium / Low.",
                },
                "suggested_actions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Ordered list of recommended remediation steps.",
                },
                "confidence": {
                    "type": "number",
                    "description": (
                        "Confidence score 0–1. Set below 0.5 if evidence is thin. "
                        "Set 0.0 if you are purely speculating."
                    ),
                },
                "evidence": {
                    "type": "array",
                    "items": _EVIDENCE_SCHEMA,
                    "description": (
                        "Every claim MUST reference at least one piece of raw evidence "
                        "from the provided signals. Do NOT fabricate data."
                    ),
                },
                "reasoning_chain": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Step-by-step reasoning linking evidence to the conclusion.",
                },
                "alternative_hypotheses": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Other plausible causes that were considered but less likely.",
                },
                "hallucination_disclaimer": {
                    "type": "string",
                    "description": (
                        "A mandatory caveat stating which parts of the analysis "
                        "are uncertain and should be verified by an engineer."
                    ),
                },
            },
            "required": [
                "summary",
                "likely_cause",
                "severity_assessment",
                "suggested_actions",
                "confidence",
                "evidence",
                "reasoning_chain",
                "alternative_hypotheses",
                "hallucination_disclaimer",
            ],
            "additionalProperties": False,
        },
    },
}

SYSTEM_PROMPT = """\
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
"""


async def analyze_root_cause(
    alert_payload: dict,
    correlated_signals: dict,
    correlation: dict | None = None,
) -> dict:
    """Call Azure OpenAI with structured output to produce an evidence-based RCA."""
    user_content = json.dumps(
        {
            "alert": alert_payload,
            "correlation": correlation or {},
            "signals": correlated_signals,
        },
        indent=2,
        default=str,
    )

    response = _client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format=_RCA_SCHEMA,
        temperature=0.2,
        max_tokens=4096,
    )

    raw = response.choices[0].message.content
    logger.debug("LLM raw response: %s", raw)
    result = json.loads(raw)

    # Post-processing: flag low-confidence results
    confidence = result.get("confidence", 0)
    if confidence < 0.3:
        logger.warning(
            "Low-confidence RCA (%.2f) — evidence may be insufficient", confidence
        )
    if not result.get("evidence"):
        logger.warning("RCA returned with no evidence — possible hallucination")
        result["hallucination_disclaimer"] = (
            "WARNING: No raw evidence was cited. This analysis may be speculative. "
            + result.get("hallucination_disclaimer", "")
        )
        result["confidence"] = min(confidence, 0.2)

    return result
