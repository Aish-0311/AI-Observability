import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Evidence } from '@/types/rca';

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-2" style={{ fontSize: '0.85rem' }}>
      <Card.Body className="py-2 px-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <Badge bg="secondary" className="me-2" style={{ fontSize: '0.65rem' }}>{evidence.signal_type}</Badge>
            <span>{evidence.description}</span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <small className="text-muted">rel: {Math.round(evidence.relevance * 100)}%</small>
            <button className="btn btn-sm p-0 border-0 text-muted" onClick={() => setOpen(o => !o)}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
        {open && (
          <pre className="mt-2 mb-0 p-2 rounded small" style={{ background: 'var(--bs-tertiary-bg)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(JSON.parse(evidence.data), null, 2)}
          </pre>
        )}
      </Card.Body>
    </Card>
  );
}

export function EvidenceGroup({ source, items }: { source: string; items: Evidence[] }) {
  return (
    <div className="mb-3">
      <div className="small fw-semibold text-muted mb-2">{source}</div>
      {items.map(e => <EvidenceCard key={e.id} evidence={e} />)}
    </div>
  );
}
