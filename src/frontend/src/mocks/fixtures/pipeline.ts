export type StageStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface PipelineStage { id: string; name: string; description: string; duration_ms?: number; status: StageStatus; output_summary?: string; error?: string; }
export interface PipelineRun { run_id: string; triggered_at: string; triggered_by: 'webhook' | 'manual'; duration_ms: number; status: 'success' | 'error' | 'running'; incident_id?: string; github_issue_url?: string; resource_name: string; severity: string; stages: PipelineStage[]; }

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const STAGE_TEMPLATES: Omit<PipelineStage, 'status' | 'duration_ms' | 'output_summary' | 'error'>[] = [
  { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: 'Pulls correlated signals from App Insights, Grafana, Prometheus, and Log Analytics.' },
  { id: 'rca',                  name: 'Root Cause Analyzer',  description: 'LLM analyses correlated signals and produces a structured RCA.' },
  { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: 'Matches similar past incidents and identifies suspect commits.' },
  { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: 'Creates a labeled GitHub issue with the full incident report.' },
];

export const pipelineRuns: PipelineRun[] = [
  { run_id: 'run-0001', triggered_at: ago(47),  triggered_by: 'webhook', duration_ms: 18420, status: 'success', incident_id: 'INC-2026-001', github_issue_url: 'https://github.com/contoso/aiops-platform/issues/142', resource_name: 'checkout-api',  severity: 'Sev0',
    stages: [
      { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: '', status: 'success', duration_ms: 4200, output_summary: 'Queried 4 sources. 47 signals collected. 3.8 GB Log Analytics.' },
      { id: 'rca',                  name: 'Root Cause Analyzer',  description: '', status: 'success', duration_ms: 8700, output_summary: 'RCA produced. Confidence: 91%. Likely cause: payment-gateway v3.2.0 connection timeout misconfiguration.' },
      { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: '', status: 'success', duration_ms: 2100, output_summary: '1 similar past incident found. 2 suspect commits identified.' },
      { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: '', status: 'success', duration_ms: 3420, output_summary: 'Issue #142 created with labels: incident, critical, ai-generated.' },
    ],
  },
  { run_id: 'run-0002', triggered_at: ago(180), triggered_by: 'webhook', duration_ms: 14850, status: 'success', incident_id: 'INC-2026-002', github_issue_url: 'https://github.com/contoso/aiops-platform/issues/141', resource_name: 'auth-service',  severity: 'Sev1',
    stages: [
      { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: '', status: 'success', duration_ms: 3800, output_summary: 'Queried 3 sources. 31 signals collected.' },
      { id: 'rca',                  name: 'Root Cause Analyzer',  description: '', status: 'success', duration_ms: 7200, output_summary: 'Confidence: 87%. Likely cause: unindexed analytics query holding dbo.Users lock.' },
      { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: '', status: 'success', duration_ms: 1850, output_summary: '1 similar past incident. 1 suspect commit.' },
      { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: '', status: 'success', duration_ms: 2000, output_summary: 'Issue #141 created.' },
    ],
  },
  { run_id: 'run-0003', triggered_at: ago(320), triggered_by: 'webhook', duration_ms: 9200,  status: 'error',   resource_name: 'orders-processed-consumer', severity: 'Sev1',
    stages: [
      { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: '', status: 'success', duration_ms: 3100, output_summary: 'Queried 3 sources. 22 signals collected.' },
      { id: 'rca',                  name: 'Root Cause Analyzer',  description: '', status: 'error',   duration_ms: 6100, error: 'OpenAI API rate limit exceeded (429). Retried 3× — exhausted.' },
      { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: '', status: 'skipped', output_summary: 'Skipped — RCA stage failed.' },
      { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: '', status: 'skipped', output_summary: 'Skipped — RCA stage failed.' },
    ],
  },
  { run_id: 'run-0004', triggered_at: ago(360), triggered_by: 'manual',  duration_ms: 16300, status: 'success', incident_id: 'INC-2026-004', github_issue_url: 'https://github.com/contoso/aiops-platform/issues/138', resource_name: 'payment-gateway', severity: 'Sev2',
    stages: [
      { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: '', status: 'success', duration_ms: 4400, output_summary: 'Queried 4 sources. 38 signals. 1.8 GB scanned.' },
      { id: 'rca',                  name: 'Root Cause Analyzer',  description: '', status: 'success', duration_ms: 7900, output_summary: 'Confidence: 84%. Memory leak via undisposed HttpClient.' },
      { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: '', status: 'success', duration_ms: 1800, output_summary: '1 similar past incident. 1 suspect commit.' },
      { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: '', status: 'success', duration_ms: 2200, output_summary: 'Issue #138 created.' },
    ],
  },
  { run_id: 'run-0005', triggered_at: ago(722), triggered_by: 'webhook', duration_ms: 13700, status: 'success', incident_id: 'INC-2026-005', resource_name: 'aks-prod-westeu', severity: 'Sev2',
    stages: [
      { id: 'signal_aggregator',    name: 'Signal Aggregator',    description: '', status: 'success', duration_ms: 3700, output_summary: 'Queried 3 sources. 29 signals.' },
      { id: 'rca',                  name: 'Root Cause Analyzer',  description: '', status: 'success', duration_ms: 7200, output_summary: 'Confidence: 79%. Batch ML job without CPU limits consumed 14.2 vCPUs.' },
      { id: 'knowledge_enricher',   name: 'Knowledge Enricher',   description: '', status: 'success', duration_ms: 1400, output_summary: 'No similar past incidents.' },
      { id: 'github_issue_creator', name: 'GitHub Issue Creator', description: '', status: 'skipped', output_summary: 'Skipped — severity below auto-issue threshold.' },
    ],
  },
];
