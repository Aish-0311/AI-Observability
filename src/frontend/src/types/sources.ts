export type SourceKind = 'app-insights' | 'grafana' | 'prometheus' | 'github';
export type SourceHealth = 'healthy' | 'degraded' | 'incident' | 'unknown';

export interface SourceIntegration {
  id: string;
  name: string;
  kind: SourceKind;
  health: SourceHealth;
  last_query_at: string;
  queries_24h: number;
  error_rate: number;
  config: Record<string, string | number | boolean>;
  enabled?: boolean;
  coming_soon?: boolean;
}
