import ProgressBar from 'react-bootstrap/ProgressBar';

function variant(c: number) {
  if (c >= 0.8) return 'success';
  if (c >= 0.6) return 'warning';
  return 'danger';
}

export function ConfidenceMeter({ confidence, label = true }: { confidence: number; label?: boolean }) {
  const pct = Math.round(confidence * 100);
  return (
    <div>
      {label && <small className="text-muted d-block mb-1">Confidence — {pct}%</small>}
      <ProgressBar now={pct} variant={variant(confidence)} style={{ height: 8 }} />
    </div>
  );
}
