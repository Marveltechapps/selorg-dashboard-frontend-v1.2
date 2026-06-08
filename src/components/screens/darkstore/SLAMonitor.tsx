import React, { useState, useEffect, useCallback } from 'react';
import { websocketService } from '@/utils/websocket';
import { useAuth } from '@/contexts/AuthContext';
import { getSlaMonitor, type SlaMonitorRow } from '@/api/darkstore/operations.api';
import { Clock, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '@/components/darkstore/DarkstoreDataTable';
import { StatusBadge } from '@/components/darkstore/StatusBadge';
import { SlaCountdown } from '@/components/darkstore/SlaCountdown';
import { toast } from 'sonner';
import { OrderDetailsDrawer } from '@/components/darkstore/OrderDetailsDrawer';

const formatDeadline = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString();
};

const columns: DarkstoreColumn<SlaMonitorRow>[] = [
  {
    key: 'orderId',
    header: 'Order ID',
    sticky: true,
    render: (row) => <span className="font-mono font-medium">{row.orderId}</span>,
  },
  { key: 'store', header: 'Store', render: (row) => row.storeId || '—' },
  { key: 'picker', header: 'Picker', render: (row) => row.pickerName },
  { key: 'status', header: 'Status', render: (row) => row.status },
  {
    key: 'deadline',
    header: 'SLA Deadline',
    render: (row) => <span className="font-mono text-sm">{formatDeadline(row.slaDeadline)}</span>,
  },
  {
    key: 'remaining',
    header: 'Remaining',
    render: (row) => <SlaCountdown deadline={row.slaDeadline} status={row.slaStatus} />,
  },
  {
    key: 'risk',
    header: 'Risk',
    render: (row) => <StatusBadge variant="sla" status={row.slaStatus} />,
  },
  { key: 'items', header: 'Items', render: (row) => row.itemCount },
];

export function SLAMonitor({ setActiveTab }: { setActiveTab?: (tab: string) => void } = {}) {
  const [riskFilter, setRiskFilter] = useState('');
  const { activeStoreId } = useAuth();
  const [data, setData] = useState<SlaMonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

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

  return (
    <DarkstoreScreenShell
      title="SLA Monitor"
      subtitle="Order SLA deadlines, remaining time, and risk levels (SAFE / WARNING / CRITICAL)"
      toolbar={{
        onRefresh: load,
        refreshing: loading,
        showConnection: true,
        filters: (
          <Select value={riskFilter || 'all'} onValueChange={(v) => setRiskFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Risk filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        ),
      }}
    >
      <DarkstoreDataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.orderId}
        emptyIcon={Clock}
        emptyTitle="No orders in SLA scope"
        emptyDescription="No orders in new, processing, ASSIGNED, or PICKING status. SLA monitor tracks active orders only."
        emptyAction={
          setActiveTab ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('liveorders')}>
              <List size={14} className="mr-1.5" />
              View live queue
            </Button>
          ) : (
            <p className="text-xs text-slate-500">No SLA risks — queue is clear</p>
          )
        }
        onRowClick={(row) => setDrawerOrderId(row.orderId)}
        rowClassName={(row) =>
          row.slaStatus === 'critical'
            ? 'border-l-2 border-l-red-500'
            : row.slaStatus === 'warning'
              ? 'border-l-2 border-l-amber-400'
              : ''
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
