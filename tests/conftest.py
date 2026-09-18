"""Test fixtures — synthetic Azure Monitor alert payloads."""

import pytest


@pytest.fixture
def sample_alert_payload() -> dict:
    """Azure Monitor common alert schema sample payload."""
    return {
        "schemaId": "azureMonitorCommonAlertSchema",
        "data": {
            "essentials": {
                "alertId": "/subscriptions/sub-123/providers/Microsoft.AlertsManagement/alerts/alert-456",
                "alertRule": "High Error Rate - Auth Service",
                "severity": "Sev1",
                "signalType": "Metric",
                "monitorCondition": "Fired",
                "monitoringService": "Platform",
                "alertTargetIDs": [
                    "/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Web/sites/auth-service"
                ],
                "targetResourceType": "Microsoft.Web/sites",
                "originAlertId": "orig-789",
                "firedDateTime": "2026-04-28T10:30:00Z",
                "description": "HTTP 5xx error rate exceeded 5% threshold for auth-service.",
                "essentialsVersion": "1.0",
                "alertContextVersion": "1.0",
            },
            "alertContext": {
                "conditionType": "SingleResourceMultipleMetricCriteria",
                "condition": {
                    "allOf": [
                        {
                            "metricName": "Http5xx",
                            "metricValue": 142,
                            "threshold": 5,
                            "operator": "GreaterThan",
                        }
                    ]
                },
            },
        },
    }


@pytest.fixture
def sample_correlated_signals() -> dict:
    """Pre-built correlated signals for testing downstream agents."""
    return {
        "exceptions": [
            {
                "TimeGenerated": "2026-04-28T10:28:00Z",
                "ProblemId": "NullReferenceException at AuthController.ValidateToken",
                "ExceptionType": "System.NullReferenceException",
                "OuterMessage": "Object reference not set to an instance of an object",
                "InnermostMessage": "Token validation failed: issuer is null",
                "AppRoleName": "auth-service",
                "OperationId": "op-111",
            },
            {
                "TimeGenerated": "2026-04-28T10:29:15Z",
                "ProblemId": "NullReferenceException at AuthController.ValidateToken",
                "ExceptionType": "System.NullReferenceException",
                "OuterMessage": "Object reference not set to an instance of an object",
                "InnermostMessage": "Token validation failed: issuer is null",
                "AppRoleName": "auth-service",
                "OperationId": "op-222",
            },
        ],
        "failed_requests": [
            {
                "TimeGenerated": "2026-04-28T10:28:30Z",
                "Name": "POST /api/auth/validate",
                "ResultCode": "500",
                "DurationMs": "45",
                "AppRoleName": "auth-service",
                "OperationId": "op-111",
            },
        ],
        "dependency_failures": [
            {
                "TimeGenerated": "2026-04-28T10:28:25Z",
                "Name": "GET https://login.microsoftonline.com/.well-known/openid-configuration",
                "DependencyType": "HTTP",
                "ResultCode": "503",
                "DurationMs": "5023",
                "Target": "login.microsoftonline.com",
                "AppRoleName": "auth-service",
                "OperationId": "op-111",
            }
        ],
        "metrics_snapshot": {
            "Http5xx": [
                {"timestamp": "2026-04-28T10:25:00Z", "average": 2.0, "maximum": 5.0, "total": 10.0},
                {"timestamp": "2026-04-28T10:30:00Z", "average": 28.4, "maximum": 142.0, "total": 142.0},
            ],
            "Percentage CPU": [
                {"timestamp": "2026-04-28T10:25:00Z", "average": 35.0, "maximum": 42.0, "total": None},
                {"timestamp": "2026-04-28T10:30:00Z", "average": 78.0, "maximum": 95.0, "total": None},
            ],
        },
        "time_window_start": "2026-04-28T10:25:00+00:00",
        "time_window_end": "2026-04-28T10:35:00+00:00",
    }
