import Alert from 'react-bootstrap/Alert';
import { AlertTriangle } from 'lucide-react';

export function ErrorAlert({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return (
    <Alert variant="danger" className="d-flex align-items-center gap-2">
      <AlertTriangle size={16} />
      <span><strong>Something went wrong</strong> — {msg}</span>
    </Alert>
  );
}
