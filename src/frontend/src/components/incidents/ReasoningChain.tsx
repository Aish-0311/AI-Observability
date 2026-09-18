import Accordion from 'react-bootstrap/Accordion';
import type { ReasoningStep } from '@/types/rca';

export function ReasoningChain({ steps }: { steps: ReasoningStep[] }) {
  return (
    <Accordion>
      <Accordion.Item eventKey="0">
        <Accordion.Header><span className="small fw-semibold">Reasoning Chain ({steps.length} steps)</span></Accordion.Header>
        <Accordion.Body className="p-0">
          {steps.map((s, i) => (
            <div key={s.step} className={`d-flex gap-3 px-3 py-2 ${i < steps.length - 1 ? 'border-bottom' : ''}`}>
              <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--aiops-brand)', color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.step}</div>
              <p className="small mb-0">{s.observation}</p>
            </div>
          ))}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
