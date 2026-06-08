import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/ux-components';
import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface DarkstoreColumn<T> {
  key: string;
  header: string;
  className?: string;
  sticky?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DarkstoreDataTableProps<T> {
  columns: DarkstoreColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  className?: string;
}

export function DarkstoreDataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = 'No data',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  rowKey,
  rowClassName,
  className,
}: DarkstoreDataTableProps<T>) {
  if (loading && data.length === 0) {
    return (
      <div className={cn('darkstore-card overflow-hidden', className)}>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <div className={cn('darkstore-card', className)}>
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className={cn('darkstore-card overflow-hidden darkstore-content-loaded', className)}>
      <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
        <Table className="darkstore-table">
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50',
                    col.sticky && 'sticky left-0 z-30',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <LoadingState text="Loading..." size="sm" />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(
                    'hover:bg-slate-50/80 transition-colors',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.sticky && 'sticky left-0 bg-white z-10', col.className)}
                    >
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
