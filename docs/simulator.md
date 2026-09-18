ai-observability-poc % curl -X POST "https://ai-obs-poc-app.lemonbush-412008ac.swedencentral.azurecontainerapps.io/debug/run-pipeline" \
  -H "Content-Type: application/json" \
  -d '{
  "schemaId": "azureMonitorCommonAlertSchema",
  "data": {
    "essentials": {
      "alertId": "/subscriptions/test/providers/Microsoft.AlertsManagement/alerts/test-001",
      "alertRule": "High Error Rate - Dummy App",
      "severity": "Sev1",
      "signalType": "Metric",
      "monitorCondition": "Fired",
      "monitoringService": "Platform",
      "alertTargetIDs": ["/subscriptions/460f03f9-7919-430a-a6d7-866bb372fe95/resourceGroups/Ai-Observability/providers/Microsoft.App/containerApps/ca-dummy-target"],
      "firedDateTime": "2026-05-13T12:00:00Z",
      "description": "Error rate exceeded 10% on the dummy target application"
    },
    "alertContext": {
      "condition": {
        "allOf": [{"metricName": "Http5xx", "metricValue": 45, "threshold": 10, "operator": "GreaterThan"}]
      }
    }
  }
}'