"""Tests for the Signal Aggregator — alert parsing logic."""

from app.agents.signal_aggregator import _parse_alert


def test_parse_alert_extracts_fields(sample_alert_payload):
    parsed = _parse_alert(sample_alert_payload)

    assert parsed["alert_id"].endswith("alert-456")
    assert parsed["severity"] == "Sev1"
    assert parsed["fired_at"] == "2026-04-28T10:30:00Z"
    assert "auth-service" in parsed["resource_name"]
    assert parsed["resource_type"] == "Microsoft.Web/sites"
    assert parsed["alert_rule_name"] == "High Error Rate - Auth Service"
    assert parsed["description"].startswith("HTTP 5xx")
    assert parsed["raw"] is sample_alert_payload


def test_parse_alert_handles_missing_fields():
    parsed = _parse_alert({"data": {"essentials": {}}})

    assert parsed["severity"] == "Sev3"  # default
    assert parsed["resource_id"] == ""
    assert parsed["resource_name"] == ""
