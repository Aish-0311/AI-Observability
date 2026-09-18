import type { AlertPayload } from './alerts';
import type { CorrelatedSignals, QueryCostEstimate } from './signals';
import type { RootCauseAnalysis } from './rca';
import type { EnrichmentContext } from './enrichment';

export interface CorrelationContext {
  correlation_id: string;
  service_name: string;
  environment: string;
}

export interface PipelineState {
  alert_payload?: AlertPayload;
  correlation?: CorrelationContext;
  correlated_signals?: CorrelatedSignals;
  query_cost?: QueryCostEstimate;
  root_cause_analysis?: RootCauseAnalysis;
  enrichment_context?: EnrichmentContext;
  github_issue_url?: string;
  error?: string;
}

export interface Incident extends AlertPayload, CorrelationContext {
  id: string;
  title: string;
  rca: RootCauseAnalysis;
  enrichment: EnrichmentContext;
  correlated_signals?: CorrelatedSignals;
  query_cost?: QueryCostEstimate;
  github_issue_url?: string;
  error?: string;
}
