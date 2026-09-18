import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { Search } from 'lucide-react';

interface Props {
  severity: string; setSeverity: (v: string) => void;
  source: string; setSource: (v: string) => void;
  q: string; setQ: (v: string) => void;
}

export function IncidentFilters({ severity, setSeverity, source, setSource, q, setQ }: Props) {
  return (
    <div className="incidents-filters">
      <InputGroup className="incidents-filter-search">
        <InputGroup.Text><Search size={14} /></InputGroup.Text>
        <Form.Control placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </InputGroup>
      <Form.Select className="incidents-filter-select" value={severity} onChange={e => setSeverity(e.target.value)}>
        <option value="">All Severities</option>
        {['Sev0','Sev1','Sev2','Sev3','Sev4'].map(s => <option key={s} value={s}>{s}</option>)}
      </Form.Select>
      <Form.Select className="incidents-filter-select" value={source} onChange={e => setSource(e.target.value)}>
        <option value="">All Sources</option>
        {['App Insights','Grafana','Prometheus'].map(s => <option key={s} value={s}>{s}</option>)}
      </Form.Select>
    </div>
  );
}
