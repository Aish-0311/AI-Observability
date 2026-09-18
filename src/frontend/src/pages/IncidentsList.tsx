import { useEffect, useState, useRef } from 'react';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import { useIncidents } from '@/api/incidents';
import { useIncidentUpdates } from '@/hooks/useIncidentUpdates';
import type { AlertSummary } from '@/hooks/useIncidentUpdates';
import { IncidentRow } from '@/components/incidents/IncidentRow';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { Pagination } from '@/components/common/Pagination';
import { SkeletonTable } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { AlertTriangle, RotateCw, Bell } from 'lucide-react';

export default function IncidentsList() {
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newIncidentId, setNewIncidentId] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  const filters = {
    severity: severity || undefined,
    source: source || undefined,
    q: q || undefined,
    pageNumber,
    pageSize,
  };

  const { data: response, isLoading, isFetching, error, refetch } = useIncidents(filters);

  const incidents = response?.data ?? [];
  const totalCount = response?.totalCount ?? 0;
  const totalPages = response?.totalPages ?? 0;

  // Handle real-time incident updates
  const handleAlertReceived = (alert: AlertSummary) => {
    console.log('New alert received:', alert);
    setNewIncidentId(alert.id);
    
    // Show toast notification
    setShowNewAlert(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowNewAlert(false), 5000);

    // Refresh the list if we're on page 1
    refetch();
  };

  useIncidentUpdates(handleAlertReceived, true);

  const handleFilterChange = () => {
    setPageNumber(1); // Reset to first page when filters change
  };

  const handleSeverityChange = (val: string) => {
    setSeverity(val);
    handleFilterChange();
  };

  const handleSourceChange = (val: string) => {
    setSource(val);
    handleFilterChange();
  };

  const handleSearchChange = (val: string) => {
    setQ(val);
    handleFilterChange();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };

  useEffect(() => {
    if (!newIncidentId) return;

    const row = document.querySelector(`[data-incident-id='${newIncidentId}']`) as HTMLElement | null;
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setNewIncidentId(null), 12000);

    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [incidents, newIncidentId]);

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle={`${totalCount} incidents`}
        actions={(
          <button
            className="btn btn-outline-secondary incidents-refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh incidents list"
          >
            <RotateCw size={16} className={isFetching ? 'spinning' : ''} aria-hidden="true" />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      />

      {showNewAlert && (
        <div
          className="alert alert-info alert-dismissible fade show mb-3"
          role="alert"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Bell size={16} />
          <span>
            <strong>New incident received:</strong> {newIncidentId ?? 'updating list...'}
          </span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setShowNewAlert(false)}
          ></button>
        </div>
      )}

      {error && <ErrorAlert error={error} />}
      <Card className="incidents-grid-card">
        <Card.Header className="incidents-grid-toolbar">
          <IncidentFilters
            severity={severity}
            setSeverity={handleSeverityChange}
            source={source}
            setSource={handleSourceChange}
            q={q}
            setQ={handleSearchChange}
          />
        </Card.Header>
        {isLoading ? (
          <Card.Body><SkeletonTable rows={8} cols={7} /></Card.Body>
        ) : !incidents?.length ? (
          <Card.Body><EmptyState icon={AlertTriangle} title="No incidents" description="Try adjusting your filters." /></Card.Body>
        ) : (
          <>
            <Table responsive hover className="table-sm align-middle mb-0 table-accent incidents-table">
              <thead className="incidents-table-head">
                <tr>
                  <th>Severity</th><th>Incident</th><th>Alert Rule</th><th>Source</th><th>Status</th><th>Fired</th><th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <IncidentRow
                    key={inc.id}
                    incident={inc}
                    isNew={newIncidentId === inc.id}
                  />
                ))}
              </tbody>
            </Table>
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPageNumber}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </Card>
    </div>
  );
}
