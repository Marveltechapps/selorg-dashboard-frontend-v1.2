import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { getMissingItems, type MissingItemRow } from '@/api/darkstore/operations.api';
import { PackageX, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '@/components/darkstore/DarkstoreDataTable';
import { OrderDetailsDrawer } from '@/components/darkstore/OrderDetailsDrawer';
import { toast } from 'sonner';

const formatDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString();
};

const columns: DarkstoreColumn<MissingItemRow>[] = [
  {
    key: 'product',
    header: 'Product',
    sticky: true,
    render: (row) => <span className="font-medium text-slate-800">{row.productName}</span>,
  },
  {
    key: 'orderId',
    header: 'Order ID',
    render: (row) => <span className="font-mono text-sm">{row.orderId}</span>,
  },
  { key: 'picker', header: 'Picker', render: (row) => row.pickerName },
  { key: 'ordered', header: 'Ordered', render: (row) => row.orderedQty },
  { key: 'scanned', header: 'Scanned', render: (row) => row.scannedQty },
  {
    key: 'reason',
    header: 'Reason',
    render: (row) => (
      <span className="max-w-[200px] truncate block" title={row.reason}>
        {row.reason || '—'}
      </span>
    ),
  },
  {
    key: 'reportedAt',
    header: 'Reported At',
    render: (row) => <span className="text-sm text-slate-500">{formatDate(row.reportedAt)}</span>,
  },
];

export function MissingItemTracker({
  initialOrderFilter = '',
  setActiveTab,
}: {
  initialOrderFilter?: string;
  setActiveTab?: (tab: string) => void;
} = {}) {
  const [orderFilter, setOrderFilter] = useState(initialOrderFilter);
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<MissingItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>();
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderFilter) setOrderFilter(initialOrderFilter);
  }, [initialOrderFilter]);

  const load = useCallback(async (orderId?: string) => {
    setLoading(true);
    try {
      const res = await getMissingItems({
        storeId: activeStoreId || undefined,
        orderId: orderId ?? (orderFilter || undefined),
      });
      setData(res.data || []);
      setLastSync(new Date());
    } catch (e) {
      toast.error('Failed to load missing items');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, orderFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const reloadOnMissing = (payload?: { missingItems?: unknown; order_id?: string; orderId?: string }) => {
      if (!payload || payload.missingItems || payload.order_id || payload.orderId) {
        load();
      }
    };
    websocketService.on('MISSING_ITEM_REPORTED', reloadOnMissing);
    websocketService.on('missing_item_reported', reloadOnMissing);
    websocketService.on('ORDER_COMPLETED', reloadOnMissing);
    websocketService.on('order:updated', reloadOnMissing);
    return () => {
      websocketService.off('MISSING_ITEM_REPORTED', reloadOnMissing);
      websocketService.off('missing_item_reported', reloadOnMissing);
      websocketService.off('ORDER_COMPLETED', reloadOnMissing);
      websocketService.off('order:updated', reloadOnMissing);
    };
  }, [load]);

  return (
    <DarkstoreScreenShell
      title="Missing Item Tracker"
      subtitle="Product, order, picker, and reason for items reported missing during picking"
      toolbar={{
        onRefresh: () => load(),
        refreshing: loading,
        showConnection: true,
        lastSync,
        filters: (
          <Input
            placeholder="Filter by Order ID"
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="w-48 h-8"
          />
        ),
      }}
    >
      <DarkstoreDataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => `${row.orderId}-${row.productName}-${row.reportedAt}`}
        onRowClick={(row) => setDrawerOrderId(row.orderId)}
        emptyIcon={PackageX}
        emptyTitle="No missing items"
        emptyDescription="No missing item reports found. Missing items are recorded when pickers report items not found during picking."
        emptyAction={
          setActiveTab ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('pickpackops')}>
              <List size={14} className="mr-1.5" />
              View Pick & Pack
            </Button>
          ) : undefined
        }
      />

      <OrderDetailsDrawer
        orderId={drawerOrderId}
        open={!!drawerOrderId}
        onOpenChange={(open) => !open && setDrawerOrderId(null)}
      />
    </DarkstoreScreenShell>
  );
}
