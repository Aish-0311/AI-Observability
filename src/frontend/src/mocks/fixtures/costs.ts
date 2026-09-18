export interface CostDataPoint { date: string; total_usd: number; log_analytics_usd: number; grafana_usd: number; prometheus_usd: number; metrics_api_usd: number; }
export interface IncidentCost { incident_id: string; title: string; severity: string; fired_at: string; log_analytics_queries: number; log_analytics_gb_scanned: number; metrics_api_calls: number; prometheus_queries: number; grafana_api_calls: number; estimated_cost_usd: number; cost_notes: string[]; }
export interface CostBySource { source: string; usd: number; pct: number; queries: number; }
export interface CostsData { period_days: number; total_usd: number; avg_per_incident_usd: number; total_gb_scanned: number; total_api_calls: number; trend: CostDataPoint[]; by_source: CostBySource[]; top_incidents: IncidentCost[]; }

const bd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

export const costsData: CostsData = {
  period_days: 30, total_usd: 127.43, avg_per_incident_usd: 2.71, total_gb_scanned: 284.7, total_api_calls: 3842,
  trend: [
    { date: bd(14), total_usd: 3.2,  log_analytics_usd: 1.8,  grafana_usd: 0.6,  prometheus_usd: 0.5,  metrics_api_usd: 0.3  },
    { date: bd(12), total_usd: 5.1,  log_analytics_usd: 2.9,  grafana_usd: 0.9,  prometheus_usd: 0.8,  metrics_api_usd: 0.5  },
    { date: bd(10), total_usd: 7.4,  log_analytics_usd: 4.1,  grafana_usd: 1.4,  prometheus_usd: 1.2,  metrics_api_usd: 0.7  },
    { date: bd(8),  total_usd: 4.2,  log_analytics_usd: 2.4,  grafana_usd: 0.8,  prometheus_usd: 0.6,  metrics_api_usd: 0.4  },
    { date: bd(6),  total_usd: 9.2,  log_analytics_usd: 5.2,  grafana_usd: 1.8,  prometheus_usd: 1.4,  metrics_api_usd: 0.8  },
    { date: bd(4),  total_usd: 5.6,  log_analytics_usd: 3.1,  grafana_usd: 1.1,  prometheus_usd: 0.9,  metrics_api_usd: 0.5  },
    { date: bd(2),  total_usd: 8.3,  log_analytics_usd: 4.7,  grafana_usd: 1.6,  prometheus_usd: 1.3,  metrics_api_usd: 0.7  },
    { date: bd(0),  total_usd: 6.6,  log_analytics_usd: 3.7,  grafana_usd: 1.3,  prometheus_usd: 1.0,  metrics_api_usd: 0.6  },
  ],
  by_source: [
    { source: 'Log Analytics', usd: 72.4,  pct: 56.8, queries: 1842 },
    { source: 'Grafana',       usd: 26.1,  pct: 20.5, queries: 612  },
    { source: 'Prometheus',    usd: 19.8,  pct: 15.5, queries: 290  },
    { source: 'Metrics API',   usd: 9.13,  pct: 7.2,  queries: 1098 },
  ],
  top_incidents: [
    { incident_id: 'INC-2026-001', title: 'Checkout API 5xx spike', severity: 'Sev0', fired_at: ago(0.8), log_analytics_queries: 12, log_analytics_gb_scanned: 3.8, metrics_api_calls: 24, prometheus_queries: 8, grafana_api_calls: 6, estimated_cost_usd: 8.42, cost_notes: ['High GB scan due to wide time window'] },
    { incident_id: 'INC-2026-003', title: 'Kafka consumer lag spike', severity: 'Sev1', fired_at: ago(5.4), log_analytics_queries: 10, log_analytics_gb_scanned: 2.9, metrics_api_calls: 18, prometheus_queries: 14, grafana_api_calls: 8, estimated_cost_usd: 7.18, cost_notes: [] },
    { incident_id: 'INC-2026-002', title: 'Auth-service latency p95 > 4s', severity: 'Sev1', fired_at: ago(3), log_analytics_queries: 8, log_analytics_gb_scanned: 2.1, metrics_api_calls: 16, prometheus_queries: 4, grafana_api_calls: 3, estimated_cost_usd: 4.71, cost_notes: [] },
  ],
};
