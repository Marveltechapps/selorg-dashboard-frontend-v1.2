import React, { useState, useEffect, useCallback } from 'react';
import { websocketService } from '@/utils/websocket';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getPickOps, type PickOpsOrder } from '../../api/darkstore/pickers.api';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '../darkstore/DarkstoreDataTable';
import { AlertCard } from '../darkstore/AlertCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { AlertTriangle, Package, ExternalLink } from 'lucide-react';
import { OrderDetailsDrawer } from '../darkstore/OrderDetailsDrawer';
import { Button } from '../ui/button';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns: DarkstoreColumn<PickOpsOrder>[] = [
  {
    key: 'orderId',
    header: 'Order ID',
    sticky: true,
    render: (o) => <span className="font-semibold text-slate-800">{o.orderId}</span>,
  },
  { key: 'picker', header: 'Picker', render: (o) => o.pickerName },
  { key: 'started', header: 'Started At', render: (o) => formatDate(o.startedAt) },
  {
    key: 'progress',
    header: 'Progress',
    render: (o) => (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              o.progress >= 100 ? 'bg-emerald-500' : o.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.min(100, o.progress)}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">{o.progress}%</span>
      </div>
    ),
  },
  {
    key: 'missing',
    header: 'Missing',
    render: (o) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge variant="workflow" status={o.missingItemsCount > 0 ? 'missing_items' : 'clear'} />
        <span className="text-sm font-bold tabular-nums">{o.missingItemsCount}</span>
      </div>
    ),
  },
  {
    key: 'sla',
    header: 'SLA Risk',
    render: (o) => <StatusBadge variant="sla" status={o.slaRisk} />,
  },
  { key: 'zone', header: 'Zone', render: (o) => o.zone || '—' },
  {
    key: 'packStation',
    header: 'Pack Station',
    render: (o) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-semibold">
        {o.packStation || '—'}
      </span>
    ),
  },
  {
    key: 'substitution',
    header: 'Substitution',
    render: (o) =>
      o.missingItemsCount > 0 ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-7 text-xs text-amber-700 px-0"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('darkstore:navigate', { detail: { tab: 'missingitems', orderId: o.orderId } }));
          }}
        >
          <ExternalLink size={12} className="mr-1" />
          Resolve
        </Button>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
  },
];

export function PickPackOpsScreen({
  setActiveTab,
  embedded,
}: { setActiveTab?: (tab: string) => void; embedded?: boolean } = {}) {
  const { activeStoreId } = useAuth();
  const [orders, setOrders] = useState<PickOpsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>();
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const res = await getPickOps({ storeId: activeStoreId || undefined });
      setOrders(res?.data ?? []);
      setLastSync(new Date());
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : 'Failed to load pick ops');
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    const onWs = () => fetchOrders();
    websocketService.on('order:updated', onWs);
    websocketService.on('order:created', onWs);
    websocketService.on('MISSING_ITEM_REPORTED', onWs);
    websocketService.on('missing_item_reported', onWs);
    return () => {
      clearInterval(interval);
      websocketService.off('order:updated', onWs);
      websocketService.off('order:created', onWs);
      websocketService.off('MISSING_ITEM_REPORTED', onWs);
      websocketService.off('missing_item_reported', onWs);
    };
  }, [fetchOrders]);

  const stuckOrders = orders.filter((o) => {
    if (!o.startedAt) return false;
    const elapsedMin = (Date.now() - new Date(o.startedAt).getTime()) / 60000;
    return elapsedMin > 8 && o.progress < 100;
  });

  const content = (
    <>
      {error && (
        <AlertCard title={error} severity="danger" icon={AlertTriangle} className="mb-4" />
      )}
      {stuckOrders.length > 0 && (
        <AlertCard
          title={`${stuckOrders.length} order${stuckOrders.length > 1 ? 's' : ''} stuck in pick/pack > 8 min`}
          subtitle={stuckOrders.map((o) => o.orderId).slice(0, 3).join(', ')}
          severity="warning"
          icon={AlertTriangle}
          className="mb-4"
          actions={[{ label: 'View first', onClick: () => setDrawerOrderId(stuckOrders[0].orderId) }]}
        />
      )}
      <DarkstoreDataTable
        columns={columns}
        data={orders}
        loading={loading}
        rowKey={(o) => o.orderId}
        emptyIcon={Package}
        emptyTitle="No active picks"
        emptyDescription="Orders with status PICKING or ASSIGNED will appear here."
        onRowClick={(o) => setDrawerOrderId(o.orderId)}
        rowClassName={(o) =>
          o.slaRisk === 'critical' ? 'border-l-2 border-l-red-500' : o.slaRisk === 'warning' ? 'border-l-2 border-l-amber-400' : ''
        }
      />
      <OrderDetailsDrawer
        orderId={drawerOrderId}
        open={!!drawerOrderId}
        onOpenChange={(open) => !open && setDrawerOrderId(null)}
      />
    </>
  );

  if (embedded) return content;

  return (
    <DarkstoreScreenShell
      title="Pick & Pack Ops"
      subtitle="Orders currently being picked or assigned"
      toolbar={{
        onRefresh: () => {
          setLoading(true);
          fetchOrders();
        },
        refreshing: loading,
        lastSync,
        showConnection: true,
      }}
    >
      {content}
    </DarkstoreScreenShell>
  );
}
