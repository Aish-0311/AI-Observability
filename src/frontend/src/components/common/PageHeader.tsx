import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: Props) {
  return (
    <div
      className="d-flex align-items-start justify-content-between gap-4 mb-5"
      style={{ minHeight: 48 }}
    >
      <div>
        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
          <h1 className="page-title mb-0">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle mb-0">{subtitle}</p>}
      </div>
      {actions && (
        <div className="d-flex gap-2 align-items-center flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
