import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Play, Pause, CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '@/components/darkstore/DarkstoreDataTable';
import { StatusBadge } from '@/components/darkstore/StatusBadge';
import { StoreRequiredGuard } from '@/components/darkstore/StoreRequiredGuard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, LoadingState } from '@/components/ui/ux-components';
import {
  getPicklists,
  startPicking,
  pausePicking,
  completePicking,
  moveToPacking,
  type PicklistRow,
} from '@/api/darkstore/picklists.api';

const columns: DarkstoreColumn<PicklistRow>[] = [
  { key: 'id', header: 'Picklist', sticky: true, render: (p) => <span className="font-semibold">{p.id}</span> },
  { key: 'zone', header: 'Zone', render: (p) => p.zone || '—' },
  { key: 'orders', header: 'Orders', render: (p) => p.orders },
  { key: 'items', header: 'Items', render: (p) => p.items },
  {
    key: 'status',
    header: 'Status',
    render: (p) => <StatusBadge variant="workflow" status={p.status === 'inprogress' ? 'picking' : p.status} />,
  },
  {
    key: 'progress',
    header: 'Progress',
    render: (p) => (
      <span className="text-sm font-medium tabular-nums">{typeof p.progress === 'number' ? `${p.progress}%` : '—'}</span>
    ),
  },
  { key: 'picker', header: 'Picker', render: (p) => p.picker?.name || p.suggestedPicker || '—' },
];

export function PicklistManagementScreen({ embedded }: { embedded?: boolean } = {}) {
  const { activeStoreId } = useAuth();
  const [rows, setRows] = useState<PicklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastSync, setLastSync] = useState<Date>();
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPicklists = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      const res = await getPicklists({
        storeId: activeStoreId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setRows(res?.data ?? []);
      setLastSync(new Date());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchPicklists();
    const interval = setInterval(fetchPicklists, 30000);
    return () => clearInterval(interval);
  }, [fetchPicklists]);

  const runAction = async (id: string, action: 'start' | 'pause' | 'complete' | 'pack') => {
    setActionId(id);
    try {
      if (action === 'start') await startPicking(id);
      else if (action === 'pause') await pausePicking(id);
      else if (action === 'complete') await completePicking(id);
      else await moveToPacking(id);
      toast.success('Picklist updated');
      fetchPicklists();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const statusFilterEl = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="inprogress">In Progress</SelectItem>
        <SelectItem value="paused">Paused</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
      </SelectContent>
    </Select>
  );

  const body = (
    <>
        {loading && rows.length === 0 ? (
          <LoadingState message="Loading picklists…" />
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No picklists" description="Picklists are created from the order queue or auto-wave rules." />
        ) : (
          <DarkstoreDataTable
            columns={[
              ...columns,
              {
                key: 'actions',
                header: 'Actions',
                render: (p) => (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {p.status === 'pending' && (
                      <Button size="sm" variant="outline" className="h-7" disabled={actionId === p.id} onClick={() => runAction(p.id, 'start')}>
                        <Play size={12} className="mr-1" /> Start
                      </Button>
                    )}
                    {p.status === 'inprogress' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={actionId === p.id} onClick={() => runAction(p.id, 'pause')}>
                          <Pause size={12} className="mr-1" /> Pause
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={actionId === p.id} onClick={() => runAction(p.id, 'complete')}>
                          <CheckCircle size={12} className="mr-1" /> Done
                        </Button>
                      </>
                    )}
                    {(p.status === 'completed' || p.status === 'inprogress') && (
                      <Button size="sm" variant="outline" className="h-7" disabled={actionId === p.id} onClick={() => runAction(p.id, 'pack')}>
                        <UserPlus size={12} className="mr-1" /> To Pack
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={rows}
            rowKey={(row) => row.id}
          />
        )}
    </>
  );

  if (embedded) {
    return (
      <StoreRequiredGuard title="Select a store for Picklists">
        <div className="flex justify-end mb-3">{statusFilterEl}</div>
        {body}
      </StoreRequiredGuard>
    );
  }

  return (
    <StoreRequiredGuard title="Select a store for Picklists">
      <DarkstoreScreenShell
        title="Picklist Management"
        subtitle="Wave picking routes and picker assignments"
        toolbar={{
          onRefresh: fetchPicklists,
          refreshing: loading,
          lastSync,
          filters: statusFilterEl,
        }}
      >
        {body}
      </DarkstoreScreenShell>
    </StoreRequiredGuard>
  );
}
