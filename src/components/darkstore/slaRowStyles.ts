import { cn } from '@/lib/utils';
import { isSlaCritical } from '@/utils/orderWorkflow';

export function slaRowClassName(order: { urgency?: string; sla_status?: string }): string {
  if (isSlaCritical(order)) {
    return cn('ds-sla-critical-row border-l-4 border-l-red-500 bg-red-50/40');
  }
  if (order.urgency === 'warning' || order.sla_status === 'warning') {
    return 'border-l-4 border-l-amber-400 bg-amber-50/30';
  }
  return '';
}
