import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import { StatusPill } from '@/components/common/StatusPill';
import { RelativeTime } from '@/components/common/RelativeTime';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Trash2, Loader, CheckCircle, Settings } from 'lucide-react';
import { useDisconnectAzure } from '@/api/settings';
import type { SourceIntegration } from '@/types/sources';

const SENSITIVE_KEYS = /secret|key|token|password/i;

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid var(--bs-border-color)', fontSize: '0.72rem' }}>
      <span className="text-muted" style={{ minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span className="fw-medium" style={{ fontFamily: 'var(--bs-font-monospace)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

export function SourceCard({ source }: { source: SourceIntegration }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const disconnect = useDisconnectAzure();
  const disabled = source.enabled === false;
  const canDisconnect = !disabled && Object.keys(source.config).length > 0;

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3500);
      },
    });
  };

  const configEntries = Object.entries(source.config).map(([k, v]) => ({
    key: k,
    display: SENSITIVE_KEYS.test(k) ? '••••••••' : String(v),
  }));

  return (
    <div style={{ opacity: disabled ? 0.52 : 1, position: 'relative' }}>
      <Card className="h-100 card-hover">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold">{source.name}</span>
                {source.coming_soon && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                    textTransform: 'uppercase', background: 'var(--bs-secondary-bg)',
                    color: 'var(--bs-secondary-color)', border: '1px solid var(--bs-border-color)',
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    Coming soon
                  </span>
                )}
              </div>
              <div className="text-muted small">{source.kind}</div>
            </div>
            <StatusPill status={source.health} />
          </div>

          <div className="row g-2 mb-2">
            <div className="col-6">
              <div className="text-muted small">Last query</div>
              <div className="small"><RelativeTime iso={source.last_query_at} /></div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Queries (24h)</div>
              <div className="small fw-medium">{source.queries_24h.toLocaleString()}</div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Error rate</div>
              <div className={`small fw-medium ${source.error_rate > 0.05 ? 'text-danger' : source.error_rate > 0.01 ? 'text-warning' : 'text-success'}`}>
                {(source.error_rate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {!disabled && (
            <>
              {configEntries.length === 0 ? (
                <Link
                  to="/settings"
                  className="d-flex align-items-center gap-2 mt-1 p-2 rounded text-decoration-none"
                  style={{
                    background: 'var(--bs-primary-bg-subtle)',
                    border: '1px dashed var(--bs-primary-border-subtle)',
                    color: 'var(--bs-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                  }}
                >
                  <Settings size={13} />
                  <span>Not configured — set up in Settings</span>
                  <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </Link>
              ) : (
                <>
                  <button
                    className="btn btn-sm btn-link p-0 text-muted d-flex align-items-center gap-1"
                    onClick={() => setExpanded(e => !e)}
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ fontSize: '0.75rem' }}>Configuration</span>
                  </button>
                  {expanded && (
                    <div className="mt-2 p-2 rounded" style={{ background: 'var(--bs-tertiary-bg)' }}>
                      {configEntries.map(({ key, display }) => (
                        <ConfigRow key={key} label={key.replace(/_/g, ' ')} value={display} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {showSuccess && (
                <div className="mt-3 d-flex align-items-center gap-2 p-2 rounded" style={{ background: 'var(--bs-success-bg-subtle)', border: '1px solid var(--bs-success-border-subtle)', fontSize: '0.75rem', color: 'var(--bs-success-text-emphasis)' }}>
                  <CheckCircle size={13} />
                  Integration removed successfully
                </div>
              )}

              {canDisconnect && (
                <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--bs-border-color)' }}>
                  {confirming ? (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>Remove this integration?</span>
                      <button
                        className="btn btn-danger btn-sm py-0 px-2"
                        style={{ fontSize: '0.72rem' }}
                        disabled={disconnect.isPending}
                        onClick={handleDisconnect}
                      >
                        {disconnect.isPending ? <Loader size={10} className="spin" /> : 'Yes, remove'}
                      </button>
                      <button
                        className="btn btn-link btn-sm p-0 text-muted"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => setConfirming(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-link btn-sm p-0 text-danger d-flex align-items-center gap-1"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setConfirming(true)}
                    >
                      <Trash2 size={11} />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
