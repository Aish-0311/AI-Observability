import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, Zap, FileText, ExternalLink } from 'lucide-react';
import { incidents } from '@/mocks/fixtures/incidents';
import { alerts } from '@/mocks/fixtures/alerts';
import { runbooks } from '@/mocks/fixtures/runbooks';

interface Result { id: string; label: string; sub: string; path: string; icon: typeof Search; group: string; dot?: string; }

interface Props { open: boolean; onClose: () => void; }

const pages: Result[] = [
  { id: 'dash', label: 'Dashboard', sub: 'Overview and KPIs', path: '/dashboard', icon: Zap, group: 'Pages' },
  { id: 'inc', label: 'Incidents', sub: 'All incidents', path: '/incidents', icon: AlertTriangle, group: 'Pages' },
  { id: 'alerts', label: 'Alerts Feed', sub: 'Firing and resolved alerts', path: '/alerts', icon: AlertTriangle, group: 'Pages' },
  { id: 'sources', label: 'Sources', sub: 'Integration health', path: '/sources', icon: ExternalLink, group: 'Pages' },
  { id: 'analytics', label: 'Analytics', sub: 'Trends and insights', path: '/analytics', icon: Zap, group: 'Pages' },
  { id: 'costs', label: 'Cost & FinOps', sub: 'Query cost breakdown', path: '/costs', icon: Zap, group: 'Pages' },
  { id: 'pipeline', label: 'Pipeline Monitor', sub: 'LangGraph pipeline runs', path: '/pipeline', icon: Zap, group: 'Pages' },
  { id: 'knowledge', label: 'Knowledge Base', sub: 'Runbooks', path: '/knowledge', icon: FileText, group: 'Pages' },
  { id: 'services', label: 'Service Map', sub: 'Dependency graph', path: '/services', icon: Zap, group: 'Pages' },
  { id: 'agents', label: 'Agents', sub: 'AI pipeline agents', path: '/agents', icon: Zap, group: 'Pages' },
];

const sevDot: Record<string, string> = { Sev0: '#DC2626', Sev1: '#D97706', Sev2: '#2563EB', Sev3: '#0891B2', Sev4: '#64748B' };

export function CommandPalette({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const lower = q.toLowerCase();
  let results: Result[] = [];

  if (!q) {
    results = pages.slice(0, 6);
  } else {
    results = [
      ...pages.filter(p => p.label.toLowerCase().includes(lower) || p.sub.toLowerCase().includes(lower)),
      ...incidents
        .filter(i => i.id.toLowerCase().includes(lower) || i.resource_name.toLowerCase().includes(lower) || i.rca.summary.toLowerCase().includes(lower) || i.alert_rule_name.toLowerCase().includes(lower))
        .slice(0, 4)
        .map(i => ({ id: i.id, label: i.id, sub: i.rca.likely_cause.slice(0, 60) + '…', path: `/incidents/${i.id}`, icon: AlertTriangle as typeof Search, group: 'Incidents', dot: sevDot[i.severity] })),
      ...alerts
        .filter(a => a.resource_name.toLowerCase().includes(lower) || a.alert_rule_name.toLowerCase().includes(lower))
        .slice(0, 3)
        .map(a => ({ id: a.alert_id, label: a.alert_rule_name, sub: a.resource_name, path: '/alerts', icon: Zap as typeof Search, group: 'Alerts', dot: sevDot[a.severity] })),
      ...runbooks
        .filter(r => r.title.toLowerCase().includes(lower) || r.summary.toLowerCase().includes(lower))
        .slice(0, 2)
        .map(r => ({ id: r.id, label: r.title, sub: r.category, path: '/knowledge', icon: FileText as typeof Search, group: 'Runbooks' })),
    ];
  }

  const go = (path: string) => { navigate(path); onClose(); };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx].path);
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const groups = [...new Set(results.map(r => r.group))];

  return (
    <div className="command-palette-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="command-palette card shadow-lg"
        style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, border: '1px solid var(--bs-border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="d-flex align-items-center gap-2 p-3 border-bottom">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            className="form-control border-0 p-0 shadow-none"
            placeholder="Search incidents, alerts, pages…"
            value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKey}
            style={{ background: 'transparent' }}
          />
          <kbd className="opacity-50 small">ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <p className="text-muted text-center py-4 small">No results for "{q}"</p>
          ) : (
            groups.map(group => {
              const groupResults = results.filter(r => r.group === group);
              let flatIdx = results.indexOf(groupResults[0]);
              return (
                <div key={group}>
                  <div className="px-3 py-1 small text-muted fw-semibold" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--bs-tertiary-bg)' }}>{group}</div>
                  {groupResults.map(r => {
                    const idx = flatIdx++;
                    return (
                      <button
                        key={r.id}
                        className={`d-flex align-items-center gap-3 w-100 text-start px-3 py-2 border-0 ${idx === activeIdx ? 'bg-primary text-white' : ''}`}
                        style={{ background: idx === activeIdx ? undefined : 'transparent', cursor: 'pointer' }}
                        onClick={() => go(r.path)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        {r.dot ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, flexShrink: 0, display: 'inline-block' }} /> : <r.icon size={14} className="flex-shrink-0 opacity-50" />}
                        <div className="min-w-0">
                          <div className="fw-medium small">{r.label}</div>
                          <div className={`small ${idx === activeIdx ? 'opacity-75' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>{r.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="d-flex gap-3 px-3 py-2 border-top small text-muted" style={{ fontSize: '0.75rem' }}>
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
