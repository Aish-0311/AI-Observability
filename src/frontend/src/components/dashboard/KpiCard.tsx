import Card from 'react-bootstrap/Card';
import type { LucideIcon } from 'lucide-react';

type Variant = 'default' | 'danger' | 'warning' | 'success';

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  variant?: Variant;
}

const iconBg: Record<Variant, string> = {
  default: 'var(--aiops-brand-subtle)',
  danger:  'var(--aiops-sev0-subtle)',
  warning: 'var(--aiops-sev1-subtle)',
  success: 'var(--aiops-success-subtle)',
};
const iconColor: Record<Variant, string> = {
  default: 'var(--aiops-brand)',
  danger:  'var(--aiops-sev0)',
  warning: 'var(--aiops-sev1)',
  success: 'var(--aiops-success)',
};
const cardMod: Record<Variant, string> = {
  default: '',
  danger:  ' kpi-danger',
  warning: ' kpi-warning',
  success: ' kpi-success',
};

export function KpiCard({ title, value, sub, icon: Icon, variant = 'default' }: Props) {
  return (
    <Card className={`kpi-card h-100${cardMod[variant]}`}>
      <Card.Body className="p-3">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <span className="kpi-label">{title}</span>
          <div
            className="kpi-icon"
            style={{ background: iconBg[variant], color: iconColor[variant] }}
            aria-hidden
          >
            <Icon size={16} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub mt-1">{sub}</div>}
      </Card.Body>
    </Card>
  );
}
