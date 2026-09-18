namespace AiObservability.Api.Data;

using Models;

public static class SeedRunbooks
{
    public static List<Runbook> Get() =>
    [
        new("rb-001", "High 5xx Error Rate on API Services", "Availability", ["Checkout API High Error Rate"], ["checkout-api", "api-gateway"], "Sev0 – Sev1", 20,
            "Runbook for handling elevated HTTP 5xx error rates on any backend API service.",
            [
                new(1, "Check App Insights Live Metrics for current error rate and affected endpoints."),
                new(2, "Identify the failing dependency using the App Insights Dependency Map."),
                new(3, "Check Grafana dashboard \"Service Health\" for downstream health status."),
                new(4, "If circuit breaker is open, check circuit breaker dashboard and reset if safe.", "kubectl exec -n production deploy/checkout-api -- curl -X POST /actuator/circuitbreaker/reset"),
                new(5, "If caused by a recent deployment, initiate rollback.", "az pipelines run --name rollback-checkout-api --parameters version=previous"),
                new(6, "Scale the affected service to x3 replicas.", "kubectl scale deploy/checkout-api -n production --replicas=6"),
            ], "If not resolved in 15 minutes, escalate to service owner.", "2026-04-12"),
        new("rb-002", "Database Connection Pool Exhaustion", "Performance", ["SQL DTU High Utilisation", "Auth Service High Latency"], ["auth-service", "orders-db"], "Sev1 – Sev2", 30,
            "Steps for resolving connection pool exhaustion causing slow queries or timeouts.",
            [
                new(1, "Check SQL Insights in Azure Portal for blocking queries."),
                new(2, "Identify blocking processes via Log Analytics.", "AzureDiagnostics | where Category == 'SQLInsights' | where blocked_process_report_s != ''"),
                new(3, "Kill the blocking query if safe.", "KILL <spid>", "Confirm the spid is not a critical transaction before killing."),
                new(4, "Redirect analytics workloads to the read replica.", "kubectl set env deploy/analytics-api DB_HOST=sql-readonly.internal"),
            ], "If blocking cannot be identified, escalate to DBA on-call.", "2026-03-28"),
        new("rb-003", "Kubernetes Pod OOMKill / Memory Leak", "Infrastructure", ["AKS Pod OOMKill", "AKS Pod Memory Threshold"], ["payment-gateway", "aks-prod"], "Sev2 – Sev3", 45,
            "Response procedure for pods being OOMKilled due to memory leaks.",
            [
                new(1, "Confirm OOMKill events in Grafana \"AKS Container Memory\" dashboard."),
                new(2, "Check memory growth pattern.", "kubectl top pods -n production --sort-by=memory"),
                new(3, "Increase memory limit to buy investigation time.", "kubectl patch deploy/payment-gateway -n production -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"payment-gateway\",\"resources\":{\"limits\":{\"memory\":\"2Gi\"}}}]}}}}'"),
            ], "If heap dump is unavailable, escalate to platform team for live memory profiling.", "2026-03-15"),
        new("rb-004", "Kafka Consumer Lag Spike", "Messaging", ["Kafka Consumer Lag High"], ["order-processor", "kafka"], "Sev1 – Sev2", 25,
            "Procedure for handling excessive consumer group lag on Kafka topics.",
            [
                new(1, "Check current lag in Grafana \"Kafka Consumer Lag\" panel."),
                new(2, "Determine if lag is growing (producer spike) or steady (consumer slow).", "kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group order-processor-v2"),
                new(3, "Scale consumers.", "kubectl scale deploy/order-processor -n production --replicas=9"),
            ], "If lag exceeds 200,000 messages, escalate to messaging platform team.", "2026-05-01"),
        new("rb-005", "TLS Certificate Expiry", "Security", ["TLS Certificate Expiry Warning"], ["api-gateway", "cert-manager"], "Sev3", 15,
            "Steps to renew or force-rotate a TLS certificate approaching expiry.",
            [
                new(1, "Identify the expiring certificate.", "kubectl get certificates -n production"),
                new(2, "Check cert-manager logs for renewal failures.", "kubectl logs -n cert-manager deploy/cert-manager --tail=100 | grep ERROR"),
                new(3, "Force re-issue by deleting the CertificateRequest.", "kubectl delete certificaterequest -n production <name>"),
            ], "If cert-manager cannot renew within 24 hours of expiry, contact security team.", "2026-02-20"),
    ];
}
