import { useCallback, useState } from 'react';
import Card from 'react-bootstrap/Card';
import { useAlerts } from '@/api/alerts';
import { useIncidentUpdates } from '@/hooks/useIncidentUpdates';
import type { AlertSummary } from '@/hooks/useIncidentUpdates';
import { AlertsTable } from '@/components/alerts/AlertsTable';
import { AlertsFilters } from '@/components/alerts/AlertsFilters';
import { SkeletonTable } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Bell, RotateCw } from 'lucide-react';

export default function AlertsFeed() {
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [newIncidentId, setNewIncidentId] = useState<string | null>(null);

  const filters = {
    severity: severity || undefined,
    source: source || undefined,
    status: status || undefined,
    q: q || undefined,
  };
  const { data: alerts, isLoading, isFetching, error, refetch } = useAlerts(filters);

  const handleAlertReceived = useCallback((alert: AlertSummary) => {
    setNewIncidentId(alert.id);
    refetch();
  }, [refetch]);

  useIncidentUpdates(handleAlertReceived, true);

  const filtered = alerts ?? [];

  return (
    <div>
      <PageHeader
        title="Alerts Feed"
        subtitle={`${filtered.length} alerts`}
        actions={(
          <button
            className="btn btn-outline-secondary incidents-refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh alerts feed"
          >
            <RotateCw size={16} className={isFetching ? 'spinning' : ''} aria-hidden="true" />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      />
      {error && <ErrorAlert error={error} />}
      <Card className="alerts-grid-card">
        <Card.Header className="alerts-grid-toolbar">
          <AlertsFilters
            severity={severity}
            setSeverity={setSeverity}
            source={source}
            setSource={setSource}
            status={status}
            setStatus={setStatus}
            q={q}
            setQ={setQ}
          />
        </Card.Header>
        {isLoading ? (
          <Card.Body><SkeletonTable rows={10} cols={7} /></Card.Body>
        ) : !filtered.length ? (
          <Card.Body><EmptyState icon={Bell} title="No alerts" description="Try adjusting your filters." /></Card.Body>
        ) : (
          <AlertsTable alerts={filtered} newIncidentId={newIncidentId} />
        )}
        <Card.Footer className="alerts-grid-footer d-flex justify-content-between align-items-center">
          <small className="text-muted">Showing {filtered.length} alerts</small>
          <small className="text-muted">Live updates {isFetching ? 'syncing...' : 'connected'}</small>
        </Card.Footer>
      </Card>
    </div>
  );
}
