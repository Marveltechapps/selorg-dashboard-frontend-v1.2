/** Mobile-aligned delivery workflow statuses for ops dashboards. */
export const MOBILE_ORDER_STATUS_LABELS: Record<string, string> = {
  assigned: 'Awaiting rider accept',
  arrived_at_darkstore: 'At darkstore — collecting bag',
  picked: 'Out for delivery',
  out_for_delivery: 'En route to customer',
  arrived_at_customer: 'At customer — OTP pending',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delayed: 'Delayed',
  rto: 'Return to origin',
  pending: 'Pending dispatch',
  ready_for_dispatch: 'Ready for dispatch',
};

export function formatOrderStatusLabel(status: string): string {
  const key = (status || '').toLowerCase();
  if (MOBILE_ORDER_STATUS_LABELS[key]) return MOBILE_ORDER_STATUS_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildMobileWorkflowTimeline(status: string): { step: string; done: boolean }[] {
  const s = (status || '').toLowerCase();
  const steps = [
    { step: 'Assigned', key: 'assigned' },
    { step: 'Travel to hub', key: 'travel' },
    { step: 'Collect bag', key: 'arrived_at_darkstore' },
    { step: 'Navigate to customer', key: 'picked' },
    { step: 'OTP verification', key: 'arrived_at_customer' },
    { step: 'Delivery photo', key: 'photo' },
    { step: 'Complete', key: 'delivered' },
  ];
  const order = ['assigned', 'arrived_at_darkstore', 'picked', 'out_for_delivery', 'arrived_at_customer', 'delivered'];
  const idx = order.indexOf(s === 'out_for_delivery' ? 'picked' : s);
  return steps.map((step, i) => ({
    step: step.step,
    done: s === 'delivered' ? true : idx >= 0 && i <= idx + (s === 'assigned' ? 0 : s === 'arrived_at_customer' ? 4 : 0),
  }));
}
