import Button from 'react-bootstrap/Button';
import { RefreshCw } from 'lucide-react';
import { useSources, useRefreshSources } from '@/api/sources';
import { SourceCard } from '@/components/sources/SourceCard';
import { SkeletonCard } from '@/components/common/Skeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';

export default function Sources() {
  const { data: sources, isLoading, error } = useSources();
  const { mutate: refresh, isPending } = useRefreshSources();

  return (
    <div>
      <PageHeader
        title="Sources"
        subtitle="Configured monitoring integrations"
        actions={
          <Button variant="outline-secondary" size="sm" className="d-flex align-items-center gap-1" onClick={() => refresh()} disabled={isPending}>
            <RefreshCw size={14} className={isPending ? 'spin' : ''} /> {isPending ? 'Refreshing…' : 'Refresh all'}
          </Button>
        }
      />
      {error && <ErrorAlert error={error} />}
      <div className="row g-3">
        {isLoading
          ? [1,2,3,4].map(i => <div key={i} className="col-sm-6 col-xl-3"><SkeletonCard /></div>)
          : sources?.map(s => (
            <div key={s.id} className="col-sm-6 col-xl-3">
              <SourceCard source={s} />
            </div>
          ))}
      </div>
    </div>
  );
}
