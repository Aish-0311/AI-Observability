type Status = string;

const cfg: Record<string, { chip: string; label: string; dot?: string }> = {
  firing:   { chip: 'chip chip-danger',  label: 'Firing',    dot: 'dot-firing' },
  resolved: { chip: 'chip chip-success', label: 'Resolved' },
  healthy:  { chip: 'chip chip-success', label: 'Healthy' },
  degraded: { chip: 'chip chip-warning', label: 'Degraded' },
  incident: { chip: 'chip chip-danger',  label: 'Incident',  dot: 'dot-incident' },
  unknown:  { chip: 'chip chip-neutral', label: 'Unknown' },
  running:  { chip: 'chip chip-info',    label: 'Running' },
  success:  { chip: 'chip chip-success', label: 'Success' },
  error:    { chip: 'chip chip-danger',  label: 'Error' },
  skipped:  { chip: 'chip chip-neutral', label: 'Skipped' },
  pending:  { chip: 'chip chip-neutral', label: 'Pending' },
};

export function StatusPill({ status }: { status: Status }) {
  const c = cfg[status] ?? { chip: 'chip chip-neutral', label: status };
  return (
    <span className={c.chip}>
      {c.dot && <span className={`status-dot ${c.dot}`} style={{ width: 6, height: 6 }} />}
      {c.label}
    </span>
  );
}
