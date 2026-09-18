import { useParams, useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { ChevronLeft } from 'lucide-react';
import { useIncident } from '@/api/incidents';
import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { RcaSummaryCard } from '@/components/incidents/RcaSummaryCard';
import { SuggestedActionsList } from '@/components/incidents/SuggestedActionsList';
import { EvidenceGroup } from '@/components/incidents/EvidenceCard';
import { ReasoningChain } from '@/components/incidents/ReasoningChain';
import { AlternativeHypotheses } from '@/components/incidents/AlternativeHypotheses';
import { SimilarPastIncidents } from '@/components/incidents/SimilarPastIncidents';
import { SuspectCommits } from '@/components/incidents/SuspectCommits';
import { SkeletonCard, Skeleton } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(id ?? '');

  if (isLoading) return (
    <div>
      <Skeleton height={24} width={160} className="mb-4" />
      <div className="row g-3">
        <div className="col-lg-8"><SkeletonCard /></div>
        <div className="col-lg-4"><SkeletonCard /></div>
      </div>
    </div>
  );
  if (error) return <ErrorAlert error={error} />;
  if (!incident) return <ErrorAlert error={new Error('Incident not found')} />;

  const evidenceBySource = incident.rca.evidence.reduce<Record<string, typeof incident.rca.evidence>>((acc, e) => {
    (acc[e.source] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <Button variant="link" className="p-0 mb-3 d-flex align-items-center gap-1 text-muted text-decoration-none" onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> Back
      </Button>

      <IncidentHeader incident={incident} />

      <div className="row g-3 mb-3">
        <div className="col-lg-8"><RcaSummaryCard rca={incident.rca} /></div>
        <div className="col-lg-4"><SuggestedActionsList actions={incident.rca.suggested_actions} /></div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Card.Title className="h6 fw-bold mb-3">Evidence ({incident.rca.evidence.length} signals)</Card.Title>
          {Object.entries(evidenceBySource).map(([src, items]) => (
            <EvidenceGroup key={src} source={src} items={items} />
          ))}
        </Card.Body>
      </Card>

      <div className="mb-3"><ReasoningChain steps={incident.rca.reasoning_chain} /></div>

      <div className="mb-3"><AlternativeHypotheses items={incident.rca.alternative_hypotheses} /></div>

      <div className="row g-3">
        <div className="col-lg-6">
          <SimilarPastIncidents items={incident.enrichment.similar_past_incidents} />
        </div>
        <div className="col-lg-6">
          <SuspectCommits commits={incident.enrichment.suspect_commits} />
        </div>
      </div>
    </div>
  );
}
