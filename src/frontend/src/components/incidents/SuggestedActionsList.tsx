import { useState } from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import type { SuggestedAction } from '@/types/rca';

const priorityVariant: Record<string, string> = {
  immediate: 'danger', short_term: 'warning', long_term: 'secondary',
};

export function SuggestedActionsList({ actions }: { actions: SuggestedAction[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (order: number) =>
    setChecked(prev => { const s = new Set(prev); s.has(order) ? s.delete(order) : s.add(order); return s; });

  return (
    <Card>
      <Card.Body>
        <Card.Title className="h6 fw-bold mb-3">Suggested Actions</Card.Title>
        <ListGroup variant="flush">
          {actions.map(a => (
            <ListGroup.Item
              key={a.order}
              className="d-flex align-items-start gap-3 px-0 py-2"
              style={{ textDecoration: checked.has(a.order) ? 'line-through' : 'none', opacity: checked.has(a.order) ? 0.5 : 1 }}
            >
              <input
                type="checkbox"
                className="form-check-input mt-1 flex-shrink-0"
                checked={checked.has(a.order)}
                onChange={() => toggle(a.order)}
              />
              <div>
                <span className="small">{a.order}. {a.action}</span>
                <Badge bg={priorityVariant[a.priority] ?? 'secondary'} className="ms-2" style={{ fontSize: '0.65rem' }}>{a.priority.replace('_', ' ')}</Badge>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}
