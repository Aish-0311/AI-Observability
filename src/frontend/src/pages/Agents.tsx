import { useRef } from 'react';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';
import Table from 'react-bootstrap/Table';
import { useAgents } from '@/api/agents';
import { StatusPill } from '@/components/common/StatusPill';
import { SkeletonCard } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { RelativeTime } from '@/components/common/RelativeTime';

const AGENT_ORDER = ['signal_aggregator', 'rca', 'knowledge_enricher', 'github_issue_creator'];
const runColors: Record<string, string> = { success: '#16A34A', error: '#DC2626', skipped: '#64748B' };
const depColor: Record<string, string> = { azure: '#0ea5e9', llm: '#7c3aed', internal: '#64748b', github: '#1d4ed8' };

export default function Agents() {
  const { data: agents, isLoading, error } = useAgents();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const orderedAgents = AGENT_ORDER
    .map(id => agents?.find(a => a.id === id))
    .filter(Boolean) as NonNullable<typeof agents>[number][];

  const scrollTo = (id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      <PageHeader title="Agents" subtitle="LangGraph AI pipeline — 4 agents in sequence" />

      {/* pipeline flow diagram */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {AGENT_ORDER.map((id, i) => {
              const agent = agents?.find(a => a.id === id);
              return (
                <div key={id} className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-1"
                    style={{ border: '1.5px solid var(--aiops-brand)', color: 'var(--aiops-brand)', background: 'transparent', fontSize: '0.82rem' }}
                    onClick={() => scrollTo(id)}
                    disabled={isLoading}
                  >
                    <span style={{ fontWeight: 700 }}>{i + 1}</span>
                    {agent?.name ?? id}
                    {agent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: agent.status === 'healthy' ? '#16A34A' : '#DC2626', display: 'inline-block' }} />}
                  </button>
                  {i < AGENT_ORDER.length - 1 && <span className="text-muted" style={{ fontSize: '0.8rem' }}>→</span>}
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {isLoading
        ? <div className="row g-3">{[1,2,3,4].map(i => <div key={i} className="col-12"><SkeletonCard /></div>)}</div>
        : orderedAgents.map((agent, idx) => (
          <div key={agent.id} className="mb-3" ref={el => { cardRefs.current[agent.id] = el; }}>
            <Card>
              <Card.Body>
                <div className="d-flex align-items-start justify-content-between gap-3 mb-3 flex-wrap">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="badge rounded-pill" style={{ background: 'var(--aiops-brand)', color: '#fff', fontSize: '0.7rem' }}>{idx + 1}</span>
                      <h2 className="h6 fw-bold mb-0">{agent.name}</h2>
                      <StatusPill status={agent.status} />
                    </div>
                    <p className="text-muted small mb-0">{agent.description}</p>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="small text-muted">Last run: <RelativeTime iso={agent.metrics.last_run_at} /></div>
                    <div className="small">{agent.metrics.runs_24h} runs · {Math.round(agent.metrics.success_rate * 100)}% success · avg {(agent.metrics.avg_duration_ms / 1000).toFixed(1)}s</div>
                  </div>
                </div>

                {/* run sparkline */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="small text-muted">Recent:</span>
                  <div className="d-flex gap-1">
                    {agent.recent_runs.map((run, i) => (
                      <div
                        key={i}
                        style={{ width: 12, height: 20, borderRadius: 3, background: runColors[run.status], opacity: 0.8 }}
                        title={`${run.status}${run.duration_ms ? ` — ${(run.duration_ms / 1000).toFixed(1)}s` : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <Accordion>
                  <Accordion.Item eventKey="inputs">
                    <Accordion.Header><span className="small fw-semibold">Inputs & Outputs</span></Accordion.Header>
                    <Accordion.Body>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="small fw-semibold text-muted mb-2">Inputs</div>
                          {agent.inputs.map(inp => (
                            <div key={inp.name} className="mb-2">
                              <code className="small">{inp.name}</code><Badge bg="secondary" className="ms-1" style={{ fontSize: '0.65rem' }}>{inp.type}</Badge>
                              <p className="text-muted small mb-0">{inp.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="col-md-6">
                          <div className="small fw-semibold text-muted mb-2">Outputs</div>
                          {agent.outputs.map(out => (
                            <div key={out.name} className="mb-2">
                              <code className="small">{out.name}</code><Badge bg="primary" className="ms-1" style={{ fontSize: '0.65rem' }}>{out.type}</Badge>
                              <p className="text-muted small mb-0">{out.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="deps">
                    <Accordion.Header><span className="small fw-semibold">Dependencies</span></Accordion.Header>
                    <Accordion.Body>
                      {agent.dependencies.map(dep => (
                        <div key={dep.name} className="d-flex align-items-start gap-2 mb-2">
                          <Badge style={{ background: depColor[dep.type], fontSize: '0.65rem' }}>{dep.type}</Badge>
                          <div>
                            <div className="small fw-medium">{dep.name}</div>
                            <div className="text-muted small">{dep.description}</div>
                          </div>
                        </div>
                      ))}
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="config">
                    <Accordion.Header><span className="small fw-semibold">Configuration</span></Accordion.Header>
                    <Accordion.Body>
                      <Table size="sm" className="mb-0">
                        <tbody>
                          {agent.config.map(c => (
                            <tr key={c.key}>
                              <td><code className="small">{c.key}</code></td>
                              <td className="small">{c.value}</td>
                              <td><Badge bg={c.source === 'env' ? 'info' : 'secondary'} style={{ fontSize: '0.6rem' }}>{c.source}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="errors">
                    <Accordion.Header><span className="small fw-semibold">Error Handling</span></Accordion.Header>
                    <Accordion.Body>
                      <p className="small mb-0">{agent.error_handling}</p>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </Card.Body>
            </Card>
          </div>
        ))}
    </div>
  );
}
