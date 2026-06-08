import React from 'react';
import { cn } from '@/lib/utils';
import {
  SLA_STATUS_STYLES,
  ORDER_TYPE_STYLES,
  EXCEPTION_TYPE_STYLES,
  ISSUE_STATUS_STYLES,
  SEVERITY_STYLES,
  WORKFLOW_STATUS_STYLES,
  WORKFLOW_LABELS,
  STOCK_STATUS_STYLES,
  PAYMENT_STATUS_STYLES,
  ISSUE_TAG_STYLES,
  type SlaStatus,
} from './statusColors';

type BadgeVariant =
  | 'sla'
  | 'orderType'
  | 'exception'
  | 'live'
  | 'payment'
  | 'issue'
  | 'severity'
  | 'workflow'
  | 'stock'
  | 'issueTag';

interface StatusBadgeProps {
  variant: BadgeVariant;
  status: string;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ variant, status, className, pulse }: StatusBadgeProps) {
  if (variant === 'live') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
          'bg-emerald-50 text-emerald-700 border border-emerald-200',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full bg-emerald-600', pulse && 'animate-pulse')} />
        Live
      </span>
    );
  }

  if (variant === 'sla') {
    const s = (status as SlaStatus) in SLA_STATUS_STYLES ? (status as SlaStatus) : 'safe';
    const style = SLA_STATUS_STYLES[s];
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase',
          style.bg,
          style.text,
          s === 'critical' && 'ds-sla-critical',
          className
        )}
      >
        {status}
      </span>
    );
  }

  if (variant === 'orderType') {
    const style = ORDER_TYPE_STYLES[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100' };
    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase', style.bg, style.text, className)}>
        {status}
      </span>
    );
  }

  if (variant === 'exception') {
    const style = EXCEPTION_TYPE_STYLES[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100' };
    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize', style.bg, style.text, className)}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  }

  if (variant === 'issue') {
    const style = ISSUE_STATUS_STYLES[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100' };
    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold capitalize', style.bg, style.text, className)}>
        {status}
      </span>
    );
  }

  if (variant === 'severity') {
    const style = SEVERITY_STYLES[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100' };
    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold capitalize', style.bg, style.text, className)}>
        {status}
      </span>
    );
  }

  if (variant === 'workflow') {
    const key = status.toLowerCase().replace(/\s+/g, '_');
    const style = WORKFLOW_STATUS_STYLES[key] ?? { text: 'text-slate-600', bg: 'bg-slate-100' };
    const label = WORKFLOW_LABELS[key] ?? status.replace(/_/g, ' ');
    return (
      <span
        className={cn(
          'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase',
          style.bg,
          style.text,
          className
        )}
      >
        {label}
      </span>
    );
  }

  if (variant === 'issueTag') {
    const key = status.toLowerCase().replace(/\s+/g, '_');
    const style = ISSUE_TAG_STYLES[key] ?? { text: 'text-white', bg: 'bg-slate-600' };
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase',
          style.bg,
          style.text,
          className
        )}
      >
        {status}
      </span>
    );
  }

  if (variant === 'payment') {
    const style = PAYMENT_STATUS_STYLES[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100' };
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
          style.bg,
          style.text,
          className
        )}
      >
        {status}
      </span>
    );
  }

  if (variant === 'stock') {
    const style = STOCK_STATUS_STYLES[status] ?? { text: 'text-emerald-600', bg: 'bg-emerald-50' };
    return (
      <span
        className={cn(
          'inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
          style.bg,
          style.text,
          className
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700', className)}>
      {status}
    </span>
  );
}
