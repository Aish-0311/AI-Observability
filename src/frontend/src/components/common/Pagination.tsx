import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  pageNumber,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = (pageNumber - 1) * pageSize + 1;
  const endItem = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="d-flex justify-content-between align-items-center mt-3 p-3 rounded pagination-shell">
      <div className="text-muted small">
        Showing {startItem} to {endItem} of {totalCount} incidents
      </div>
      
      <div className="d-flex gap-2 align-items-center">
        {/* Page size selector */}
        <select
          className="form-select form-select-sm"
          style={{ width: '80px' }}
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1); // Reset to first page
          }}
        >
          <option value={5}>5 items</option>
          <option value={10}>10 items</option>
          <option value={25}>25 items</option>
          <option value={50}>50 items</option>
        </select>

        {/* Pagination controls */}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageNumber === 1}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="mx-2 text-muted small">
          Page {pageNumber} of {totalPages}
        </span>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
