import React, { useCallback, useEffect, useState } from 'react';
import { Package, CheckCircle2, AlertTriangle, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '@/components/darkstore/DarkstoreDataTable';
import { MetricCard } from '@/components/darkstore/MetricCard';
import { StatusBadge } from '@/components/darkstore/StatusBadge';
import { StoreRequiredGuard } from '@/components/darkstore/StoreRequiredGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, LoadingState } from '@/components/ui/ux-components';
import {
  getPackQueue,
  getOrderDetails,
  scanItem,
  completeOrder,
  reportMissingItem,
  type PackQueueOrder,
  type PackOrderDetail,
} from '@/api/darkstore/packing.api';

const queueColumns: DarkstoreColumn<PackQueueOrder>[] = [
  {
    key: 'id',
    header: 'Order ID',
    sticky: true,
    render: (o) => <span className="font-semibold text-slate-800">{o.id}</span>,
  },
  { key: 'picker', header: 'Picker', render: (o) => o.picker || '—' },
  { key: 'items', header: 'Items', render: (o) => o.items },
  { key: 'sla', header: 'SLA', render: (o) => o.sla || '—' },
  {
    key: 'status',
    header: 'Status',
    render: (o) => <StatusBadge variant="workflow" status={o.status === 'packing' ? 'packing' : 'pending'} />,
  },
];

export function PackingStationScreen({ embedded }: { embedded?: boolean } = {}) {
  const { activeStoreId } = useAuth();
  const [queue, setQueue] = useState<PackQueueOrder[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, packing: 0 });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<PackOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scanSku, setScanSku] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      const res = await getPackQueue({ storeId: activeStoreId });
      const data = res?.data;
      setQueue(data?.orders ?? []);
      setSummary({
        total: data?.summary?.total ?? 0,
        pending: data?.summary?.pending ?? 0,
        packing: data?.summary?.packing ?? 0,
      });
      setLastSync(new Date());
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  const loadDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    try {
      const res = await getOrderDetails(orderId);
      setOrderDetail(res?.data ?? null);
    } catch {
      setOrderDetail(null);
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchQueue();
    const interval = setInterval(fetchQueue, 20000);
    const onWs = () => fetchQueue();
    websocketService.on('order:updated', onWs);
    return () => {
      clearInterval(interval);
      websocketService.off('order:updated', onWs);
    };
  }, [fetchQueue]);

  useEffect(() => {
    if (selectedOrderId) loadDetail(selectedOrderId);
    else setOrderDetail(null);
  }, [selectedOrderId, loadDetail]);

  const handleScan = async () => {
    if (!selectedOrderId || !scanSku.trim()) return;
    setActionLoading(true);
    try {
      const res = await scanItem(selectedOrderId, scanSku.trim(), 1);
      setOrderDetail(res?.data ?? orderDetail);
      setScanSku('');
      toast.success('Item scanned');
      fetchQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    try {
      await completeOrder(selectedOrderId);
      toast.success('Packing completed');
      setSelectedOrderId(null);
      fetchQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Complete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportMissing = async (sku: string) => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    try {
      await reportMissingItem(selectedOrderId, sku, 1, 'Missing at pack station');
      toast.success('Missing item reported');
      loadDetail(selectedOrderId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Report failed');
    } finally {
      setActionLoading(false);
    }
  };

  const body = (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard label="In Queue" value={summary.total} icon={Package} />
          <MetricCard label="Pending" value={summary.pending} icon={AlertTriangle} accent="warning" />
          <MetricCard label="Packing" value={summary.packing} icon={Scan} accent="purple" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            {loading && queue.length === 0 ? (
              <LoadingState message="Loading pack queue…" />
            ) : queue.length === 0 ? (
              <EmptyState icon={Package} title="No orders in pack queue" description="Orders appear here after picking is complete." />
            ) : (
              <DarkstoreDataTable
                columns={queueColumns}
                data={queue}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedOrderId(row.id)}
                rowClassName={(row) => (row.id === selectedOrderId ? 'bg-blue-50/60' : '')}
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedOrderId ? (
              <EmptyState icon={Scan} title="Select an order" description="Choose an order from the queue to scan items and complete packing." />
            ) : detailLoading ? (
              <LoadingState message="Loading order…" />
            ) : orderDetail ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{orderDetail.id}</h3>
                    <p className="text-sm text-slate-500">{orderDetail.customerName}</p>
                    <p className="text-xs text-slate-400 mt-1">Picker: {orderDetail.picker || '—'}</p>
                  </div>
                  <StatusBadge variant="sla" status={orderDetail.slaStatus || 'normal'} />
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Scan SKU…"
                    value={scanSku}
                    onChange={(e) => setScanSku(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  />
                  <Button onClick={handleScan} disabled={actionLoading || !scanSku.trim()}>
                    <Scan size={16} className="mr-1" />
                    Scan
                  </Button>
                </div>

                <ul className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {(orderDetail.items ?? []).map((item) => (
                    <li key={item.sku} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku} · qty {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge variant="workflow" status={item.status === 'scanned' ? 'completed' : item.status === 'missing' ? 'missing_items' : 'pending'} />
                        {item.status !== 'scanned' && item.status !== 'missing' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-700"
                            onClick={() => handleReportMissing(item.sku)}
                            disabled={actionLoading}
                          >
                            Missing
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <Button className="w-full" onClick={handleComplete} disabled={actionLoading}>
                  <CheckCircle2 size={16} className="mr-2" />
                  Complete Packing
                </Button>
              </div>
            ) : (
              <EmptyState icon={AlertTriangle} title="Order not found" />
            )}
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <StoreRequiredGuard title="Select a store for Packing Station">{body}</StoreRequiredGuard>;
  }

  return (
    <StoreRequiredGuard title="Select a store for Packing Station">
      <DarkstoreScreenShell
        title="Packing Station"
        subtitle="Scan-verify items and complete packing before dispatch"
        toolbar={{ onRefresh: fetchQueue, refreshing: loading, lastSync, showConnection: true }}
      >
        {body}
      </DarkstoreScreenShell>
    </StoreRequiredGuard>
  );
}
