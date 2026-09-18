import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { Search } from 'lucide-react';
import { useRunbooks } from '@/api/knowledge';
import { SkeletonTable } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { BookOpen } from 'lucide-react';

const categoryColor: Record<string, string> = {
  Availability: 'danger', Performance: 'warning', Infrastructure: 'primary', Messaging: 'info', Security: 'success',
};

export default function Knowledge() {
  const [q, setQ] = useState('');
  const { data: runbooks, isLoading, error } = useRunbooks(q || undefined);

  return (
    <div>
      <PageHeader title="Knowledge Base" subtitle="Runbooks and incident response procedures" />
      {error && <ErrorAlert error={error} />}

      <div className="mb-3">
        <InputGroup style={{ maxWidth: 320 }}>
          <InputGroup.Text><Search size={14} /></InputGroup.Text>
          <Form.Control placeholder="Search runbooks…" value={q} onChange={e => setQ(e.target.value)} />
        </InputGroup>
      </div>

      {isLoading ? (
        <Card><Card.Body><SkeletonTable rows={5} cols={3} /></Card.Body></Card>
      ) : !runbooks?.length ? (
        <EmptyState icon={BookOpen} title="No runbooks found" description="Try a different search term." />
      ) : (
        <Accordion>
          {runbooks.map((rb, i) => (
            <Accordion.Item key={rb.id} eventKey={String(i)}>
              <Accordion.Header>
                <div className="d-flex align-items-center gap-2 flex-wrap me-3">
                  <Badge bg={categoryColor[rb.category] ?? 'secondary'}>{rb.category}</Badge>
                  <span className="fw-semibold small">{rb.title}</span>
                  <span className="text-muted small">~{rb.estimated_resolution_minutes}m · {rb.severity_range}</span>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <p className="small mb-3">{rb.summary}</p>
                <div className="mb-3">
                  {rb.steps.map(step => (
                    <div key={step.order} className="d-flex gap-3 mb-2">
                      <span className="badge bg-secondary flex-shrink-0" style={{ height: 20, alignSelf: 'flex-start', marginTop: 2 }}>{step.order}</span>
                      <div>
                        <p className="small mb-1">{step.action}</p>
                        {step.command && <pre className="mb-1 p-2 rounded small" style={{ background: 'var(--bs-tertiary-bg)', fontSize: '0.78rem' }}>{step.command}</pre>}
                        {step.note && <p className="small text-muted fst-italic mb-0">Note: {step.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-between align-items-center text-muted small">
                  <span>Escalation: {rb.escalation}</span>
                  <span>Updated: {rb.last_updated}</span>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
}
