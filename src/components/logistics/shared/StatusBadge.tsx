import React from 'react';
import type { LogisticsStatus } from '@/types/logistics';
import { cn } from '@/lib/utils';

const STYLES: Record<LogisticsStatus, string> = {
  CREATED: 'bg-slate-100 text-slate-700 border-slate-200',
  DRIVER_ASSIGNED: 'bg-sky-100 text-sky-800 border-sky-200',
  PICKED_UP: 'bg-amber-100 text-amber-900 border-amber-200',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  DELIVERED: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  CANCELLED: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  FAILED: 'bg-rose-100 text-rose-900 border-rose-200',
};

export function StatusBadge({ status }: { status: LogisticsStatus | string }) {
  const cls = STYLES[status as LogisticsStatus] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls)}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}
