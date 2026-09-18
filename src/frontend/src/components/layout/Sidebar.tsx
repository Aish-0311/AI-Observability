import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Bell, Database, BarChart2,
  DollarSign, Workflow, BookOpen, Network, Bot, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSources } from '@/api/sources';

interface NavItem { to: string; icon: typeof LayoutDashboard; label: string; }

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Observe',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/alerts', icon: Bell, label: 'Alerts Feed' },
      { to: '/sources', icon: Database, label: 'Sources' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
      { to: '/costs', icon: DollarSign, label: 'Cost & FinOps' },
      { to: '/pipeline', icon: Workflow, label: 'Pipeline Monitor' },
      { to: '/agents', icon: Bot, label: 'Agents' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/services', icon: Network, label: 'Service Map' },
    ],
  },
];

function HealthDot({ health }: { health: string }) {
  const cls = health === 'healthy' ? 'dot-healthy' : health === 'degraded' ? 'dot-warning' : 'dot-danger';
  return <span className={`status-dot ${cls}`} style={{ width: 6, height: 6 }} />;
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: sources } = useSources();

  const healthyCount = sources?.filter(s => s.health === 'healthy').length ?? 0;
  const totalCount = sources?.length ?? 0;
  const overallHealth = !sources ? 'unknown'
    : healthyCount === totalCount ? 'healthy'
    : healthyCount === 0 ? 'incident'
    : 'degraded';

  if (collapsed) return null;

  return (
    <div className="sidebar-footer">
      <NavLink
        to="/settings"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} mb-1`}
      >
        <Settings size={15} />
        <span style={{ fontSize: 'var(--text-sm)' }}>Settings</span>
      </NavLink>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-2)',
          background: 'var(--aiops-bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--aiops-border)',
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--aiops-brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}
        >
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)' }}
            className="truncate"
          >
            {user?.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <HealthDot health={overallHealth} />
            <span style={{ fontSize: 10, color: 'var(--aiops-text-subtle)' }}>
              {healthyCount}/{totalCount} sources
            </span>
          </div>
        </div>
        <button
          className="btn btn-sm p-1"
          style={{ background: 'transparent', border: 'none', color: 'var(--aiops-text-subtle)', flexShrink: 0, minWidth: 28, height: 28 }}
          title="Sign out"
          onClick={() => { logout(); navigate('/login'); }}
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className="sidebar d-flex flex-column"
      style={{
        width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
        minHeight: '100dvh',
        transition: 'width var(--transition-base)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: '100dvh',
      }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-brand-dot">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#fff" strokeWidth="1.5" />
            <circle cx="7" cy="7" r="2" fill="#fff" />
          </svg>
        </div>
        {!collapsed && <span className="sidebar-brand-name">Cluster.Reply AiOps</span>}
      </div>

      {/* Nav */}
      <nav className="flex-grow-1 py-2" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {groups.map((group, gi) => (
          <div
            key={group.label}
            className="sidebar-group"
            style={gi > 0 ? { borderTop: '1px solid var(--aiops-sidebar-border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)' } : {}}
          >
            {!collapsed && (
              <span className="sidebar-group-label">{group.label}</span>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                <item.icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
