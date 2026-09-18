import Table from 'react-bootstrap/Table';
import { Link, useNavigate } from 'react-router-dom';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { StatusPill } from '@/components/common/StatusPill';
import { RelativeTime } from '@/components/common/RelativeTime';
import type { AlertPayload } from '@/types/alerts';

export function AlertsTable({ alerts, newIncidentId }: { alerts: AlertPayload[]; newIncidentId?: string | null }) {
  const navigate = useNavigate();
  return (
    <Table responsive hover className="table-sm align-middle mb-0 table-accent alerts-table">
      <thead className="alerts-table-head">
        <tr>
          <th>Severity</th>
          <th>Alert Rule</th>
          <th>Resource</th>
          <th>Source</th>
          <th>Status</th>
          <th>Fired</th>
          <th>Incident</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map(a => {
          const isNew = !!newIncidentId && a.incident_id === newIncidentId;
          return (
          <tr
            key={a.alert_id}
            style={{ cursor: a.incident_id ? 'pointer' : 'default' }}
            onClick={() => a.incident_id && navigate(`/incidents/${a.incident_id}`)}
            className={isNew ? 'row-recently-added' : undefined}
          >
            <td><SeverityBadge severity={a.severity} /></td>
            <td className="small fw-medium">
              {a.alert_rule_name}
              {isNew && <span className="chip chip-info ms-2">NEW</span>}
            </td>
            <td className="small text-muted">{a.resource_name}</td>
            <td className="small text-muted">{a.source}</td>
            <td><StatusPill status={a.status ?? 'unknown'} /></td>
            <td className="text-nowrap small"><RelativeTime iso={a.fired_at} /></td>
            <td>
              {a.incident_id
                ? <Link to={`/incidents/${a.incident_id}`} className="small" onClick={e => e.stopPropagation()}>{a.incident_id}</Link>
                : <span className="text-muted small">—</span>}
            </td>
          </tr>
        )})}
      </tbody>
    </Table>
  );
}
