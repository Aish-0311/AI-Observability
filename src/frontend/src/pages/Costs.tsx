import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCosts } from '@/api/costs';
import { SkeletonCard, Skeleton } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { DollarSign, HardDrive, Zap } from 'lucide-react';
import { RelativeTime } from '@/components/common/RelativeTime';
import { SeverityBadge } from '@/components/common/SeverityBadge';

export default function Costs() {
  const { data, isLoading, error } = useCosts();

  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      <PageHeader title="Cost & FinOps" subtitle={`Last ${data?.period_days ?? 30} days — query cost breakdown`} />

      {isLoading ? <div className="row g-3 mb-4">{[1,2,3].map(i => <div key={i} className="col-sm-6 col-xl-3"><SkeletonCard /></div>)}</div> : data && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-4"><KpiCard title="Total Cost (30d)" value={`$${data.total_usd.toFixed(2)}`} icon={DollarSign} /></div>
          <div className="col-sm-6 col-xl-4"><KpiCard title="Avg / Incident" value={`$${data.avg_per_incident_usd.toFixed(2)}`} icon={Zap} /></div>
          <div className="col-sm-6 col-xl-4"><KpiCard title="Data Scanned" value={`${data.total_gb_scanned.toFixed(1)} GB`} sub="Log Analytics" icon={HardDrive} /></div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <Card>
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Cost Trend</Card.Title>
              {isLoading ? <Skeleton height={200} /> : data && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.trend.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bs-border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', fontSize: 12 }} formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                    <Area type="monotone" dataKey="total_usd" name="Total" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="log_analytics_usd" name="Log Analytics" stroke="#D97706" fill="#D97706" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Cost by Source</Card.Title>
              {isLoading ? <Skeleton height={200} /> : data?.by_source.map(s => (
                <div key={s.source} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium">{s.source}</span>
                    <span className="text-muted">${s.usd.toFixed(2)} ({s.pct.toFixed(1)}%)</span>
                  </div>
                  <ProgressBar now={s.pct} style={{ height: 6 }} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>
      </div>

      <Card>
        <Card.Body>
          <Card.Title className="h6 fw-bold mb-3">Top Incidents by Cost</Card.Title>
          {isLoading ? <Skeleton height={200} /> : (
            <Table responsive className="table-sm align-middle mb-0">
              <thead className="table-light">
                <tr><th>Incident</th><th>Severity</th><th>Fired</th><th>GB Scanned</th><th>API Calls</th><th>Est. Cost</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {data?.top_incidents.map(i => (
                  <tr key={i.incident_id}>
                    <td className="small fw-medium">{i.incident_id}</td>
                    <td><SeverityBadge severity={i.severity} /></td>
                    <td className="small text-muted"><RelativeTime iso={i.fired_at} /></td>
                    <td className="small">{i.log_analytics_gb_scanned.toFixed(1)} GB</td>
                    <td className="small">{i.metrics_api_calls + i.grafana_api_calls + i.prometheus_queries}</td>
                    <td className="small fw-bold">${i.estimated_cost_usd.toFixed(2)}</td>
                    <td className="small text-muted">{i.cost_notes[0] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
