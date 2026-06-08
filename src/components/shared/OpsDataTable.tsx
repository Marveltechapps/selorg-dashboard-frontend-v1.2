import React from 'react';
import { cn } from '@/lib/utils';
import { useRiderOps } from '@/components/rider/RiderOpsProvider';

export interface OpsColumn<T> {
  key: string;
  header: React.ReactNode;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface OpsDataTableProps<T> {
  columns: OpsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  maxHeightClass?: string;
}

export function OpsDataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = 'No records found',
  onRowClick,
  stickyHeader = true,
  maxHeightClass = 'max-h-[320px]',
}: OpsDataTableProps<T>) {
  const { density } = useRiderOps();
  const cellPad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  const headPad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={cn('overflow-x-auto overflow-y-auto rider-ops-table', maxHeightClass)}>
      <table className="w-full text-sm">
        <thead className={cn(stickyHeader && 'sticky top-0 bg-[#FAFAFA] z-10')}>
          <tr className="text-left text-xs text-[#757575] uppercase tracking-wider border-b border-[#E0E0E0]">
            {columns.map((col) => (
              <th key={col.key} className={cn(headPad, 'font-medium', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={cn(cellPad, 'text-center text-gray-500')}>
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={cn(cellPad, 'text-center text-gray-500 py-10')}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'border-b border-[#F0F0F0] hover:bg-[#FAFAFA]',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn(cellPad, col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
