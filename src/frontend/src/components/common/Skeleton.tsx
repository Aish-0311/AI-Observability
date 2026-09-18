interface SkeletonProps { width?: string | number; height?: string | number; className?: string; }

export function Skeleton({ width = '100%', height = 16, className = '' }: SkeletonProps) {
  return (
    <div
      className={`shimmer rounded ${className}`}
      style={{ width, height, backgroundColor: 'var(--bs-secondary-bg)' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-3">
      <Skeleton height={12} width="40%" className="mb-2" />
      <Skeleton height={28} width="60%" className="mb-3" />
      <Skeleton height={10} width="80%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="d-flex gap-3 py-2 border-bottom">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={`${Math.floor(Math.random() * 40) + 40}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpiStrip() {
  return (
    <div className="row g-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="col-sm-6 col-xl-3">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
