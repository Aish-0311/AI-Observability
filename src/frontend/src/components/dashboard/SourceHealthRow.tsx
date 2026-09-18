import { StatusPill } from '@/components/common/StatusPill';
import type { SourceIntegration } from '@/types/sources';

export function SourceHealthRow({ sources }: { sources: SourceIntegration[] }) {
  return (
    <div className="row g-3">
      {sources.map(s => (
        <div key={s.id} className="col-sm-6 col-xl-3">
          <div className="card card-hover p-3">
            <div className="d-flex justify-content-between align-items-center">
              <span className="small fw-semibold">{s.name}</span>
              <StatusPill status={s.health} />
            </div>
            <div className="text-muted small mt-1">{s.queries_24h} queries · {(s.error_rate * 100).toFixed(1)}% errors</div>
          </div>
        </div>
      ))}
    </div>
  );
}
