import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, AlertTriangle, Bell, Database, BarChart2,
  DollarSign, Workflow, BookOpen, Network, Bot, Settings, Home, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Incident } from '@/mocks/fixtures/incidents';

interface RouteConfig { label: string; icon: LucideIcon; }

const routeConfig: Record<string, RouteConfig> = {
  dashboard: { label: 'Dashboard',       icon: LayoutDashboard },
  incidents: { label: 'Incidents',        icon: AlertTriangle   },
  alerts:    { label: 'Alerts Feed',      icon: Bell            },
  sources:   { label: 'Sources',          icon: Database        },
  analytics: { label: 'Analytics',        icon: BarChart2       },
  costs:     { label: 'Cost & FinOps',    icon: DollarSign      },
  pipeline:  { label: 'Pipeline Monitor', icon: Workflow        },
  knowledge: { label: 'Knowledge Base',   icon: BookOpen        },
  services:  { label: 'Service Map',      icon: Network         },
  agents:    { label: 'Agents',           icon: Bot             },
  settings:  { label: 'Settings',         icon: Settings        },
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { id } = useParams();
  const qc = useQueryClient();

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    const config = routeConfig[seg];

    let label = config?.label ?? seg;
    if (id && seg === id) {
      const cached = qc.getQueryData<Incident>(['incidents', id]);
      label = cached ? cached.id : id;
    }

    return { label, path, isLast, icon: config?.icon ?? null, isDynamic: !config };
  });

  // The current page icon (from the first segment that has a known route)
  const pageConfig = routeConfig[segments[0]];

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-5)' }}>
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          listStyle: 'none',
          margin: 0,
          padding: '6px 12px',
          background: 'var(--aiops-surface)',
          border: '1px solid var(--aiops-border)',
          borderRadius: 'var(--radius-lg)',
          width: 'fit-content',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Home crumb */}
        <li style={{ display: 'flex', alignItems: 'center' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: 'var(--aiops-text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              transition: 'color var(--transition-fast), background-color var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--aiops-text)';
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--aiops-bg-subtle)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--aiops-text-muted)';
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <Home size={13} strokeWidth={2} aria-hidden />
            <span>Home</span>
          </Link>
        </li>

        {crumbs.map(({ label, path, isLast, icon: Icon, isDynamic }) => (
          <li key={path} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Separator */}
            <ChevronRight
              size={13}
              strokeWidth={2}
              aria-hidden
              style={{ color: 'var(--aiops-text-subtle)', margin: '0 2px', flexShrink: 0 }}
            />

            {isLast ? (
              /* Active crumb — pill highlight */
              <span
                aria-current="page"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--aiops-brand-subtle)',
                  border: '1px solid var(--aiops-brand-border)',
                  color: isDynamic ? 'var(--aiops-text)' : 'var(--aiops-brand-text)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  maxWidth: 240,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: isDynamic ? 'var(--font-mono)' : 'var(--font-sans)',
                }}
              >
                {Icon && !isDynamic && (
                  <Icon size={13} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
                )}
                {label}
              </span>
            ) : (
              /* Intermediate crumb — link */
              <Link
                to={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'var(--aiops-text-muted)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  transition: 'color var(--transition-fast), background-color var(--transition-fast)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--aiops-text)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--aiops-bg-subtle)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--aiops-text-muted)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {Icon && <Icon size={13} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />}
                {label}
              </Link>
            )}
          </li>
        ))}

        {/* Page icon accent on right end — only for known top-level routes */}
        {pageConfig && crumbs.length === 1 && (
          <li style={{ marginLeft: 'auto', paddingLeft: 'var(--space-2)', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                background: 'var(--aiops-brand-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--aiops-brand)',
              }}
              aria-hidden
            >
              <pageConfig.icon size={12} strokeWidth={2} />
            </div>
          </li>
        )}
      </ol>
    </nav>
  );
}
