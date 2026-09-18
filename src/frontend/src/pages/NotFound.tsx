import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="text-center py-5">
      <p className="display-1 fw-bold text-muted">404</p>
      <p className="h5 mb-3">Page not found</p>
      <Link to="/dashboard" className="btn btn-primary d-inline-flex align-items-center gap-2">
        <Home size={16} /> Back to Dashboard
      </Link>
    </div>
  );
}
