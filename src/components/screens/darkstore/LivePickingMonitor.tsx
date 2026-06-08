import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { getLivePickingMonitor, type LivePickingRow } from '@/api/darkstore/operations.api';
import { Package, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { OrderDetailsDrawer } from '@/components/darkstore/OrderDetailsDrawer';
import { StatusBadge } from '@/components/darkstore/StatusBadge';
import { toast } from 'sonner';

export function LivePickingMonitor({
  setActiveTab,
  embedded,
}: { setActiveTab?: (tab: string) => void; embedded?: boolean } = {}) {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<LivePickingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>();
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLivePickingMonitor({ storeId: activeStoreId || undefined });
      setData(res.data || []);
      setLastSync(new Date());
    } catch (e) {
      toast.error('Failed to load live picking data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    websocketService.on('order:updated', handler);
    websocketService.on('order:created', handler);
    websocketService.on('MISSING_ITEM_REPORTED', handler);
    websocketService.on('missing_item_reported', handler);
    return () => {
      websocketService.off('order:updated', handler);
      websocketService.off('order:created', handler);
      websocketService.off('MISSING_ITEM_REPORTED', handler);
      websocketService.off('missing_item_reported', handler);
    };
  }, [load]);

  const content = (
    <>
      <div className="darkstore-card overflow-hidden darkstore-content-loaded">
        {loading && data.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading live picking data…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Package className="darkstore-icon-empty text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No active picking</h3>
            <p className="text-sm text-slate-500 max-w-md mb-4">
              No orders are currently in PICKING status. This monitor shows item-level progress for active picks.
            </p>
            {setActiveTab && (
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('liveorders')}>
                <List size={14} className="mr-1.5" />
                View live queue
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {data.map((row) => (
              <div key={row.orderId} className="p-4 hover:bg-slate-50/80 transition-colors">
                <button
                  type="button"
                  className="flex w-full items-center justify-between mb-3 text-left"
                  onClick={() => setDrawerOrderId(row.orderId)}
                >
                  <span className="font-mono font-medium text-slate-900">{row.orderId}</span>
                  <span className="text-sm text-slate-500">
                    {row.pickerName} • {row.progress}% complete
                  </span>
                </button>
                <div className="overflow-x-auto">
                  <table className="darkstore-table w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Product</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Ordered</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Scanned</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Location</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.items.map((item, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">{item.productName}</td>
                          <td className="px-3 py-2 tabular-nums">{item.orderedQty}</td>
                          <td className="px-3 py-2 tabular-nums">{item.scannedQty}</td>
                          <td className="px-3 py-2 text-slate-500">{item.location || '—'}</td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              variant="workflow"
                              status={item.scannedQty >= item.orderedQty ? 'clear' : item.scannedQty > 0 ? 'picking' : 'missing_items'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
      title="Live Picking Monitor"
      subtitle="Item-level progress for orders currently being picked (product, scanned qty, location)"
      toolbar={{ onRefresh: load, refreshing: loading, showConnection: true, lastSync }}
    >
      {content}
    </DarkstoreScreenShell>
  );
}
