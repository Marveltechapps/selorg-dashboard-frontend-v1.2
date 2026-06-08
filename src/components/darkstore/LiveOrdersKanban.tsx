import React from 'react';
import { Clock, User, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { SlaCountdown } from './SlaCountdown';
import { getPaymentDisplay } from '@/utils/orderPaymentDisplay';
import { mapBackendStatusToUi, isSlaCritical } from '@/utils/orderWorkflow';
const KANBAN_COLUMNS = [
  { id: 'Queued', label: 'Queued', statuses: ['Queued'] },
  { id: 'Assigned', label: 'Assigned', statuses: ['Assigned'] },
  { id: 'Picking', label: 'Picking', statuses: ['Picking'] },
  { id: 'Packing', label: 'Packing', statuses: ['Packing', 'Ready for Dispatch'] },
] as const;

export interface KanbanOrder {
  id: string;
  order_id?: string;
  customer: string;
  items: number;
  sla?: string;
  sla_deadline?: string;
  urgency?: string;
  sla_status?: string;
  status: string;
  assignee?: string;
  order_type?: string;
  payment_status?: string;
  payment_method?: string;
  total_bill?: number;
}

interface LiveOrdersKanbanProps {
  orders: KanbanOrder[];
  onOrderClick: (order: KanbanOrder) => void;
  onQuickAssign?: (order: KanbanOrder) => void;
  className?: string;
}

export function LiveOrdersKanban({ orders, onOrderClick, onQuickAssign, className }: LiveOrdersKanbanProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4', className)}>
      {KANBAN_COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => {
          const ui = mapBackendStatusToUi(o.status);
          return col.statuses.includes(ui as (typeof col.statuses)[number]);
        });

        return (
          <div key={col.id} className="darkstore-card flex flex-col min-h-[320px]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label}</h4>
              <span className="text-xs font-bold tabular-nums bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[520px]">
              {colOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No orders</p>
              ) : (
                colOrders.map((order) => {
                  const pd = getPaymentDisplay(order);
                  const critical = isSlaCritical(order);
                  return (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOrderClick(order)}
                      onKeyDown={(e) => e.key === 'Enter' && onOrderClick(order)}
                      className={cn(
                        'rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md hover:border-[var(--ds-primary)]',
                        critical ? 'border-red-200 bg-red-50/50 ds-sla-critical-row' : 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-slate-800">{order.id}</span>
                        {order.order_type && <StatusBadge variant="orderType" status={order.order_type} />}
                      </div>
                      <p className="text-xs text-slate-600 truncate mb-2">{order.customer}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Package size={10} />
                          {order.items}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {order.assignee && order.assignee !== '-' ? order.assignee : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Clock size={10} className={critical ? 'text-red-500' : 'text-slate-400'} />
                          {order.sla_deadline ? (
                            <SlaCountdown deadline={order.sla_deadline} className="text-xs font-mono font-bold" />
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-700">{order.sla || '—'}</span>
                          )}
                        </div>
                        {pd && <StatusBadge variant="payment" status={pd.label} />}
                      </div>
                      {col.id === 'Queued' && order.assignee === '-' && onQuickAssign && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAssign(order);
                          }}
                          className="mt-2 w-full text-[10px] font-semibold text-[var(--ds-primary)] hover:underline"
                        >
                          Quick assign →
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
