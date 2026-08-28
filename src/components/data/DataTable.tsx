import React from 'react';
import { ErrorState, SkeletonTable } from '../ui/States';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  caption?: string;
  maxHeight?: string;
  containerClassName?: string;
}

const hideClass = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  empty,
  onRowClick,
  caption,
  maxHeight,
  containerClassName = '',
}: DataTableProps<T>) {
  if (loading) return <SkeletonTable columns={Math.min(columns.length, 6)} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div
      className={`thin-scroll relative w-full max-w-full overflow-x-auto overscroll-x-contain ${
        maxHeight ? 'overflow-y-auto' : ''
      } ${containerClassName}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="data-table w-full min-w-[44rem] border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const alignClass =
                column.align === 'right'
                  ? 'text-right'
                  : column.align === 'center'
                  ? 'text-center'
                  : 'text-left';

              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={[
                    alignClass,
                    column.className ?? '',
                    column.hideBelow ? hideClass[column.hideBelow] : '',
                  ].join(' ')}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((column) => {
                const alignClass =
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <td
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={[
                      alignClass,
                      column.className ?? '',
                      column.hideBelow ? hideClass[column.hideBelow] : '',
                    ].join(' ')}
                  >
                    {column.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}