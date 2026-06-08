/** Semantic status colors for Darkstore dashboard — single source of truth */

export type SlaStatus = 'safe' | 'warning' | 'critical';
export type OrderType = 'Normal' | 'Priority' | 'Express';
export type AlertSeverity = 'info' | 'warning' | 'danger' | 'success';

export const DS_COLORS = {
  primary: 'var(--ds-primary)',
  success: 'var(--ds-success)',
  warning: 'var(--ds-warning)',
  danger: 'var(--ds-danger)',
  surface: 'var(--ds-surface)',
  border: 'var(--ds-border)',
  muted: 'var(--ds-muted)',
  text: 'var(--ds-text)',
  textMuted: 'var(--ds-text-muted)',
} as const;

export const SLA_STATUS_STYLES: Record<SlaStatus, { text: string; bg: string; border: string }> = {
  safe: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  warning: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

export const ORDER_TYPE_STYLES: Record<string, { text: string; bg: string }> = {
  Normal: { text: 'text-blue-700', bg: 'bg-blue-50' },
  Priority: { text: 'text-amber-700', bg: 'bg-amber-50' },
  Express: { text: 'text-red-700', bg: 'bg-red-50' },
};

export const EXCEPTION_TYPE_STYLES: Record<string, { text: string; bg: string }> = {
  missing_item: { text: 'text-amber-800', bg: 'bg-amber-100' },
  sla_breach: { text: 'text-red-800', bg: 'bg-red-100' },
  cancellation: { text: 'text-slate-700', bg: 'bg-slate-100' },
  rto: { text: 'text-orange-800', bg: 'bg-orange-100' },
  stock_out: { text: 'text-amber-800', bg: 'bg-amber-100' },
  ops_alert: { text: 'text-violet-800', bg: 'bg-violet-100' },
};

export const ISSUE_STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  open: { text: 'text-red-700', bg: 'bg-red-50' },
  assigned: { text: 'text-amber-700', bg: 'bg-amber-50' },
  closed: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

export const SEVERITY_STYLES: Record<string, { text: string; bg: string }> = {
  low: { text: 'text-slate-700', bg: 'bg-slate-100' },
  medium: { text: 'text-amber-700', bg: 'bg-amber-50' },
  high: { text: 'text-red-700', bg: 'bg-red-50' },
};

export const WORKFLOW_STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  pending: { text: 'text-orange-600', bg: 'bg-orange-50' },
  in_progress: { text: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  received: { text: 'text-blue-600', bg: 'bg-blue-50' },
  rejected: { text: 'text-red-500', bg: 'bg-red-50' },
  damaged: { text: 'text-red-500', bg: 'bg-red-50' },
  active: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  inactive: { text: 'text-slate-600', bg: 'bg-slate-100' },
  online: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  offline: { text: 'text-slate-600', bg: 'bg-slate-100' },
  error: { text: 'text-red-500', bg: 'bg-red-50' },
  break: { text: 'text-amber-600', bg: 'bg-amber-50' },
  open: { text: 'text-red-500', bg: 'bg-red-50' },
  resolved: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  ready: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  eligible: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  at_risk: { text: 'text-amber-600', bg: 'bg-amber-50' },
  charging: { text: 'text-sky-600', bg: 'bg-sky-50' },
  meeting: { text: 'text-violet-600', bg: 'bg-violet-50' },
  scanning: { text: 'text-blue-600', bg: 'bg-blue-50' },
  picking: { text: 'text-indigo-600', bg: 'bg-indigo-50' },
  packing: { text: 'text-violet-600', bg: 'bg-violet-50' },
  inprogress: { text: 'text-blue-600', bg: 'bg-blue-50' },
  paused: { text: 'text-amber-600', bg: 'bg-amber-50' },
  clear: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  qc: { text: 'text-violet-600', bg: 'bg-violet-50' },
  idle: { text: 'text-slate-600', bg: 'bg-slate-100' },
  assigned: { text: 'text-sky-700', bg: 'bg-sky-50' },
  not_assigned: { text: 'text-slate-600', bg: 'bg-slate-100' },
  n_a: { text: 'text-slate-500', bg: 'bg-slate-100' },
  ok: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  fail: { text: 'text-red-700', bg: 'bg-red-50' },
  critical: { text: 'text-red-500', bg: 'bg-red-50' },
  ready_to_dispatch: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  available: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  on_break: { text: 'text-amber-700', bg: 'bg-amber-50' },
  device_idle: { text: 'text-slate-600', bg: 'bg-slate-100' },
  packing: { text: 'text-violet-600', bg: 'bg-violet-50' },
  operational: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  degraded: { text: 'text-amber-600', bg: 'bg-amber-50' },
  down: { text: 'text-red-600', bg: 'bg-red-50' },
  adjustment: { text: 'text-blue-700', bg: 'bg-blue-100' },
  scan: { text: 'text-violet-700', bg: 'bg-violet-100' },
  shrink: { text: 'text-red-500', bg: 'bg-red-50' },
  surplus: { text: 'text-amber-600', bg: 'bg-orange-50' },
  next_task: { text: 'text-white', bg: 'bg-blue-600' },
  picked: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  not_found: { text: 'text-red-700', bg: 'bg-red-50' },
  ready_for_dispatch: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  queued: { text: 'text-slate-600', bg: 'bg-slate-100' },
  add: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  remove: { text: 'text-red-500', bg: 'bg-red-50' },
  compliant: { text: 'text-emerald-800', bg: 'bg-emerald-50' },
  below_target: { text: 'text-red-800', bg: 'bg-red-50' },
  audit_passed: { text: 'text-emerald-800', bg: 'bg-emerald-50' },
  m: { text: 'text-sky-600', bg: 'bg-sky-50' },
  a: { text: 'text-amber-600', bg: 'bg-amber-50' },
  n: { text: 'text-violet-600', bg: 'bg-violet-50' },
  off_duty: { text: 'text-slate-400', bg: 'bg-slate-100' },
  cod: { text: 'text-amber-700', bg: 'bg-amber-50' },
  upi: { text: 'text-violet-700', bg: 'bg-violet-50' },
  card: { text: 'text-blue-700', bg: 'bg-blue-50' },
  paid: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  failed: { text: 'text-red-700', bg: 'bg-red-50' },
  auto_dispatch: { text: 'text-blue-600', bg: 'bg-blue-50' },
  clear: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  missing_items: { text: 'text-amber-800', bg: 'bg-amber-50' },
};

/** Override display text for workflow badges where raw key is not user-friendly */
export const WORKFLOW_LABELS: Record<string, string> = {
  m: 'M',
  a: 'A',
  n: 'N',
  off_duty: 'OFF',
  next_task: 'Next Task',
  ready_to_dispatch: 'Ready to Dispatch',
  ready_for_dispatch: 'Ready for Dispatch',
  not_found: 'Not Found',
  on_break: 'On Break',
  device_idle: 'Idle',
  at_risk: 'At Risk',
  not_assigned: 'Not Assigned',
  n_a: 'N/A',
  auto_dispatch: 'Auto-Dispatch ON',
  below_target: 'Below Target',
  audit_passed: 'Audit Passed',
  missing_items: 'Missing',
};

export const ISSUE_TAG_STYLES: Record<string, { text: string; bg: string }> = {
  cancellation: { text: 'text-white', bg: 'bg-red-500' },
  refund: { text: 'text-white', bg: 'bg-amber-500' },
  support: { text: 'text-white', bg: 'bg-blue-500' },
  missing: { text: 'text-white', bg: 'bg-orange-500' },
};

export const PAYMENT_STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  Paid: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  COD: { text: 'text-amber-700', bg: 'bg-amber-50' },
  Pending: { text: 'text-slate-600', bg: 'bg-slate-100' },
  Failed: { text: 'text-red-700', bg: 'bg-red-50' },
  Refunded: { text: 'text-violet-700', bg: 'bg-violet-50' },
};

export const STOCK_STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  'In Stock': { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Out of Stock': { text: 'text-red-500', bg: 'bg-red-50' },
  'Low Stock': { text: 'text-amber-600', bg: 'bg-amber-50' },
  Overstocked: { text: 'text-indigo-700', bg: 'bg-indigo-50' },
};

export function slaTextColor(status?: string): string {
  if (status === 'critical') return 'text-red-600';
  if (status === 'warning') return 'text-amber-500';
  return 'text-slate-800';
}
