namespace AiObservability.Api.Data;

using Models;

public static class SeedIncidents
{
    private static string Ago(int minutes) => DateTime.UtcNow.AddMinutes(-minutes).ToString("o");

    public static List<Incident> Get() =>
    [
        new(
            Id: "INC-2026-001",
            AlertId: "alert-001",
            Severity: AlertSeverity.Sev0,
            FiredAt: Ago(47),
            ResourceId: "/subscriptions/sub-prod/rg-ecom/checkout-api",
            ResourceName: "checkout-api",
            ResourceType: "Microsoft.Insights/components",
            ConditionType: "LogQueryBased",
            Description: "HTTP 5xx error rate exceeded 25% for 5 consecutive minutes.",
            AlertRuleName: "Checkout API High Error Rate",
            Source: AlertSource.AppInsights,
            Status: AlertStatus.firing,
            IncidentId: "INC-2026-001",
            GithubIssueUrl: "https://github.com/contoso/aiops-platform/issues/142",
            Rca: new(
                Summary: "The checkout-api service is failing due to connection timeout misconfiguration introduced in payment-gateway v3.2.0. The new connection pool settings reduce the max timeout from 30s to 2s, causing cascading failures under moderate load.",
                LikelyCause: "payment-gateway v3.2.0 connection timeout misconfiguration (MaxConnectionTimeout: 2000ms vs required 30000ms)",
                SeverityAssessment: "Critical — checkout flow is completely unavailable, impacting all active users and revenue.",
                Confidence: 0.91,
                SuggestedActions: [
                    new(1, "Roll back payment-gateway to v3.1.9", "immediate"),
                    new(2, "Scale checkout-api to 6 replicas to absorb backlog", "immediate"),
                    new(3, "Reset circuit breaker on checkout-api", "short_term"),
                    new(4, "Review connection pool configuration in v3.2.0 release notes", "short_term"),
                    new(5, "Add integration test for connection timeout configuration", "long_term"),
                ],
                Evidence: [
                    new("ev-001-1", "App Insights", "error_rate", 0.97, "{\"metric\":\"requests/failed\",\"value\":0.27,\"threshold\":0.25,\"window_minutes\":5}", "27% of requests returning 5xx — above 25% threshold"),
                    new("ev-001-2", "App Insights", "dependency_failure", 0.95, "{\"dependency\":\"payment-gateway\",\"failure_rate\":0.94,\"avg_duration_ms\":2041}", "94% dependency call failure rate to payment-gateway"),
                    new("ev-001-3", "Grafana", "metric", 0.89, "{\"metric\":\"connection_pool_timeout_total\",\"service\":\"payment-gateway\",\"value\":1842,\"rate_per_min\":368}", "Connection pool timeouts spiking at 368/min on payment-gateway"),
                    new("ev-001-4", "App Insights", "trace", 0.88, "{\"operation\":\"POST /checkout/submit\",\"duration_ms\":2041,\"result_code\":\"502\",\"exception\":\"TaskCanceledException: The operation was canceled\"}", "All failing traces show TaskCanceledException at 2041ms"),
                    new("ev-001-5", "Log Analytics", "log", 0.82, "{\"message\":\"Connection timeout after 2000ms\",\"service\":\"payment-gateway\",\"version\":\"3.2.0\",\"count_last_5min\":1247}", "1,247 timeout log entries in last 5 min pointing to v3.2.0"),
                ],
                ReasoningChain: [
                    new(1, "Alert fired: 5xx error rate at 27% on checkout-api"),
                    new(2, "Dependency map shows 94% failure rate on calls to payment-gateway"),
                    new(3, "Failure duration consistently ~2041ms — matches a 2s timeout, not a 30s one"),
                    new(4, "payment-gateway logs show \"Connection timeout after 2000ms\" — version 3.2.0"),
                    new(5, "Deployment history shows payment-gateway v3.2.0 was deployed 53 minutes ago"),
                    new(6, "Git diff for v3.2.0 shows MaxConnectionTimeout changed from 30000 to 2000"),
                    new(7, "Conclusion: misconfiguration in v3.2.0 is root cause; rollback is remediation"),
                ],
                AlternativeHypotheses: [
                    new("Stripe API upstream degradation", 0.08, "Stripe status page shows no incidents; failure pattern is internal"),
                    new("Database connection exhaustion", 0.03, "orders-db connection count is normal; failing calls never reach DB"),
                ],
                HallucinationDisclaimer: "Analysis based on correlated signals. Verify git diff for v3.2.0 before rollback."
            ),
            Enrichment: new(
                SimilarPastIncidents: [
                    new("HIST-2025-041", "Payment gateway timeout — v2.8.0 regression", 0.87, "Rolled back to v2.7.3; added regression test", "2025-09-14T11:20:00Z"),
                ],
                SuspectCommits: [
                    new("a4f8c21", "james.chen", "perf: reduce connection pool timeout for faster failover", Ago(65), 0.96, ["src/config/ConnectionPoolConfig.cs"]),
                    new("b2d19e7", "james.chen", "chore: bump payment-gateway to v3.2.0", Ago(70), 0.71, ["helm/payment-gateway/values.yaml"]),
                ]
            )
        ),
        new(
            Id: "INC-2026-002",
            AlertId: "alert-003",
            Severity: AlertSeverity.Sev1,
            FiredAt: Ago(180),
            ResourceId: "/subscriptions/sub-prod/rg-auth/auth-service",
            ResourceName: "auth-service",
            ResourceType: "Microsoft.Insights/components",
            ConditionType: "Metric",
            Description: "p95 response latency exceeded 4000ms for auth-service.",
            AlertRuleName: "Auth Service High Latency",
            Source: AlertSource.AppInsights,
            Status: AlertStatus.resolved,
            IncidentId: "INC-2026-002",
            GithubIssueUrl: "https://github.com/contoso/aiops-platform/issues/141",
            Rca: new(
                Summary: "An unindexed analytics query introduced in a recent deployment was acquiring a shared lock on dbo.Users, blocking all auth token validations that require user lookups.",
                LikelyCause: "Unindexed full table scan on dbo.Users holding a shared read lock, blocking auth queries",
                SeverityAssessment: "High — login and token refresh degraded for all users; not a complete outage but severe latency.",
                Confidence: 0.87,
                SuggestedActions: [
                    new(1, "Terminate blocking spid identified in SQL Insights", "immediate"),
                    new(2, "Redirect analytics workloads to read replica", "immediate"),
                    new(3, "Add index on dbo.Users(created_at, tenant_id) for analytics query", "short_term"),
                    new(4, "Set query timeout of 5s on analytics service connections", "short_term"),
                ],
                Evidence: [
                    new("ev-002-1", "App Insights", "latency", 0.96, "{\"operation\":\"POST /auth/token\",\"p95_ms\":4821,\"p50_ms\":3102,\"threshold_ms\":4000}", "p95 latency at 4821ms, p50 also elevated to 3102ms"),
                    new("ev-002-2", "Log Analytics", "log", 0.93, "{\"query\":\"AzureDiagnostics | where Category == 'SQLInsights'\",\"blocking_spid\":57,\"blocked_spids\":[12,18,23,31,42],\"wait_type\":\"LCK_M_S\"}", "SQL Insights shows spid 57 blocking 5 auth queries with shared lock"),
                    new("ev-002-3", "App Insights", "dependency_failure", 0.88, "{\"dependency\":\"users-db\",\"avg_duration_ms\":4200,\"slow_query_pct\":0.82}", "82% of users-db queries taking >4s"),
                    new("ev-002-4", "Grafana", "metric", 0.79, "{\"metric\":\"sql_dtu_percent\",\"database\":\"users-db\",\"value\":91,\"baseline\":23}", "Users DB DTU at 91% vs 23% baseline"),
                ],
                ReasoningChain: [
                    new(1, "p95 latency alert fired on auth-service at 4821ms"),
                    new(2, "Dependency trace shows slowdown is isolated to users-db queries"),
                    new(3, "SQL Insights shows blocking chain: spid 57 holding LCK_M_S on dbo.Users"),
                    new(4, "spid 57 belongs to analytics-api; query is full table scan (no index)"),
                    new(5, "Analytics query added 4 hours ago — correlates with latency onset"),
                ],
                AlternativeHypotheses: [
                    new("Redis cache miss causing fallback to DB for every request", 0.11, "Redis hit rate is normal at 94%; cache is not the bottleneck"),
                ],
                HallucinationDisclaimer: "SQL blocking data is from Log Analytics diagnostic logs; confirm spid before killing."
            ),
            Enrichment: new(
                SimilarPastIncidents: [
                    new("HIST-2025-019", "Users DB lock contention from reporting job", 0.81, "Moved report to read replica; added query hints", "2025-06-02T08:45:00Z"),
                ],
                SuspectCommits: [
                    new("c9e34f1", "priya.sharma", "feat: add user cohort analytics endpoint", Ago(245), 0.89, ["src/analytics/UserCohortService.cs", "src/analytics/queries/UserCohortQuery.sql"]),
                ]
            )
        ),
        new(
            Id: "INC-2026-003",
            AlertId: "alert-004",
            Severity: AlertSeverity.Sev1,
            FiredAt: Ago(320),
            ResourceId: "/subscriptions/sub-prod/rg-messaging/aiops-kafka",
            ResourceName: "orders-processed-consumer",
            ResourceType: "Kafka/ConsumerGroup",
            ConditionType: "Metric",
            Description: "Consumer group lag exceeded 50,000 messages.",
            AlertRuleName: "Kafka Consumer Lag High",
            Source: AlertSource.Grafana,
            Status: AlertStatus.firing,
            IncidentId: "INC-2026-003",
            Rca: new(
                Summary: "The order-processor consumer group is falling behind due to a slow external inventory API call added in the latest deployment. Each message now takes ~850ms to process vs the previous ~120ms, causing rapid lag accumulation.",
                LikelyCause: "Synchronous inventory-api call in order processing hot path — p99 latency 850ms, no timeout configured",
                SeverityAssessment: "High — order fulfilment pipeline is backed up; SLA breach expected in 45 minutes.",
                Confidence: 0.83,
                SuggestedActions: [
                    new(1, "Scale order-processor consumers to 9 replicas", "immediate"),
                    new(2, "Add circuit breaker with 200ms timeout on inventory-api calls", "immediate"),
                    new(3, "Move inventory check to async enrichment step", "short_term"),
                    new(4, "Add consumer lag SLA alert at 10,000 messages", "long_term"),
                ],
                Evidence: [
                    new("ev-003-1", "Grafana", "metric", 0.95, "{\"metric\":\"kafka_consumer_group_lag\",\"group\":\"order-processor-v2\",\"topic\":\"orders\",\"lag\":67420,\"rate_per_min\":1840}", "Lag at 67,420 and growing at 1,840 messages/min"),
                    new("ev-003-2", "App Insights", "dependency_failure", 0.91, "{\"dependency\":\"inventory-api\",\"avg_duration_ms\":847,\"p99_ms\":1203,\"timeout_configured\":false}", "inventory-api averaging 847ms with no timeout — new dependency"),
                    new("ev-003-3", "Grafana", "metric", 0.85, "{\"metric\":\"consumer_message_process_time_ms\",\"p50\":847,\"previous_p50\":121,\"delta_pct\":600}", "Message processing time 6x slower after last deploy"),
                    new("ev-003-4", "Log Analytics", "log", 0.78, "{\"message\":\"Calling inventory service for order enrichment\",\"count_per_min\":2100,\"avg_latency_ms\":832}", "2,100 synchronous inventory calls/min observed in logs"),
                ],
                ReasoningChain: [
                    new(1, "Consumer lag alert at 50k messages; growing trend confirmed"),
                    new(2, "Consumer processing rate dropped from 2,100/min to 360/min"),
                    new(3, "Message processing time jumped from 121ms to 847ms after deploy"),
                    new(4, "New dependency: inventory-api called synchronously in hot path"),
                    new(5, "inventory-api has no timeout configured — potential for unbounded waits"),
                ],
                AlternativeHypotheses: [
                    new("Kafka partition rebalance causing consumer pause", 0.15, "Rebalance events are not present in consumer group describe output"),
                    new("orders-db write contention causing slow consumers", 0.07, "orders-db DTU is normal at 34%"),
                ],
                HallucinationDisclaimer: "Processing time comparison uses rolling 30-min window; verify deployment timestamps."
            ),
            Enrichment: new(
                SimilarPastIncidents: [],
                SuspectCommits: [
                    new("d1a82c3", "liu.wei", "feat: enrich orders with inventory availability status", Ago(380), 0.92, ["src/order-processor/OrderEnrichmentService.java", "src/order-processor/config/InventoryApiClient.java"]),
                ]
            )
        ),
        new(
            Id: "INC-2026-004",
            AlertId: "alert-005",
            Severity: AlertSeverity.Sev2,
            FiredAt: Ago(360),
            ResourceId: "/subscriptions/sub-prod/rg-payments/aks-prod",
            ResourceName: "payment-gateway",
            ResourceType: "Microsoft.ContainerService/managedClusters",
            ConditionType: "Metric",
            Description: "payment-gateway pod OOMKilled — second occurrence in 4 hours.",
            AlertRuleName: "AKS Pod OOMKill",
            Source: AlertSource.Grafana,
            Status: AlertStatus.firing,
            IncidentId: "INC-2026-004",
            GithubIssueUrl: "https://github.com/contoso/aiops-platform/issues/138",
            Rca: new(
                Summary: "The payment-gateway service is experiencing a memory leak caused by HttpClient instances not being disposed after use, leading to socket exhaustion and eventual OOMKill. Memory grows linearly ~80MB/hour until pod restart.",
                LikelyCause: "Undisposed HttpClient instances accumulating in memory — missing using() or IHttpClientFactory pattern",
                SeverityAssessment: "Medium — payments are degraded during OOMKill restart windows (~45s each); risk of data loss is low.",
                Confidence: 0.84,
                SuggestedActions: [
                    new(1, "Increase memory limit to 2Gi to buy investigation time", "immediate"),
                    new(2, "Replace new HttpClient() with IHttpClientFactory injection", "short_term"),
                    new(3, "Add memory leak test using dotMemory in CI pipeline", "long_term"),
                ],
                Evidence: [
                    new("ev-004-1", "Grafana", "metric", 0.94, "{\"metric\":\"container_memory_usage_bytes\",\"pod\":\"payment-gateway\",\"current_mb\":1843,\"limit_mb\":2048,\"growth_mb_per_hour\":82}", "Memory growing linearly at 82MB/hr; at limit within ~3h"),
                    new("ev-004-2", "App Insights", "trace", 0.88, "{\"exception\":\"OutOfMemoryException\",\"stack\":\"PaymentService.ProcessCharge → HttpClient.SendAsync\",\"count_1h\":3}", "OOM exceptions traced to HttpClient.SendAsync in PaymentService"),
                    new("ev-004-3", "Grafana", "metric", 0.83, "{\"metric\":\"dotnet_gc_heap_size_bytes\",\"gen2_mb\":1621,\"gen2_previous_mb\":240,\"gen2_collections\":2}", "Gen2 heap at 1.6GB — objects surviving GC collection"),
                    new("ev-004-4", "Log Analytics", "log", 0.76, "{\"message\":\"OOMKill event\",\"pod\":\"payment-gateway-7d9f4b-xk2p\",\"occurrences_4h\":2,\"last_restart\":{\"ago_minutes\":47}}", "2 OOMKill events in 4 hours; restarting every ~2 hours"),
                ],
                ReasoningChain: [
                    new(1, "OOMKill event on payment-gateway — second in 4 hours"),
                    new(2, "Memory growth is linear at 82MB/hr — characteristic of a leak, not a spike"),
                    new(3, "Gen2 GC heap at 1.6GB — large objects not being collected"),
                    new(4, "Stack traces show HttpClient accumulation in PaymentService"),
                    new(5, "Code review shows new HttpClient() called per transaction in ProcessCharge"),
                ],
                AlternativeHypotheses: [
                    new("Memory pressure from high concurrent request volume", 0.12, "Request rate is normal; memory growth persists at low traffic"),
                ],
                HallucinationDisclaimer: "Heap dump required to confirm undisposed HttpClient objects; analysis is probabilistic."
            ),
            Enrichment: new(
                SimilarPastIncidents: [
                    new("HIST-2025-033", "Notification service OOM — undisposed streams", 0.76, "Wrapped all IDisposable in using statements", "2025-08-21T15:30:00Z"),
                ],
                SuspectCommits: [
                    new("e5b71d9", "alex.novak", "feat: add 3D Secure v2 challenge flow", Ago(420), 0.88, ["src/PaymentService.cs", "src/ThreeDSecureClient.cs"]),
                ]
            )
        ),
        new(
            Id: "INC-2026-005",
            AlertId: "alert-006",
            Severity: AlertSeverity.Sev2,
            FiredAt: Ago(722),
            ResourceId: "/subscriptions/sub-prod/rg-aks/aks-prod-westeu",
            ResourceName: "aks-prod-westeu",
            ResourceType: "Microsoft.ContainerService/managedClusters",
            ConditionType: "Metric",
            Description: "Node CPU utilization above 90% on 3/5 nodes.",
            AlertRuleName: "AKS Node CPU Saturation",
            Source: AlertSource.Grafana,
            Status: AlertStatus.resolved,
            IncidentId: "INC-2026-005",
            Rca: new(
                Summary: "A batch ML model retraining job was scheduled without CPU resource limits, consuming 14.2 vCPUs across 3 nodes and starving production workloads.",
                LikelyCause: "ML batch job (model-retraining-v4) running without CPU limits on production cluster nodes",
                SeverityAssessment: "Medium — production latency increased 3x during saturation window; no data loss.",
                Confidence: 0.79,
                SuggestedActions: [
                    new(1, "Terminate model-retraining-v4 batch job", "immediate"),
                    new(2, "Add CPU/memory limits to all batch job definitions", "short_term"),
                    new(3, "Move batch workloads to dedicated node pool with taints", "long_term"),
                ],
                Evidence: [
                    new("ev-005-1", "Grafana", "metric", 0.93, "{\"metric\":\"node_cpu_utilization\",\"nodes_above_90pct\":3,\"total_nodes\":5,\"peak_vcpus_consumed\":14.2}", "3/5 nodes above 90% CPU; 14.2 vCPUs consumed by single job"),
                    new("ev-005-2", "Grafana", "metric", 0.87, "{\"top_cpu_consumer\":\"model-retraining-v4\",\"vcpus\":14.2,\"limits\":\"none\",\"namespace\":\"ml-jobs\"}", "model-retraining-v4 consuming 14.2 vCPUs with no limits set"),
                    new("ev-005-3", "App Insights", "latency", 0.81, "{\"service\":\"api-gateway\",\"p95_ms\":2841,\"baseline_p95_ms\":890,\"correlation_with_cpu_spike\":\"confirmed\"}", "API gateway p95 latency 3x baseline during CPU saturation"),
                ],
                ReasoningChain: [
                    new(1, "Node CPU alert on 3/5 AKS nodes in westeu cluster"),
                    new(2, "kubectl top pods shows model-retraining-v4 at 14.2 vCPUs"),
                    new(3, "Job definition has no CPU limits — will consume any available capacity"),
                    new(4, "Job started at same time as CPU spike — scheduled 12:00 UTC daily cron"),
                    new(5, "Terminating job restores node CPU to baseline within 90 seconds"),
                ],
                AlternativeHypotheses: [
                    new("DDoS causing increased request volume", 0.06, "Ingress request rate is normal; load balancer shows no spike"),
                ],
                HallucinationDisclaimer: "Verification: run kubectl top nodes after job termination to confirm recovery."
            ),
            Enrichment: new(
                SimilarPastIncidents: [],
                SuspectCommits: [
                    new("f3c28a5", "ml-bot", "chore: schedule model-retraining-v4 daily cron", Ago(1100), 0.74, ["helm/ml-jobs/cronjobs.yaml"]),
                ]
            )
        ),
    ];
}
