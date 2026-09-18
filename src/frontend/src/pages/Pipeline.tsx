import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import { Link } from 'react-router-dom';
import { usePipelineRuns } from '@/api/pipeline';
import { StatusPill } from '@/components/common/StatusPill';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { RelativeTime } from '@/components/common/RelativeTime';
import { SkeletonTable } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Workflow } from 'lucide-react';

const stageColor: Record<string, string> = {
  success: '#16A34A', error: '#DC2626', skipped: '#64748B', running: '#2563EB', pending: '#94A3B8',
};

export default function Pipeline() {
  const { data: runs, isLoading, error } = usePipelineRuns();

  return (
    <div>
      <PageHeader title="Pipeline Monitor" subtitle="LangGraph RCA pipeline execution history" />
      {error && <ErrorAlert error={error} />}

      {isLoading ? (
        <Card><Card.Body><SkeletonTable rows={6} cols={6} /></Card.Body></Card>
      ) : !runs?.length ? (
        <EmptyState icon={Workflow} title="No pipeline runs" />
      ) : (
        runs.map(run => (
          <Card key={run.run_id} className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-start justify-content-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <StatusPill status={run.status} />
                    <SeverityBadge severity={run.severity} />
                    <span className="small fw-semibold">{run.resource_name}</span>
                    <span className="text-muted small">·</span>
                    <span className="text-muted small"><RelativeTime iso={run.triggered_at} /></span>
                    <Badge bg={run.triggered_by === 'webhook' ? 'primary' : 'secondary'} style={{ fontSize: '0.65rem' }}>{run.triggered_by}</Badge>
                  </div>
                  <div className="d-flex gap-3">
                    <span className="text-muted small">Run: <code className="small">{run.run_id}</code></span>
                    {run.incident_id && <span className="text-muted small">Incident: <Link to={`/incidents/${run.incident_id}`} className="small">{run.incident_id}</Link></span>}
                    <span className="text-muted small">Duration: {(run.duration_ms / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                {run.github_issue_url && (
                  <a href={run.github_issue_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">GitHub Issue</a>
                )}
              </div>

              <div className="d-flex gap-2 align-items-center flex-wrap">
                {run.stages.map((stage, i) => (
                  <div key={stage.id} className="d-flex align-items-center gap-2">
                    <div className="text-center">
                      <div
                        className="rounded px-2 py-1 small fw-medium"
                        style={{ background: stageColor[stage.status] + '22', color: stageColor[stage.status], border: `1px solid ${stageColor[stage.status]}44`, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                        title={stage.output_summary ?? stage.error ?? stage.name}
                      >
                        {stage.name}
                        {stage.duration_ms && <span className="ms-1 opacity-60" style={{ fontSize: '0.7rem' }}>{(stage.duration_ms / 1000).toFixed(1)}s</span>}
                      </div>
                      {(stage.output_summary || stage.error) && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.68rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {stage.error ? <span className="text-danger">{stage.error.slice(0, 50)}</span> : stage.output_summary?.slice(0, 50)}
                        </div>
                      )}
                    </div>
                    {i < run.stages.length - 1 && <span className="text-muted" style={{ fontSize: '0.7rem' }}>→</span>}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
}
