import { useNavigate } from 'react-router-dom';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { StatusPill } from '@/components/common/StatusPill';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { RelativeTime } from '@/components/common/RelativeTime';
import { AlertSourceIcon } from '@/components/common/AlertSourceIcon';
import type { Incident } from '@/mocks/fixtures/incidents';

export function IncidentRow({ incident, isNew = false }: { incident: Incident; isNew?: boolean }) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={() => navigate(`/incidents/${incident.id}`)}
      style={{ cursor: 'pointer' }}
      data-incident-id={incident.id}
      className={isNew ? 'row-recently-added' : undefined}
    >
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertSourceIcon source={incident.source} size={18} />
          <SeverityBadge severity={incident.severity} />
          {isNew && <span className="chip chip-info">NEW</span>}
        </div>
      </td>
      <td>
        <div className="fw-semibold small">{incident.id}</div>
        <div className="text-muted small">{incident.resource_name}</div>
      </td>
      <td className="small">{incident.alert_rule_name}</td>
      <td className="small">{incident.source}</td>
      <td><StatusPill status={incident.status ?? 'unknown'} /></td>
      <td className="text-nowrap small"><RelativeTime iso={incident.fired_at} /></td>
      <td style={{ minWidth: 100 }}><ConfidenceMeter confidence={incident.rca.confidence} label={false} /></td>
    </tr>
  );
}
