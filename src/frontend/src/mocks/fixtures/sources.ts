import type { SourceIntegration } from '@/types/sources';

const now = new Date();
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const sources: SourceIntegration[] = [
  { id: 'app-insights', name: 'Azure Application Insights', kind: 'app-insights', health: 'healthy',  last_query_at: ago(2),  queries_24h: 1842, error_rate: 0.003, config: { workspace: 'aiops-prod-ai', subscription_id: '***-redacted-***', region: 'westeurope' } },
  { id: 'grafana',      name: 'Grafana Cloud',             kind: 'grafana',       health: 'healthy',  last_query_at: ago(5),  queries_24h: 612,  error_rate: 0.011, config: { instance_url: 'https://aiops.grafana.net', org_id: 12345 } },
  { id: 'prometheus',   name: 'Prometheus (AKS)',           kind: 'prometheus',    health: 'degraded', last_query_at: ago(18), queries_24h: 290,  error_rate: 0.087, config: { endpoint: 'http://prometheus.monitoring.svc:9090', scrape_interval: '30s' } },
  { id: 'github',       name: 'GitHub Issues',             kind: 'github',        health: 'healthy',  last_query_at: ago(60), queries_24h: 14,   error_rate: 0.0,   config: { org: 'contoso', repo: 'aiops-platform', issue_label: 'aiops-auto' } },
];
