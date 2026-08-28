import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Paginated } from '../../types/api';
interface PaginationProps {
  meta: Paginated<unknown>['meta'];
  onPageChange: (page: number) => void;
  onPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
}
function pageWindow(current: number, last: number): number[] {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
}

/** Generic paginator driven by the meta block from Laravel's paginate(). */
export function Pagination({
  meta,
  onPageChange,
  onPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  label = 'records'
}: PaginationProps) {
  const total = meta?.total ?? 0;
  if (total === 0) return null;

  const currentPage = meta?.current_page ?? (meta as unknown as { page?: number })?.page ?? 1;
  const perPage = meta?.per_page ?? (meta as unknown as { perPage?: number })?.perPage ?? 15;
  const lastPage = meta?.last_page ?? (meta as unknown as { pageCount?: number })?.pageCount ?? 1;

  const from = Math.min(total, Math.max(1, (currentPage - 1) * perPage + 1));
  const to = Math.min(total, currentPage * perPage);
  const pages = pageWindow(currentPage, lastPage);

  return (
    <nav aria-label="Pagination" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line px-3 sm:px-5 py-3">
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
        <p className="text-xs tabular-nums text-muted">
          Showing <span className="font-semibold text-fg">{from}</span>–<span className="font-semibold text-fg">{to}</span> of{' '}
          <span className="font-semibold text-fg">{total.toLocaleString()}</span> {label}
        </p>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="hidden xs:inline">Show</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              aria-label="Select records per page"
              className="h-8 rounded-lg border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-fg focus:border-brand-600 focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto pt-1 sm:pt-0">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="flex h-9 min-w-[2.25rem] px-2.5 items-center justify-center gap-1 rounded-xl border border-line text-xs font-semibold text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 touch-manipulation"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden />
          <span className="inline sm:hidden">Prev</span>
        </button>

        {/* Compact Page Indicator on Mobile */}
        <span className="inline-block sm:hidden text-xs font-bold text-fg tabular-nums px-2">
          {currentPage} / {lastPage}
        </span>

        {/* Full Page Pills on Tablet & Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, index) => {
            const previous = pages[index - 1];
            const gap = previous !== undefined && page - previous > 1;
            return (
              <React.Fragment key={page}>
                {gap && <span className="px-1 text-xs text-faint">…</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors duration-150 active:scale-95 ${
                    page === currentPage ? 'bg-brand-600 text-white shadow-sm' : 'border border-line text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          aria-label="Next page"
          className="flex h-9 min-w-[2.25rem] px-2.5 items-center justify-center gap-1 rounded-xl border border-line text-xs font-semibold text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 touch-manipulation"
        >
          <span className="inline sm:hidden">Next</span>
          <ChevronRightIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}