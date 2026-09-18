export interface AgentMetrics { runs_24h: number; success_rate: number; avg_duration_ms: number; last_run_at: string; }
export interface AgentRun { status: 'success' | 'error' | 'skipped'; duration_ms?: number; }
export interface AgentInput { name: string; type: string; description: string; }
export interface AgentOutput { name: string; type: string; description: string; }
export interface AgentDep { name: string; type: 'azure' | 'llm' | 'internal' | 'github'; description: string; }
export interface AgentConfigEntry { key: string; value: string; source: 'env' | 'hardcoded'; }
export interface Agent { id: string; name: string; description: string; status: 'healthy' | 'degraded' | 'incident'; metrics: AgentMetrics; recent_runs: AgentRun[]; inputs: AgentInput[]; outputs: AgentOutput[]; dependencies: AgentDep[]; config: AgentConfigEntry[]; error_handling: string; }

const now = new Date();
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const agents: Agent[] = [
  {
    id: 'signal_aggregator',
    name: 'Signal Aggregator',
    description: 'Pulls correlated signals from App Insights, Grafana, Prometheus, and Log Analytics within a 5-minute correlation window. Estimates query costs per source.',
    status: 'healthy',
    metrics: { runs_24h: 47, success_rate: 0.94, avg_duration_ms: 3800, last_run_at: ago(47) },
    recent_runs: [
      { status: 'success', duration_ms: 4200 },
      { status: 'success', duration_ms: 3800 },
      { status: 'success', duration_ms: 3100 },
      { status: 'error' },
      { status: 'success', duration_ms: 4400 },
    ],
    inputs: [
      { name: 'alert_payload', type: 'AlertPayload', description: 'Incoming webhook alert with resource_id, severity, fired_at' },
    ],
    outputs: [
      { name: 'correlated_signals', type: 'CorrelatedSignals', description: 'Aggregated signals from all configured sources' },
      { name: 'cost_estimates', type: 'QueryCostEstimate[]', description: 'Per-source cost breakdown for the query run' },
    ],
    dependencies: [
      { name: 'Azure App Insights', type: 'azure', description: 'REST API — /metrics, /events, /dependencies, /traces' },
      { name: 'Grafana', type: 'azure', description: 'HTTP API — dashboard panels and datasource proxy' },
      { name: 'Prometheus', type: 'azure', description: 'PromQL HTTP API — range queries and instant queries' },
      { name: 'Azure Log Analytics', type: 'azure', description: 'KQL queries via Azure Monitor REST API' },
    ],
    config: [
      { key: 'WINDOW_MINUTES', value: '5', source: 'hardcoded' },
      { key: 'LOG_ANALYTICS_COST_PER_GB', value: '$2.76', source: 'hardcoded' },
      { key: 'APP_INSIGHTS_APP_ID', value: 'from env', source: 'env' },
      { key: 'APP_INSIGHTS_API_KEY', value: '***', source: 'env' },
      { key: 'GRAFANA_URL', value: 'from env', source: 'env' },
      { key: 'GRAFANA_API_KEY', value: '***', source: 'env' },
      { key: 'PROMETHEUS_URL', value: 'from env', source: 'env' },
      { key: 'LOG_ANALYTICS_WORKSPACE_ID', value: 'from env', source: 'env' },
    ],
    error_handling: 'Each source query is isolated in a try/except block. Failures are logged and the source is skipped; the pipeline continues with partial signals. If all sources fail, the stage returns an empty CorrelatedSignals with an error note.',
  },
  {
    id: 'rca',
    name: 'Root Cause Analyzer',
    description: 'Sends correlated signals to Claude claude-opus-4-7 via the Anthropic API with a structured JSON schema prompt. Produces a full RCA with confidence score, evidence citations, reasoning chain, and alternative hypotheses.',
    status: 'healthy',
    metrics: { runs_24h: 44, success_rate: 0.89, avg_duration_ms: 7800, last_run_at: ago(47) },
    recent_runs: [
      { status: 'success', duration_ms: 8700 },
      { status: 'success', duration_ms: 7200 },
      { status: 'error' },
      { status: 'success', duration_ms: 7900 },
      { status: 'success', duration_ms: 7200 },
    ],
    inputs: [
      { name: 'correlated_signals', type: 'CorrelatedSignals', description: 'Signals from Signal Aggregator' },
      { name: 'alert_payload', type: 'AlertPayload', description: 'Original alert for context' },
    ],
    outputs: [
      { name: 'rca', type: 'RootCauseAnalysis', description: 'Structured RCA with confidence, evidence, and reasoning chain' },
    ],
    dependencies: [
      { name: 'Anthropic API', type: 'llm', description: 'claude-opus-4-7 — structured output mode with JSON schema' },
    ],
    config: [
      { key: 'ANTHROPIC_API_KEY', value: '***', source: 'env' },
      { key: 'MODEL', value: 'claude-opus-4-7', source: 'hardcoded' },
      { key: 'MAX_TOKENS', value: '4096', source: 'hardcoded' },
      { key: 'TEMPERATURE', value: '0', source: 'hardcoded' },
      { key: 'RESPONSE_FORMAT', value: 'json_schema (strict)', source: 'hardcoded' },
    ],
    error_handling: 'On 429 rate limit, retries 3x with exponential backoff (2s, 4s, 8s). On persistent failure, sets rca.confidence=0 and rca.summary to error message. Downstream stages check confidence > 0 before proceeding.',
  },
  {
    id: 'knowledge_enricher',
    name: 'Knowledge Enricher',
    description: 'Searches historical incidents for similar patterns using vector similarity. Queries the GitHub API for commits touching affected files within the 24-hour window before the alert. Produces suspect commits with relevance scores.',
    status: 'healthy',
    metrics: { runs_24h: 39, success_rate: 0.97, avg_duration_ms: 1850, last_run_at: ago(47) },
    recent_runs: [
      { status: 'success', duration_ms: 2100 },
      { status: 'success', duration_ms: 1850 },
      { status: 'skipped' },
      { status: 'success', duration_ms: 1800 },
      { status: 'success', duration_ms: 1400 },
    ],
    inputs: [
      { name: 'rca', type: 'RootCauseAnalysis', description: 'RCA output used to search similar past incidents' },
      { name: 'alert_payload', type: 'AlertPayload', description: 'resource_name used to query GitHub commits' },
    ],
    outputs: [
      { name: 'enrichment', type: 'EnrichmentContext', description: 'Similar past incidents and suspect commits with relevance scores' },
    ],
    dependencies: [
      { name: 'GitHub API', type: 'github', description: 'REST API — commits, repos, search/commits endpoint' },
      { name: 'Past Incidents Store', type: 'internal', description: 'data/past_incidents.json — local knowledge base' },
    ],
    config: [
      { key: 'GITHUB_TOKEN', value: '***', source: 'env' },
      { key: 'GITHUB_REPO', value: 'from env', source: 'env' },
      { key: 'COMMIT_LOOKBACK_HOURS', value: '24', source: 'hardcoded' },
      { key: 'SUSPECT_WINDOW_SECONDS', value: '3600', source: 'hardcoded' },
      { key: 'SIMILARITY_THRESHOLD', value: '0.6', source: 'hardcoded' },
    ],
    error_handling: 'GitHub API failures are gracefully handled — enrichment returns empty suspect_commits rather than failing the pipeline. Past incident search is local and does not fail. Skipped automatically if RCA confidence is 0.',
  },
  {
    id: 'github_issue_creator',
    name: 'GitHub Issue Creator',
    description: 'Creates a labeled GitHub issue with the full incident report formatted as Markdown. Applies severity-appropriate labels (critical/high/medium/low/informational), adds incident and ai-generated labels, and links back to the alert source.',
    status: 'healthy',
    metrics: { runs_24h: 31, success_rate: 0.97, avg_duration_ms: 2800, last_run_at: ago(47) },
    recent_runs: [
      { status: 'success', duration_ms: 3420 },
      { status: 'success', duration_ms: 2000 },
      { status: 'skipped' },
      { status: 'success', duration_ms: 2200 },
      { status: 'skipped' },
    ],
    inputs: [
      { name: 'rca', type: 'RootCauseAnalysis', description: 'Full RCA for issue body' },
      { name: 'enrichment', type: 'EnrichmentContext', description: 'Similar incidents and suspect commits for issue body' },
      { name: 'alert_payload', type: 'AlertPayload', description: 'Alert metadata for issue title and labels' },
    ],
    outputs: [
      { name: 'github_issue_url', type: 'string | null', description: 'URL of the created GitHub issue, or null if skipped' },
    ],
    dependencies: [
      { name: 'GitHub API', type: 'github', description: 'REST API — POST /repos/{owner}/{repo}/issues' },
    ],
    config: [
      { key: 'GITHUB_TOKEN', value: '***', source: 'env' },
      { key: 'GITHUB_REPO', value: 'from env', source: 'env' },
      { key: 'AUTO_ISSUE_MIN_SEVERITY', value: 'Sev2', source: 'hardcoded' },
      { key: 'LABEL_MAP', value: 'Sev0→critical, Sev1→high, Sev2→medium, Sev3→low, Sev4→informational', source: 'hardcoded' },
      { key: 'ALWAYS_LABELS', value: 'incident, ai-generated', source: 'hardcoded' },
    ],
    error_handling: 'If labels do not exist in the repo, they are created automatically before issue creation. If issue creation fails, the error is logged but does not fail the pipeline — github_issue_url is set to null. Issues below Sev2 are skipped unless triggered manually.',
  },
];
