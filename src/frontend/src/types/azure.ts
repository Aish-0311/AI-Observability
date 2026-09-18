export interface AzureConnection {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  subscription_id: string;
  resource_group: string;
  app_insights_resource_name?: string;
  workspace_id?: string;
  region?: string;
}

export interface UserSettings {
  azure?: AzureConnection;
  last_validated_at?: string;
  last_validation_error?: string;
}

export interface PingResult {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

export type AzureResourceCategory =
  | 'compute' | 'web' | 'data' | 'ai' | 'messaging'
  | 'network' | 'storage' | 'monitoring' | 'other';

export type ResourceLayer = 'infra' | 'app';

export type NodeHealth = 'healthy' | 'degraded' | 'incident' | 'unknown';

export interface ServiceMapNode {
  id: string;
  label: string;
  type: string;
  category: AzureResourceCategory;
  region?: string;
  layer: ResourceLayer;
  health: NodeHealth;
  col: number;
  row: number;
  raw_id?: string;
  has_telemetry: boolean;
  properties_summary?: Record<string, string | number | boolean | null>;
}

export interface ServiceMapEdge {
  from: string;
  to: string;
  label?: string;
  calls?: number;
  failures?: number;
  avg_duration_ms?: number;
  edge_kind?: 'telemetry' | 'network';
}

export interface ServiceMapData {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  generated_at: string;
  resource_group?: string;
  subscription_id?: string;
  configured: boolean;
}

export interface TelemetrySnapshot {
  request_count: number;
  avg_duration_ms: number;
  failure_rate: number;
}

export interface ServiceDetailResponse {
  id: string;
  name: string;
  type: string;
  region?: string;
  resource_group?: string;
  tags?: Record<string, string>;
  properties?: Record<string, unknown>;
  telemetry?: TelemetrySnapshot;
}
