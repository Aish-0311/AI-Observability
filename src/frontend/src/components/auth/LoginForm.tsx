import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('cluster@reply.de');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100dvh', background: 'var(--aiops-bg)' }}>
      <Card style={{ width: '100%', maxWidth: 400 }} className="shadow-sm">
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <div style={{ width: 40, height: 40, background: 'var(--aiops-brand)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>A</span>
            </div>
            <h1 className="h5 mb-1 fw-bold">AIOps Platform</h1>
            <p className="text-muted small">Sign in to your workspace</p>
          </div>
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
          <Form onSubmit={submit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-medium">Email</Form.Label>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-medium">Password</Form.Label>
              <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
