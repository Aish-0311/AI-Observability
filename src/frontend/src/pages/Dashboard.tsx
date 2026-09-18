import { AlertTriangle, Bell, Clock, Database } from 'lucide-react';
import Card from 'react-bootstrap/Card';
import { useDashboard } from '@/api/dashboard';
import { useIncidents } from '@/api/incidents';
import { useSources } from '@/api/sources';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { IncidentsOverTimeChart } from '@/components/dashboard/IncidentsOverTimeChart';
import { SeverityDistributionChart } from '@/components/dashboard/SeverityDistributionChart';
import { SourceHealthRow } from '@/components/dashboard/SourceHealthRow';
import { RecentIncidentsTable } from '@/components/dashboard/RecentIncidentsTable';
import { SkeletonKpiStrip, SkeletonTable, Skeleton } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';

export default function Dashboard() {
  const { data: dashboard, isLoading: dashLoading, error: dashError } = useDashboard();
  const { data: incidents, isLoading: incLoading } = useIncidents();
  const { data: sources, isLoading: srcLoading } = useSources();

  const kpis = dashboard?.kpis;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Real-time AIOps observability overview" />
      {dashError && <ErrorAlert error={dashError} />}

      {dashLoading ? <SkeletonKpiStrip /> : kpis && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <KpiCard title="Active Incidents" value={kpis.active_incidents} icon={AlertTriangle} variant={kpis.active_incidents > 2 ? 'danger' : 'default'} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KpiCard title="Alerts (24h)" value={kpis.alerts_24h} icon={Bell} variant="warning" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KpiCard title="MTTR" value={`${kpis.mttr_minutes}m`} sub="mean time to resolve" icon={Clock} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KpiCard title="Sources" value={`${kpis.sources_up}/${kpis.sources_total}`} sub="integrations healthy" icon={Database} variant={kpis.sources_up < kpis.sources_total ? 'warning' : 'success'} />
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Incidents Over Time</Card.Title>
              {dashLoading ? <Skeleton height={220} /> : dashboard && <IncidentsOverTimeChart data={dashboard.incidents_over_time} />}
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Severity Distribution</Card.Title>
              {dashLoading ? <Skeleton height={220} /> : dashboard && <SeverityDistributionChart data={dashboard.severity_distribution} />}
            </Card.Body>
          </Card>
        </div>
      </div>

      <div className="mb-4">
        <h6 className="fw-bold mb-3">Source Health</h6>
        {srcLoading ? <div className="row g-3">{[1,2,3,4].map(i => <div key={i} className="col-sm-6 col-xl-3"><Skeleton height={80} /></div>)}</div> : sources && <SourceHealthRow sources={sources} />}
      </div>

      <Card>
        <Card.Body>
          <Card.Title className="h6 fw-bold mb-3">Recent Incidents</Card.Title>
          {incLoading ? <SkeletonTable rows={5} cols={5} /> : incidents && <RecentIncidentsTable incidents={incidents.data} />}
        </Card.Body>
      </Card>
    </div>
  );
}
