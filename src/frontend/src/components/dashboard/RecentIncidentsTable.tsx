import Table from 'react-bootstrap/Table';
import { Link } from 'react-router-dom';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { RelativeTime } from '@/components/common/RelativeTime';
import type { Incident } from '@/mocks/fixtures/incidents';

export function RecentIncidentsTable({ incidents }: { incidents: Incident[] }) {
  return (
    <Table responsive hover className="table-sm mb-0 align-middle">
      <thead>
        <tr>
          <th>Severity</th>
          <th>Resource</th>
          <th>Alert Rule</th>
          <th>Fired</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>
        {incidents.slice(0, 5).map(inc => (
          <tr key={inc.id}>
            <td><SeverityBadge severity={inc.severity} /></td>
            <td>
              <Link to={`/incidents/${inc.id}`} className="fw-medium text-decoration-none">
                {inc.resource_name}
              </Link>
              <div className="text-muted small">{inc.id}</div>
            </td>
            <td className="text-muted small">{inc.alert_rule_name}</td>
            <td className="text-nowrap"><RelativeTime iso={inc.fired_at} /></td>
            <td style={{ minWidth: 100 }}><ConfidenceMeter confidence={inc.rca.confidence} label={false} /></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
