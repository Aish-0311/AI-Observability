import Card from 'react-bootstrap/Card';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import type { RootCauseAnalysis } from '@/types/rca';

export function RcaSummaryCard({ rca }: { rca: RootCauseAnalysis }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6 fw-bold mb-3">Root Cause Analysis</Card.Title>
        <p className="small mb-2">{rca.summary}</p>
        <div className="p-2 rounded mb-3" style={{ background: 'var(--bs-warning-bg-subtle)', border: '1px solid var(--bs-warning-border-subtle)' }}>
          <div className="small fw-semibold mb-1">Likely Cause</div>
          <p className="small mb-0">{rca.likely_cause}</p>
        </div>
        <div className="small fw-semibold mb-1">Severity Assessment</div>
        <p className="small text-muted mb-3">{rca.severity_assessment}</p>
        <ConfidenceMeter confidence={rca.confidence} />
        {rca.hallucination_disclaimer && (
          <p className="small text-muted mt-2 fst-italic">⚠ {rca.hallucination_disclaimer}</p>
        )}
      </Card.Body>
    </Card>
  );
}
