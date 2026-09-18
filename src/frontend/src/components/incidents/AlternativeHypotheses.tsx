import Card from 'react-bootstrap/Card';
import type { AlternativeHypothesis } from '@/types/rca';

export function AlternativeHypotheses({ items }: { items: AlternativeHypothesis[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <Card.Body>
        <Card.Title className="h6 fw-bold mb-3">Alternative Hypotheses</Card.Title>
        <ul className="mb-0 ps-3">
          {items.map((h, i) => (
            <li key={i} className="small text-muted mb-1">
              <strong>{h.hypothesis}</strong> — {Math.round(h.confidence * 100)}% confidence. {h.reasoning}
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}
