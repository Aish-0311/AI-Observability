import Card from 'react-bootstrap/Card';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { RelativeTime } from '@/components/common/RelativeTime';
import type { SimilarIncident } from '@/types/enrichment';

export function SimilarPastIncidents({ items }: { items: SimilarIncident[] }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6 fw-bold mb-3">Similar Past Incidents</Card.Title>
        {items.length === 0 ? (
          <p className="text-muted small">No similar incidents found.</p>
        ) : (
          items.map(i => (
            <div key={i.incident_id} className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="small fw-medium">{i.incident_id}</span>
                <span className="small text-muted">{Math.round(i.similarity_score * 100)}%</span>
              </div>
              <ProgressBar now={i.similarity_score * 100} variant="info" style={{ height: 4 }} className="mb-1" />
              <p className="small text-muted mb-0">{i.resolution}</p>
              {i.resolved_at && <small className="text-muted"><RelativeTime iso={i.resolved_at} /></small>}
            </div>
          ))
        )}
      </Card.Body>
    </Card>
  );
}
