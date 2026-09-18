import Spinner from 'react-bootstrap/Spinner';

export function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-center py-5 gap-2 text-muted">
      <Spinner animation="border" size="sm" />
      <span>{text}</span>
    </div>
  );
}
