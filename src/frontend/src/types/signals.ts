export interface CorrelatedSignals {
  exceptions?: Record<string, unknown>[];
  failed_requests?: Record<string, unknown>[];
  dependency_failures?: Record<string, unknown>[];
  metrics_snapshot?: Record<string, unknown[]>;
  traces?: Record<string, unknown>[];
  end_to_end_transactions?: Record<string, unknown>[];
  availability_results?: Record<string, unknown>[];
  performance_counters?: Record<string, unknown>[];
  prometheus_metrics?: Record<string, unknown[]>;
  grafana_annotations?: Record<string, unknown>[];
  grafana_firing_alerts?: Record<string, unknown>[];
  sources_queried?: string[];
  time_window_start?: string;
  time_window_end?: string;
}

export interface QueryCostEstimate {
  log_analytics_queries?: number;
  log_analytics_gb_scanned?: number;
  metrics_api_calls?: number;
  prometheus_queries?: number;
  grafana_api_calls?: number;
  estimated_cost_usd?: number;
  cost_notes?: string[];
}
