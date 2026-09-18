import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon mx-auto">
        <Icon size={24} strokeWidth={1.5} aria-hidden />
      </div>
      <h3>{title}</h3>
      {description && <p className="text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
