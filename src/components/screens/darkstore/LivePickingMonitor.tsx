import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLivePickingMonitor, type LivePickingRow } from '@/api/darkstore/operations.api';
import { RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/ux-components';
import { toast } from 'sonner';

export function LivePickingMonitor() {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<LivePickingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLivePickingMonitor({ storeId: activeStoreId || undefined });
      setData(res.data || []);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Live Picking Monitor</h1>
          <p className="text-[#757575] text-sm">
            Item-level progress for orders currently being picked (product, scanned qty, location)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-[#e4e4e7] bg-white overflow-hidden">
        {loading ? (
          <LoadingState message="Loading live picking data..." />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No active picking"
            description="No orders are currently in PICKING status. This monitor shows item-level progress for active picks."
          />
        ) : (
          <div className="divide-y divide-[#e4e4e7]">
            {data.map((row) => (
              <div key={row.orderId} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-medium text-[#18181b]">{row.orderId}</span>
                  <span className="text-sm text-[#71717a]">
                    {row.pickerName} • {row.progress}% complete
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Scanned</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {row.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.orderedQty}</TableCell>
                        <TableCell>{item.scannedQty}</TableCell>
                        <TableCell className="text-sm text-[#71717a]">{item.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
