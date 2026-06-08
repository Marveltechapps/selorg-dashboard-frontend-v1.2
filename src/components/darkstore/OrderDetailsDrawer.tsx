import React, { useEffect, useState } from 'react';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DarkstoreSheetContent } from './DarkstoreSheetContent';
import { getOrderById, getOrderActionLogs } from '@/api/dashboard/orders.api';
import { getOrderWorkflow } from '@/api/darkstore/operations.api';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/ux-components';
import { ActionLogsTimeline } from '@/components/ui/action-logs-timeline';
import { StatusBadge } from './StatusBadge';
import { OrderJourneyStepper } from './OrderJourneyStepper';
import { getPaymentDisplay } from '@/utils/orderPaymentDisplay';
import { RIDER_STATUS_LABELS } from '@/utils/orderWorkflow';
import { Clock, Package, User, MapPin, Bike } from 'lucide-react';
import { slaTextColor } from './statusColors';
import { cn } from '@/lib/utils';

interface OrderDetailsDrawerProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDrawer({ orderId, open, onOpenChange }: OrderDetailsDrawerProps) {
  const { activeStoreId } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      setWorkflow(null);
      setLogs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [orderRes, logsRes, workflowRes] = await Promise.all([
          getOrderById(orderId, activeStoreId || undefined),
          getOrderActionLogs(orderId, 20).catch(() => []),
          getOrderWorkflow(orderId).catch(() => null),
        ]);
        if (!cancelled) {
          setOrder(orderRes?.order ?? orderRes?.data ?? orderRes);
          setWorkflow(workflowRes?.data ?? null);
          setLogs(Array.isArray(logsRes) ? logsRes : []);
        }
      } catch {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orderId, activeStoreId]);

  const pd = order ? getPaymentDisplay(order) : null;
  const timeline = workflow?.timeline || order?.timeline || [];
  const riderLabel = workflow?.riderStatus
    ? RIDER_STATUS_LABELS[workflow.riderStatus.toLowerCase()] || workflow.riderStatus
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <DarkstoreSheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order {orderId}</SheetTitle>
          <SheetDescription>Order journey, SLA, rider handoff, and activity</SheetDescription>
        </SheetHeader>
        {loading ? (
          <LoadingState text="Loading order..." className="py-12" />
        ) : !order ? (
          <p className="text-sm text-slate-500 py-8 text-center">Order not found</p>
        ) : (
          <div className="space-y-6 mt-4 darkstore-fade-in">
            <div className="flex flex-wrap gap-2">
              {order.order_type && <StatusBadge variant="orderType" status={order.order_type} />}
              {pd && <StatusBadge variant="payment" status={pd.label} />}
              {order.sla_status && <StatusBadge variant="sla" status={order.sla_status} />}
            </div>

            <OrderJourneyStepper status={order.status} timeline={timeline} />

            {(riderLabel || workflow?.riderName) && (
              <div className="darkstore-card p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-2 mb-2">
                  <Bike size={16} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-slate-800">Rider Handoff</h4>
                </div>
                {workflow?.riderName && (
                  <p className="text-sm text-slate-700">
                    Rider: <span className="font-medium">{workflow.riderName}</span>
                  </p>
                )}
                {riderLabel && (
                  <p className="text-xs text-slate-500 mt-1">Stage: {riderLabel}</p>
                )}
                {workflow?.readyForDispatch && !riderLabel && (
                  <p className="text-xs text-amber-600 mt-1">Awaiting rider pickup</p>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <User size={16} className="text-slate-400" />
                <span>{order.customer_name || 'Customer'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Package size={16} className="text-slate-400" />
                <span>{order.item_count ?? order.items?.length ?? 0} items</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span className={cn('font-mono font-bold', slaTextColor(order.sla_status))}>
                  {order.sla_timer || '—'}
                </span>
              </div>
              {order.delivery_address && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-xs">{order.delivery_address}</span>
                </div>
              )}
              {(order.assignee || workflow?.pickerName) && (
                <div className="text-slate-600">
                  Picker:{' '}
                  <span className="font-medium text-slate-800">
                    {order.assignee?.name || order.assignee || workflow?.pickerName}
                  </span>
                </div>
              )}
            </div>

            {logs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Audit Trail</h4>
                <ActionLogsTimeline logs={logs} />
              </div>
            )}
          </div>
        )}
      </DarkstoreSheetContent>
    </Sheet>
  );
}
