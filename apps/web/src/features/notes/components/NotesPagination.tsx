import type { FC } from 'react';

export interface NotesPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  disabled?: boolean;
}

export const NotesPagination: FC<NotesPaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav className="pagination" aria-label="Pagination Navigation" data-testid="notes-pagination">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={isFirstPage || disabled}
        aria-disabled={isFirstPage || disabled}
        onClick={() => onPageChange(page - 1)}
        data-testid="pagination-prev"
        aria-label="Go to previous page"
      >
        ← Previous
      </button>

      <span className="pagination-info" data-testid="pagination-info" aria-live="polite">
        Page {page} of {totalPages}
        {total > 0 && ` (${total} ${total === 1 ? 'note' : 'notes'})`}
      </span>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={isLastPage || disabled}
        aria-disabled={isLastPage || disabled}
        onClick={() => onPageChange(page + 1)}
        data-testid="pagination-next"
        aria-label="Go to next page"
      >
        Next →
      </button>
    </nav>
  );
};
