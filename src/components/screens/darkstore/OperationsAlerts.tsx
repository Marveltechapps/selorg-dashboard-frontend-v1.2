import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/utils/websocket';
import { getOperationalAlerts, type OperationalAlertRow } from '@/api/darkstore/operations.api';
import { AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable } from '@/components/darkstore/DarkstoreDataTable';
import { StatusBadge } from '@/components/darkstore/StatusBadge';

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
    } catch {
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
    return () => {
      websocketService.off('OPERATIONAL_ALERT', handler);
    };
  }, [load]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <DarkstoreScreenShell
      title="Operations Alerts"
      subtitle="ORDER_SLA_BREACHED, PICKER_INACTIVE, DEVICE_OFFLINE, MULTIPLE_MISSING_ITEMS"
      toolbar={{
        onRefresh: load,
        refreshing: loading,
        showConnection: true,
        filters: (
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        ),
      }}
    >
      <DarkstoreDataTable
        columns={[
          {
            key: 'type',
            header: 'Type',
            render: (row) => (
              <StatusBadge variant="exception" status={row.alertType} />
            ),
          },
          {
            key: 'title',
            header: 'Title',
            render: (row) => <span className="font-medium text-slate-800">{row.title}</span>,
          },
          {
            key: 'order',
            header: 'Order',
            render: (row) => <span className="font-mono text-sm">{row.orderId || '—'}</span>,
          },
          {
            key: 'picker',
            header: 'Picker',
            render: (row) => <span className="text-slate-600">{row.pickerId || '—'}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge variant="issue" status={row.status} />,
          },
          {
            key: 'created',
            header: 'Created',
            render: (row) => <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>,
          },
        ]}
        data={data}
        loading={loading}
        emptyIcon={AlertTriangle}
        emptyTitle="No operations alerts"
        emptyDescription="No operational alerts match your filters. Alerts are created for SLA breaches, inactive pickers, device offline, and multiple missing items."
        rowKey={(row) => row._id}
      />
    </DarkstoreScreenShell>
  );
}
