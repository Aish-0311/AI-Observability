"""Tests for the Knowledge Enricher — past incident matching logic."""

from app.agents.knowledge_enricher import _find_similar


def test_find_similar_matches_keywords():
    incidents = [
        {"summary": "Auth service 500 errors", "cause": "JWT config error"},
        {"summary": "Database connection pool exhaustion", "cause": "Pool size too small"},
        {"summary": "Memory leak in payment gateway", "cause": "Unclosed sessions"},
    ]

    # Should match "Auth service" incidents
    similar = _find_similar(incidents, "Auth service returning 500 errors after deployment")
    assert len(similar) >= 1
    assert "Auth" in similar[0]["summary"] or "500" in similar[0]["summary"]


def test_find_similar_returns_empty_for_no_match():
    incidents = [
        {"summary": "Database issue", "cause": "Pool exhaustion"},
    ]
    similar = _find_similar(incidents, "xyz")
    assert similar == []


def test_find_similar_handles_empty_summary():
    incidents = [{"summary": "Something", "cause": "thing"}]
    assert _find_similar(incidents, "") == []
