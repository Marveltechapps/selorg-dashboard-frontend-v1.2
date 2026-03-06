import React, { useState, useEffect, useCallback } from 'react';
import { websocketService } from '@/utils/websocket';
import { useAuth } from '@/contexts/AuthContext';
import { getExceptionQueue, type ExceptionQueueRow } from '@/api/darkstore/operations.api';
import { RefreshCw, AlertTriangle, PackageX, Clock, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: React.ElementType; className: string }> = {
    missing_item: { icon: PackageX, className: 'bg-amber-100 text-amber-800' },
    sla_breach: { icon: Clock, className: 'bg-red-100 text-red-800' },
    cancellation: { icon: Ban, className: 'bg-gray-100 text-gray-800' },
    rto: { icon: RotateCcw, className: 'bg-orange-100 text-orange-800' },
  };
  const c = config[type] || { icon: AlertTriangle, className: 'bg-gray-100 text-gray-800' };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      <Icon size={12} />
      {type.replace('_', ' ')}
    </span>
  );
}

export function ExceptionQueue() {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<ExceptionQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExceptionQueue({
        storeId: activeStoreId || undefined,
        type: typeFilter || undefined,
        status: 'open',
        page,
        limit: 20,
      });
      setData(res.data || []);
      setPagination(res.pagination || null);
    } catch (e) {
      toast.error('Failed to load exception queue');
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, typeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    websocketService.on('order:updated', handler);
    websocketService.on('order:created', handler);
    websocketService.on('MISSING_ITEM_REPORTED', handler);
    return () => {
      websocketService.off('order:updated', handler);
      websocketService.off('order:created', handler);
      websocketService.off('MISSING_ITEM_REPORTED', handler);
    };
  }, [load]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Exception Queue</h1>
          <p className="text-[#757575] text-sm">
            Unified view of pick exceptions: missing items, SLA breaches, cancellations, RTO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="missing_item">Missing Item</SelectItem>
              <SelectItem value="sla_breach">SLA Breach</SelectItem>
              <SelectItem value="cancellation">Cancellation</SelectItem>
              <SelectItem value="rto">RTO</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#e4e4e7] bg-white overflow-hidden">
        {loading ? (
          <LoadingState message="Loading exception queue..." />
        ) : data.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No exceptions"
            description="No pick exceptions in the queue. Exceptions include missing items, SLA breaches, cancellations, and RTO."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead>Product / Reason</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={`${row.orderId}-${row.type}-${idx}`}>
                  <TableCell><TypeBadge type={row.type} /></TableCell>
                  <TableCell className="font-mono text-sm">{row.orderId}</TableCell>
                  <TableCell>{row.storeId || '—'}</TableCell>
                  <TableCell>{row.pickerName}</TableCell>
                  <TableCell>
                    <span className="font-medium">{row.product}</span>
                    {row.reason && row.reason !== row.product && (
                      <span className="text-[#71717a] text-sm block">{row.reason}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#71717a]">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between text-sm text-[#71717a]">
          <span>
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
