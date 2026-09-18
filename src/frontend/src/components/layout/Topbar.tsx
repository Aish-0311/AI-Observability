import { forwardRef, type ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { Search, LogOut, Settings, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const UserMenuToggle = forwardRef<HTMLButtonElement, { children?: ReactNode; onClick?: React.MouseEventHandler }>(
  ({ children, onClick }, ref) => (
    <button
      ref={ref}
      onClick={e => { e.preventDefault(); onClick?.(e); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 8px', borderRadius: 'var(--radius-md)',
        color: 'var(--aiops-text)',
        transition: 'background-color var(--transition-fast)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--aiops-bg-subtle)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      aria-label="User menu"
    >
      {children}
    </button>
  )
);
UserMenuToggle.displayName = 'UserMenuToggle';

export function Topbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className="d-flex align-items-center justify-content-between"
      style={{ height: 'var(--topbar-h)', padding: '0 var(--space-4)' }}
    >
      {/* Search trigger */}
      <button className="topbar-search" onClick={onSearchOpen} aria-label="Open search">
        <Search size={14} style={{ flexShrink: 0 }} />
        <span>Search…</span>
        <kbd>⌘K</kbd>
      </button>

      {/* Right cluster */}
      <div className="d-flex align-items-center gap-1">
        <ThemeToggle />

        <Dropdown align="end">
          <Dropdown.Toggle as={UserMenuToggle}>
            <div
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--aiops-brand)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0, fontFamily: 'var(--font-sans)',
              }}
              aria-hidden
            >
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <span
              className="d-none d-md-inline truncate"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, maxWidth: 120 }}
            >
              {user?.name ?? 'User'}
            </span>
            <ChevronDown size={12} style={{ color: 'var(--aiops-text-muted)', flexShrink: 0 }} />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header style={{ fontSize: 'var(--text-xs)' }}>{user?.email}</Dropdown.Header>
            <Dropdown.Item onClick={() => navigate('/settings')} className="d-flex align-items-center gap-2">
              <Settings size={14} aria-hidden /> Settings
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              className="d-flex align-items-center gap-2 text-danger"
              onClick={() => { logout(); navigate('/login'); }}
            >
              <LogOut size={14} aria-hidden /> Sign out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
}
