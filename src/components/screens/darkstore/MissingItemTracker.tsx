import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { getMissingItems, type MissingItemRow } from '@/api/darkstore/operations.api';
import { RefreshCw, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function MissingItemTracker() {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<MissingItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('');

  const load = useCallback(async (orderId?: string) => {
    setLoading(true);
    try {
      const res = await getMissingItems({
        storeId: activeStoreId || undefined,
        orderId: orderId ?? orderFilter || undefined,
      });
      setData(res.data || []);
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
    const handler = () => load();
    websocketService.on('MISSING_ITEM_REPORTED', handler);
    return () => { websocketService.off('MISSING_ITEM_REPORTED', handler); };
  }, [load]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  const filteredData = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Missing Item Tracker</h1>
          <p className="text-[#757575] text-sm">
            Product, order, picker, and reason for items reported missing during picking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filter by Order ID"
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#e4e4e7] bg-white overflow-hidden">
        {loading ? (
          <LoadingState message="Loading missing items..." />
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title="No missing items"
            description="No missing item reports found. Missing items are recorded when pickers report items not found during picking."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Scanned</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reported At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow key={`${row.orderId}-${row.productName}-${idx}`}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell className="font-mono text-sm">{row.orderId}</TableCell>
                  <TableCell>{row.pickerName}</TableCell>
                  <TableCell>{row.orderedQty}</TableCell>
                  <TableCell>{row.scannedQty}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={row.reason}>
                    {row.reason || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-[#71717a]">{formatDate(row.reportedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
