import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { CommandPalette } from '@/components/common/CommandPalette';

export function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} />

      <div className="app-content">
        {/* Topbar row */}
        <div
          className="topbar d-flex align-items-center"
          style={{ gap: 0, position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' }}
        >
          <button
            className="btn btn-sm"
            style={{
              height: 36, width: 36, padding: 0, borderRadius: 'var(--radius-md)',
              background: 'transparent', border: 'none',
              color: 'var(--aiops-text-muted)', marginLeft: 'var(--space-3)',
              flexShrink: 0,
            }}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <div style={{ flex: 1 }}>
            <Topbar onSearchOpen={() => setPaletteOpen(true)} />
          </div>
        </div>

        {/* Main content */}
        <main
          key={location.pathname}
          className="app-main page-enter"
        >
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
