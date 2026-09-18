export interface RunbookStep { order: number; action: string; command?: string; note?: string; }
export interface Runbook { id: string; title: string; category: string; alert_rules: string[]; services: string[]; severity_range: string; estimated_resolution_minutes: number; summary: string; steps: RunbookStep[]; escalation: string; last_updated: string; }

export const runbooks: Runbook[] = [
  { id: 'rb-001', title: 'High 5xx Error Rate on API Services', category: 'Availability', alert_rules: ['Checkout API High Error Rate'], services: ['checkout-api', 'api-gateway'], severity_range: 'Sev0 – Sev1', estimated_resolution_minutes: 20, summary: 'Runbook for handling elevated HTTP 5xx error rates on any backend API service.',
    steps: [
      { order: 1, action: 'Check App Insights Live Metrics for current error rate and affected endpoints.' },
      { order: 2, action: 'Identify the failing dependency using the App Insights Dependency Map.' },
      { order: 3, action: 'Check Grafana dashboard "Service Health" for downstream health status.' },
      { order: 4, action: 'If circuit breaker is open, check circuit breaker dashboard and reset if safe.', command: 'kubectl exec -n production deploy/checkout-api -- curl -X POST /actuator/circuitbreaker/reset' },
      { order: 5, action: 'If caused by a recent deployment, initiate rollback.', command: 'az pipelines run --name rollback-checkout-api --parameters version=previous' },
      { order: 6, action: 'Scale the affected service to x3 replicas.', command: 'kubectl scale deploy/checkout-api -n production --replicas=6' },
    ], escalation: 'If not resolved in 15 minutes, escalate to service owner.', last_updated: '2026-04-12' },
  { id: 'rb-002', title: 'Database Connection Pool Exhaustion', category: 'Performance', alert_rules: ['SQL DTU High Utilisation', 'Auth Service High Latency'], services: ['auth-service', 'orders-db'], severity_range: 'Sev1 – Sev2', estimated_resolution_minutes: 30, summary: 'Steps for resolving connection pool exhaustion causing slow queries or timeouts.',
    steps: [
      { order: 1, action: 'Check SQL Insights in Azure Portal for blocking queries.' },
      { order: 2, action: 'Identify blocking processes via Log Analytics.', command: "AzureDiagnostics | where Category == 'SQLInsights' | where blocked_process_report_s != ''" },
      { order: 3, action: 'Kill the blocking query if safe.', command: 'KILL <spid>', note: 'Confirm the spid is not a critical transaction before killing.' },
      { order: 4, action: 'Redirect analytics workloads to the read replica.', command: 'kubectl set env deploy/analytics-api DB_HOST=sql-readonly.internal' },
    ], escalation: 'If blocking cannot be identified, escalate to DBA on-call.', last_updated: '2026-03-28' },
  { id: 'rb-003', title: 'Kubernetes Pod OOMKill / Memory Leak', category: 'Infrastructure', alert_rules: ['AKS Pod OOMKill', 'AKS Pod Memory Threshold'], services: ['payment-gateway', 'aks-prod'], severity_range: 'Sev2 – Sev3', estimated_resolution_minutes: 45, summary: 'Response procedure for pods being OOMKilled due to memory leaks.',
    steps: [
      { order: 1, action: 'Confirm OOMKill events in Grafana "AKS Container Memory" dashboard.' },
      { order: 2, action: 'Check memory growth pattern.', command: 'kubectl top pods -n production --sort-by=memory' },
      { order: 3, action: 'Increase memory limit to buy investigation time.', command: "kubectl patch deploy/payment-gateway -n production -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"payment-gateway\",\"resources\":{\"limits\":{\"memory\":\"2Gi\"}}}]}}}}'"},
    ], escalation: 'If heap dump is unavailable, escalate to platform team for live memory profiling.', last_updated: '2026-03-15' },
  { id: 'rb-004', title: 'Kafka Consumer Lag Spike', category: 'Messaging', alert_rules: ['Kafka Consumer Lag High'], services: ['order-processor', 'kafka'], severity_range: 'Sev1 – Sev2', estimated_resolution_minutes: 25, summary: 'Procedure for handling excessive consumer group lag on Kafka topics.',
    steps: [
      { order: 1, action: 'Check current lag in Grafana "Kafka Consumer Lag" panel.' },
      { order: 2, action: 'Determine if lag is growing (producer spike) or steady (consumer slow).', command: 'kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group order-processor-v2' },
      { order: 3, action: 'Scale consumers.', command: 'kubectl scale deploy/order-processor -n production --replicas=9' },
    ], escalation: 'If lag exceeds 200,000 messages, escalate to messaging platform team.', last_updated: '2026-05-01' },
  { id: 'rb-005', title: 'TLS Certificate Expiry', category: 'Security', alert_rules: ['TLS Certificate Expiry Warning'], services: ['api-gateway', 'cert-manager'], severity_range: 'Sev3', estimated_resolution_minutes: 15, summary: 'Steps to renew or force-rotate a TLS certificate approaching expiry.',
    steps: [
      { order: 1, action: 'Identify the expiring certificate.', command: 'kubectl get certificates -n production' },
      { order: 2, action: 'Check cert-manager logs for renewal failures.', command: 'kubectl logs -n cert-manager deploy/cert-manager --tail=100 | grep ERROR' },
      { order: 3, action: 'Force re-issue by deleting the CertificateRequest.', command: 'kubectl delete certificaterequest -n production <name>' },
    ], escalation: 'If cert-manager cannot renew within 24 hours of expiry, contact security team.', last_updated: '2026-02-20' },
];
