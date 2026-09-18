import { ExternalLink, Copy } from 'lucide-react';
import Button from 'react-bootstrap/Button';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { StatusPill } from '@/components/common/StatusPill';
import { RelativeTime } from '@/components/common/RelativeTime';
import type { Incident } from '@/mocks/fixtures/incidents';

export function IncidentHeader({ incident }: { incident: Incident }) {
  return (
    <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
      <div>
        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
          <SeverityBadge severity={incident.severity} />
          <StatusPill status={incident.status ?? 'unknown'} />
          <span className="text-muted small">{incident.id}</span>
          <span className="text-muted small">·</span>
          <span className="text-muted small"><RelativeTime iso={incident.fired_at} /></span>
        </div>
        <h1 className="h5 fw-bold mb-1">{incident.alert_rule_name}</h1>
        <p className="text-muted small mb-1">{incident.description}</p>
        <div className="d-flex align-items-center gap-2">
          <code className="small">{incident.resource_name}</code>
          <button
            className="btn btn-sm p-0 border-0 text-muted"
            onClick={() => navigator.clipboard.writeText(incident.resource_id)}
            title="Copy resource ID"
          >
            <Copy size={12} />
          </button>
          <span className="text-muted small">· {incident.source}</span>
        </div>
      </div>
      {incident.github_issue_url && (
        <Button
          variant="outline-secondary"
          size="sm"
          href={incident.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="d-flex align-items-center gap-1 flex-shrink-0"
        >
          <ExternalLink size={14} /> GitHub Issue
        </Button>
      )}
    </div>
  );
}
