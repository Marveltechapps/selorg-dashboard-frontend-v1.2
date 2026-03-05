import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { getOperationalAlerts, type OperationalAlertRow } from '@/api/darkstore/operations.api';
import { RefreshCw, AlertTriangle } from 'lucide-react';
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

export function OperationsAlerts() {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<OperationalAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOperationalAlerts({
        storeId: activeStoreId || undefined,
        status: statusFilter || undefined,
      });
      setData(res.data || []);
    } catch (e) {
      toast.error('Failed to load operations alerts');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    websocketService.on('OPERATIONAL_ALERT', handler);
    return () => { websocketService.off('OPERATIONAL_ALERT', handler); };
  }, [load]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Operations Alerts</h1>
          <p className="text-[#757575] text-sm">
            ORDER_SLA_BREACHED, PICKER_INACTIVE, DEVICE_OFFLINE, MULTIPLE_MISSING_ITEMS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
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
          <LoadingState message="Loading operations alerts..." />
        ) : data.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No operations alerts"
            description="No operational alerts match your filters. Alerts are created for SLA breaches, inactive pickers, device offline, and multiple missing items."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {row.alertType}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell className="font-mono text-sm">{row.orderId || '—'}</TableCell>
                  <TableCell>{row.pickerId || '—'}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
