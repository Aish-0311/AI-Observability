"""Tests for the FastAPI webhook endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "AI Observability Platform" in resp.json()["service"]


def test_webhook_returns_202(client, sample_alert_payload):
    """The webhook should return 202 immediately (async processing)."""
    resp = client.post("/webhook/alert", json=sample_alert_payload)
    assert resp.status_code == 202
    assert resp.json()["status"] == "accepted"
