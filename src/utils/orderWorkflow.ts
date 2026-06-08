/**
 * Canonical q-commerce order lifecycle — single source of truth for Darkstore UI.
 */

export type PipelineStage =
  | 'queued'
  | 'assigned'
  | 'picking'
  | 'packing'
  | 'ready_dispatch'
  | 'handed_off'
  | 'delivered'
  | 'exception';

export type UiOrderStatus =
  | 'Queued'
  | 'Assigned'
  | 'Picking'
  | 'Packing'
  | 'Ready for Dispatch'
  | 'Cancelled'
  | 'RTO'
  | 'Delivered';

export interface WorkflowStep {
  id: PipelineStage;
  label: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'queued', label: 'Queued', description: 'Order received' },
  { id: 'assigned', label: 'Assigned', description: 'Picker assigned' },
  { id: 'picking', label: 'Picking', description: 'Items being picked' },
  { id: 'packing', label: 'Packing', description: 'QC & bagging' },
  { id: 'ready_dispatch', label: 'Ready', description: 'Awaiting rider' },
  { id: 'handed_off', label: 'Handed Off', description: 'Rider collected' },
  { id: 'delivered', label: 'Delivered', description: 'Customer received' },
];

const BACKEND_TO_UI: Record<string, UiOrderStatus> = {
  new: 'Queued',
  queued: 'Queued',
  pending: 'Queued',
  processing: 'Assigned',
  ASSIGNED: 'Assigned',
  assigned: 'Assigned',
  PICKING: 'Picking',
  picking: 'Picking',
  ready: 'Packing',
  PICKED: 'Packing',
  picked: 'Packing',
  PACKED: 'Packing',
  packed: 'Packing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  ready_for_dispatch: 'Ready for Dispatch',
  completed: 'Delivered',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  CANCELLED: 'Cancelled',
  rto: 'RTO',
};

const UI_TO_API: Record<string, string> = {
  Queued: 'new',
  Assigned: 'ASSIGNED',
  Picking: 'PICKING',
  Packing: 'PACKED',
  'Ready for Dispatch': 'READY_FOR_DISPATCH',
};

export function mapBackendStatusToUi(status: string): UiOrderStatus {
  return BACKEND_TO_UI[status] || (status as UiOrderStatus);
}

export function toApiStatus(status: string): string {
  return UI_TO_API[status] || status;
}

export function getPipelineStage(status: string): PipelineStage {
  const s = (status || '').toLowerCase();
  if (['cancelled', 'rto'].includes(s)) return 'exception';
  if (s === 'new' || s === 'queued' || s === 'pending') return 'queued';
  if (s === 'processing' || s === 'assigned') return 'assigned';
  if (s === 'picking') return 'picking';
  if (s === 'ready' || s === 'picked' || s === 'packed') return 'packing';
  if (s === 'ready_for_dispatch') return 'ready_dispatch';
  if (['out_for_delivery', 'arrived_at_darkstore', 'picked', 'arrived_at_customer'].includes(s)) return 'handed_off';
  if (['completed', 'delivered'].includes(s)) return 'delivered';
  return 'queued';
}

export function getWorkflowStepIndex(stage: PipelineStage): number {
  const order: PipelineStage[] = ['queued', 'assigned', 'picking', 'packing', 'ready_dispatch', 'handed_off', 'delivered'];
  const idx = order.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

export function isSlaCritical(order: { urgency?: string; sla_status?: string }): boolean {
  return order.urgency === 'critical' || order.sla_status === 'critical';
}

export function isUnassigned(order: { assignee?: string; assigneeId?: string; pickerAssignment?: { pickerId?: string } }): boolean {
  const hasAssignee = Boolean(order.assignee && order.assignee !== '-');
  const hasId = Boolean(order.assigneeId || order.pickerAssignment?.pickerId);
  return !hasAssignee && !hasId;
}

export function isExpressOrder(order: { order_type?: string }): boolean {
  return ['Express', 'Priority', 'Premium'].includes(order.order_type || '');
}

export const RIDER_STATUS_LABELS: Record<string, string> = {
  assigned: 'Rider assigned',
  arrived_at_darkstore: 'At darkstore',
  picked: 'Bag collected',
  out_for_delivery: 'Out for delivery',
  arrived_at_customer: 'At customer',
  delivered: 'Delivered',
};

export function getRiderStageFromTimeline(timeline: { status: string }[] = []): string | null {
  const riderStatuses = ['assigned', 'arrived_at_darkstore', 'picked', 'out_for_delivery', 'arrived_at_customer', 'delivered'];
  for (let i = timeline.length - 1; i >= 0; i--) {
    const st = (timeline[i]?.status || '').toLowerCase();
    if (riderStatuses.includes(st)) return st;
  }
  return null;
}

export function getUnassignedMinutes(order: { created_at?: string; status?: string; assignee?: string; assigneeId?: string; pickerAssignment?: { pickerId?: string } }): number {
  if (!isUnassigned(order)) return 0;
  const created = order.created_at ? new Date(order.created_at).getTime() : 0;
  if (!created) return 0;
  return Math.floor((Date.now() - created) / 60000);
}

export function isOrderException(order: {
  status?: string;
  urgency?: string;
  sla_status?: string;
  rto_risk?: boolean;
  rto_status?: string;
  missing_items_count?: number;
}): boolean {
  if (isSlaCritical(order)) return true;
  if (order.rto_risk || order.rto_status) return true;
  if (['Cancelled', 'cancelled', 'RTO', 'rto'].includes(order.status || '')) return true;
  if ((order.missing_items_count ?? 0) > 0) return true;
  if (order.urgency === 'warning' || order.sla_status === 'warning') return true;
  return false;
}

export function shouldSuggestReassign(order: {
  created_at?: string;
  status?: string;
  assignee?: string;
  assigneeId?: string;
  pickerAssignment?: { pickerId?: string };
}): boolean {
  return getUnassignedMinutes(order) >= 3 && ['Queued', 'new', 'queued', 'pending'].includes(order.status || '');
}

/** Breadcrumb workflow context labels per screen */
export const WORKFLOW_CONTEXT: Record<string, string> = {
  overview: 'Command Center',
  'my-shift': 'My Shift',
  liveorders: 'Fulfillment',
  'exception-inbox': 'Exceptions',
  slamonitor: 'SLA',
  pickpackops: 'Fulfillment › Pick & Pack',
  livepickerboard: 'Fulfillment › Picker Board',
  livepickingmonitor: 'Fulfillment › Live Picking',
  missingitems: 'Inventory › Missing Items',
  regional: 'Multi-Store Command',
};
