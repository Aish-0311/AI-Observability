import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAnalytics } from '@/api/analytics';
import { SkeletonCard, Skeleton } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TrendingDown, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { SeverityBadge } from '@/components/common/SeverityBadge';

export default function Analytics() {
  const { data, isLoading, error } = useAnalytics();

  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      <PageHeader title="Analytics" subtitle={`${data?.period_days ?? 30}-day incident trends and performance metrics`} />

      {isLoading ? <div className="row g-3 mb-4">{[1,2,3,4].map(i => <div key={i} className="col-sm-6 col-xl-3"><SkeletonCard /></div>)}</div> : data && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3"><KpiCard title="Total Incidents" value={data.total_incidents} icon={AlertTriangle} /></div>
          <div className="col-sm-6 col-xl-3"><KpiCard title="Avg MTTR" value={`${data.avg_mttr_minutes}m`} sub="mean time to resolve" icon={Clock} /></div>
          <div className="col-sm-6 col-xl-3"><KpiCard title="Resolved" value={`${data.resolved_incidents}/${data.total_incidents}`} sub="incidents" icon={CheckCircle} variant="success" /></div>
          <div className="col-sm-6 col-xl-3"><KpiCard title="SLA Compliance" value={`${data.sla_compliance_pct}%`} sub="across all severities" icon={TrendingDown} variant={data.sla_compliance_pct >= 90 ? 'success' : 'warning'} /></div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <Card>
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">MTTR Trend</Card.Title>
              {isLoading ? <Skeleton height={200} /> : data && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.mttr_trend.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bs-border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="m" />
                    <Tooltip contentStyle={{ background: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', fontSize: 12 }} formatter={(v: number) => [`${v}m`, 'MTTR']} />
                    <Area type="monotone" dataKey="mttr_minutes" name="MTTR (min)" stroke="var(--aiops-brand)" fill="var(--aiops-brand)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">SLA Compliance</Card.Title>
              {isLoading ? <Skeleton height={200} /> : data && (
                <Table size="sm" className="mb-0 align-middle">
                  <thead><tr><th>Severity</th><th>Target</th><th>Actual</th><th>SLA %</th></tr></thead>
                  <tbody>
                    {data.sla_table.map(s => (
                      <tr key={s.severity}>
                        <td><SeverityBadge severity={s.severity} /></td>
                        <td className="small text-muted">{s.target_minutes}m</td>
                        <td className="small">{s.actual_avg_minutes}m</td>
                        <td className={`small fw-bold ${s.compliance_pct >= 90 ? 'text-success' : s.compliance_pct >= 75 ? 'text-warning' : 'text-danger'}`}>{s.compliance_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      <Card>
        <Card.Body>
          <Card.Title className="h6 fw-bold mb-3">Incidents by Service</Card.Title>
          {isLoading ? <Skeleton height={200} /> : data && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.by_service} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bs-border-color)" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="service" tick={{ fontSize: 10 }} width={130} />
                <Tooltip contentStyle={{ background: 'var(--bs-body-bg)', fontSize: 12 }} />
                <Bar dataKey="sev0" name="Sev0" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
                <Bar dataKey="sev1" name="Sev1" stackId="a" fill="#D97706" />
                <Bar dataKey="sev2plus" name="Sev2+" stackId="a" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
