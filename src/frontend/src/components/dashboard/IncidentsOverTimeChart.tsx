import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { IncidentDataPoint } from '@/mocks/fixtures/dashboard';

interface Props { data: IncidentDataPoint[]; }

const lines: { key: keyof IncidentDataPoint; color: string; label: string }[] = [
  { key: 'sev0', color: '#DC2626', label: 'Sev0' },
  { key: 'sev1', color: '#D97706', label: 'Sev1' },
  { key: 'sev2', color: '#2563EB', label: 'Sev2' },
  { key: 'sev3', color: '#0891B2', label: 'Sev3' },
  { key: 'sev4', color: '#64748B', label: 'Sev4' },
];

export function IncidentsOverTimeChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bs-border-color)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', fontSize: 12 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {lines.map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
