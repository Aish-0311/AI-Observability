import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SeverityCount } from '@/mocks/fixtures/dashboard';

const sevColors: Record<string, string> = {
  Sev0: '#DC2626', Sev1: '#D97706', Sev2: '#2563EB', Sev3: '#0891B2', Sev4: '#64748B',
};

export function SeverityDistributionChart({ data }: { data: SeverityCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bs-border-color)" />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} allowDecimals={false} />
        <YAxis type="category" dataKey="severity" tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} width={36} />
        <Tooltip contentStyle={{ background: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', fontSize: 12 }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--bs-secondary-color)' }}>
          {data.map(entry => (
            <Cell key={entry.severity} fill={sevColors[entry.severity] ?? '#64748B'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
