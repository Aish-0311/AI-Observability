"""Tests for the GitHub Issue Creator — body formatting logic."""

from app.agents.github_issue_creator import _build_issue_body, _severity_label


def test_build_issue_body_contains_key_sections(
    sample_alert_payload, sample_correlated_signals
):
    state = {
        "alert_payload": {
            "alert_rule_name": "High Error Rate - Auth Service",
            "severity": "Sev1",
            "fired_at": "2026-04-28T10:30:00Z",
            "resource_name": "auth-service",
            "resource_type": "Microsoft.Web/sites",
            "description": "HTTP 5xx error rate exceeded 5%",
            "raw": sample_alert_payload,
        },
        "correlated_signals": sample_correlated_signals,
        "root_cause_analysis": {
            "summary": "Auth service is failing due to a dependency outage.",
            "likely_cause": "Azure AD endpoint returning 503 errors.",
            "severity_assessment": "High",
            "suggested_actions": ["Check Azure AD status page", "Enable fallback auth"],
            "confidence": 0.85,
        },
        "enrichment_context": {
            "similar_past_incidents": [
                {
                    "title": "Auth service 500 errors after deployment",
                    "date": "2025-12-15",
                    "cause": "JWT config error",
                }
            ],
            "recent_commits": [],
            "suspect_commits": [
                {
                    "sha": "abc12345",
                    "message": "Update auth config",
                    "author": "dev",
                    "url": "https://github.com/org/repo/commit/abc12345",
                }
            ],
        },
    }

    body = _build_issue_body(state)

    # Key sections present
    assert "Incident Report" in body
    assert "High Error Rate - Auth Service" in body
    assert "Root Cause Analysis" in body
    assert "Azure AD endpoint returning 503" in body
    assert "Correlated Signals" in body
    assert "NullReferenceException" in body
    assert "Suggested Actions" in body
    assert "Check Azure AD status page" in body
    assert "Suspect Commits" in body
    assert "abc12345" in body
    assert "Similar Past Incidents" in body
    assert "85%" in body  # confidence


def test_severity_label_mapping():
    assert _severity_label("Sev0") == "critical"
    assert _severity_label("Sev1") == "high"
    assert _severity_label("Sev2") == "medium"
    assert _severity_label("Sev3") == "low"
    assert _severity_label("Sev4") == "informational"
    assert _severity_label("unknown") == "incident"
