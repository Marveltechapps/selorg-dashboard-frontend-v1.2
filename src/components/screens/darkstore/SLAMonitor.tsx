import React, { useState, useEffect, useCallback } from 'react';
import { websocketService } from '@/utils/websocket';
import { useAuth } from '@/contexts/AuthContext';
import { getSlaMonitor, type SlaMonitorRow } from '@/api/darkstore/operations.api';
import { RefreshCw, Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
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

function RiskBadge({ status }: { status: string }) {
  if (status === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        <AlertCircle size={12} /> CRITICAL
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
        <AlertTriangle size={12} /> WARNING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
      <CheckCircle size={12} /> SAFE
    </span>
  );
}

export function SLAMonitor() {
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<SlaMonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSlaMonitor({
        storeId: activeStoreId || undefined,
        risk: riskFilter || undefined,
      });
      setData(res.data || []);
    } catch (e) {
      toast.error('Failed to load SLA monitor');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, riskFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    websocketService.on('order:updated', handler);
    websocketService.on('order:created', handler);
    return () => {
      websocketService.off('order:updated', handler);
      websocketService.off('order:created', handler);
    };
  }, [load]);

  const formatDeadline = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">SLA Monitor</h1>
          <p className="text-[#757575] text-sm">
            Order SLA deadlines, remaining time, and risk levels (SAFE / WARNING / CRITICAL)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={riskFilter || 'all'} onValueChange={(v) => setRiskFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Risk filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
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
          <LoadingState message="Loading SLA data..." />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No orders in SLA scope"
            description="No orders in new, processing, ASSIGNED, or PICKING status. SLA monitor tracks active orders only."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA Deadline</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.orderId}>
                  <TableCell className="font-mono font-medium">{row.orderId}</TableCell>
                  <TableCell>{row.storeId || '—'}</TableCell>
                  <TableCell>{row.pickerName}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDeadline(row.slaDeadline)}</TableCell>
                  <TableCell
                    className={
                      row.remainingMs < 0
                        ? 'text-red-600 font-semibold'
                        : row.slaStatus === 'critical'
                        ? 'text-red-600'
                        : row.slaStatus === 'warning'
                        ? 'text-amber-600'
                        : ''
                    }
                  >
                    {row.remainingFormatted}
                  </TableCell>
                  <TableCell>
                    <RiskBadge status={row.slaStatus} />
                  </TableCell>
                  <TableCell>{row.itemCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
