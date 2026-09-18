import Card from 'react-bootstrap/Card';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { RelativeTime } from '@/components/common/RelativeTime';
import type { SuspectCommit } from '@/types/enrichment';

export function SuspectCommits({ commits }: { commits: SuspectCommit[] }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6 fw-bold mb-3">Suspect Commits</Card.Title>
        {commits.length === 0 ? (
          <p className="text-muted small">No suspect commits identified.</p>
        ) : (
          commits.map(c => (
            <div key={c.sha} className="mb-3">
              <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                <div>
                  <code className="small">{c.sha.slice(0, 7)}</code>
                  <span className="small text-muted ms-2">{c.author}</span>
                </div>
                <span className="small text-muted flex-shrink-0"><RelativeTime iso={c.committed_at} /></span>
              </div>
              <p className="small mb-1">{c.message}</p>
              <div className="d-flex align-items-center gap-2">
                <ProgressBar now={c.relevance_score * 100} variant="warning" style={{ height: 4, flexGrow: 1 }} />
                <small className="text-muted flex-shrink-0">{Math.round(c.relevance_score * 100)}%</small>
              </div>
            </div>
          ))
        )}
      </Card.Body>
    </Card>
  );
}
