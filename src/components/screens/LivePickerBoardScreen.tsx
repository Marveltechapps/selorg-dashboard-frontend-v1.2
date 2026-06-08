import React, { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/utils/websocket';
import { Zap, User, UserCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getPickerRegistry, fetchPickersWithMetrics, type StorePickerRegistryItem, type PickerPerformanceItem } from '../../api/darkstore/pickers.api';
import { assignOrder } from '../../api/dashboard/orders.api';
import { toast } from 'sonner';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useAuth, getActiveStoreId } from '../../contexts/AuthContext';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '../darkstore/DarkstoreDataTable';
import { AlertCard } from '../darkstore/AlertCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { OrderDetailsDrawer } from '../darkstore/OrderDetailsDrawer';
import { Button } from '../ui/button';

function formatLastActivity(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  if (diffMins > 0) return `${diffMins}m ago`;
  if (diffSecs > 0) return `${diffSecs}s ago`;
  return 'Just now';
}

function BatteryBadge({ level }: { level: number | null }) {
  if (level == null) return <span className="text-slate-400 text-sm">—</span>;
  const isLow = level < 20;
  return (
    <span className="inline-flex items-center gap-1">
      <Zap size={12} className={isLow ? 'text-amber-600' : 'text-emerald-600'} />
      <StatusBadge variant="workflow" status={isLow ? 'at_risk' : 'ok'} />
      <span className="text-xs font-bold tabular-nums">{level}%</span>
    </span>
  );
}

function OtpBadge({ otp }: { otp: string | null | undefined }) {
  if (!otp) return <span className="text-slate-400 text-sm font-mono">—</span>;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-mono text-sm font-bold tracking-widest">
      {otp}
    </span>
  );
}

const LANE_ORDER = ['PICKING', 'AVAILABLE', 'ON_BREAK', 'DEVICE_IDLE', 'OFFLINE'] as const;
const LANE_LABELS: Record<string, string> = {
  PICKING: 'Picking',
  AVAILABLE: 'Available',
  ON_BREAK: 'On Break',
  DEVICE_IDLE: 'Idle',
  OFFLINE: 'Offline',
};

const columns: DarkstoreColumn<StorePickerRegistryItem>[] = [
  {
    key: 'name',
    header: 'Picker',
    sticky: true,
    render: (p) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <User size={14} className="text-violet-600" />
        </div>
        <div>
          <span className="font-medium text-slate-800">{p.name}</span>
          {p.phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.phone}</p>}
        </div>
      </div>
    ),
  },
  { key: 'otp', header: 'Store OTP', render: (p) => <OtpBadge otp={p.permanentOtp} /> },
  {
    key: 'status',
    header: 'Status',
    render: (p) => (
      <div>
        <StatusBadge variant="workflow" status={p.derivedStatus || (p.online ? 'AVAILABLE' : 'OFFLINE')} />
        {!p.inShift && p.online === false && <p className="text-[10px] text-slate-400 mt-1">Not punched in</p>}
      </div>
    ),
  },
  { key: 'battery', header: 'Battery', render: (p) => <BatteryBadge level={p.batteryLevel} /> },
  {
    key: 'order',
    header: 'Active Order',
    render: (p) => <span className="font-mono text-sm text-slate-600">{p.activeOrderId || '—'}</span>,
  },
  { key: 'activity', header: 'Last Activity', render: (p) => formatLastActivity(p.lastActivity) },
];

export function LivePickerBoardScreen() {
  const { isAuthenticated } = useAuth();
  const [pickers, setPickers] = useState<StorePickerRegistryItem[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>();
  const [viewMode, setViewMode] = useState<'table' | 'lanes'>('lanes');
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, PickerPerformanceItem>>({});
  const [dragOrder, setDragOrder] = useState<{ orderId: string; fromPickerId: string } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<{ pickerId: string; pickerName: string } | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPickers = useCallback(async () => {
    const storeId = getActiveStoreId();
    if (!storeId) {
      setPickers([]);
      setStoreName(null);
      setError('No active store selected. Choose a store from the dashboard header.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [res, perf] = await Promise.all([
        getPickerRegistry(storeId),
        fetchPickersWithMetrics().catch(() => ({ data: [] as PickerPerformanceItem[] })),
      ]);
      setStoreName(res?.data?.storeName ?? null);
      setPickers(res?.data?.pickers ?? []);
      const metricMap: Record<string, PickerPerformanceItem> = {};
      for (const m of perf?.data ?? []) metricMap[m.pickerId] = m;
      setMetrics(metricMap);
      setLastSync(new Date());
    } catch (e) {
      setPickers([]);
      setStoreName(null);
      setError(e instanceof Error ? e.message : 'Failed to load picker list');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPickers();
    }, 3000);
  }, [fetchPickers]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchPickers();
  }, [isAuthenticated, fetchPickers]);

  useEffect(() => {
    if (!isAuthenticated) return;
    websocketService.connect();
    websocketService.on('order:updated', debouncedFetch);
    websocketService.on('picker:updated', debouncedFetch);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      websocketService.off('order:updated', debouncedFetch);
      websocketService.off('picker:updated', debouncedFetch);
    };
  }, [isAuthenticated, debouncedFetch]);

  const zoneCoverage: Record<string, number> = {};
  for (const p of pickers) {
    if (p.activeOrderId) {
      const zone = p.activeOrderId.slice(-2) || 'A';
      zoneCoverage[zone] = (zoneCoverage[zone] || 0) + 1;
    }
  }

  const handleReassign = async () => {
    if (!dragOrder || !reassignTarget) return;
    setReassigning(true);
    try {
      await assignOrder(dragOrder.orderId, {
        pickerId: reassignTarget.pickerId,
        pickerName: reassignTarget.pickerName,
      });
      toast.success(`Order ${dragOrder.orderId} reassigned to ${reassignTarget.pickerName}`);
      setDragOrder(null);
      setReassignTarget(null);
      await fetchPickers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Reassign failed');
    } finally {
      setReassigning(false);
    }
  };

  const laneGroups = LANE_ORDER.map((lane) => ({
    lane,
    label: LANE_LABELS[lane],
    pickers: pickers.filter((p) => {
      const status = p.derivedStatus || (p.online ? 'AVAILABLE' : 'OFFLINE');
      return status === lane;
    }),
  }));

  return (
    <DarkstoreScreenShell
      title="Live Picker Board"
      subtitle={
        storeName
          ? `${storeName} — registered pickers and store OTPs`
          : 'Picker workforce registered at this dark store'
      }
      toolbar={{
        onRefresh: () => {
          setLoading(true);
          fetchPickers();
        },
        refreshing: loading,
        lastSync,
        showConnection: true,
        toolbarActions: (
          <div className="flex border border-slate-200 rounded-md overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 rounded-none text-xs', viewMode === 'lanes' && 'bg-slate-100')}
              onClick={() => setViewMode('lanes')}
            >
              Lanes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 rounded-none text-xs', viewMode === 'table' && 'bg-slate-100')}
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        ),
      }}
    >
      {error && (
        <AlertCard title={error} severity="danger" icon={AlertTriangle} className="mb-4" />
      )}

      {Object.keys(zoneCoverage).length > 0 && (
        <div className="mb-4 darkstore-card p-3 darkstore-content-loaded">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Zone coverage heat map</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(zoneCoverage).map(([zone, count]) => (
              <span
                key={zone}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-bold tabular-nums',
                  count >= 3 ? 'bg-red-100 text-red-700' : count >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                )}
              >
                Zone {zone}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'lanes' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 darkstore-content-loaded">
          {laneGroups.map(({ lane, label, pickers: lanePickers }) => (
            <div key={lane} className="darkstore-card flex flex-col min-h-[200px]">
              <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <span className="text-xs font-bold text-slate-700">{lanePickers.length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[480px]">
                {loading && lanePickers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Loading…</p>
                ) : lanePickers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No pickers</p>
                ) : (
                  lanePickers.map((p) => {
                    const perf = metrics[p.id];
                    const itemsPerMin = perf?.itemsPerHour ? (perf.itemsPerHour / 60).toFixed(1) : null;
                    return (
                    <div
                      key={p.id}
                      draggable={!!p.activeOrderId && lane === 'PICKING'}
                      onDragStart={() => p.activeOrderId && setDragOrder({ orderId: p.activeOrderId, fromPickerId: p.id })}
                      onDragOver={(e) => { if (lane === 'AVAILABLE') e.preventDefault(); }}
                      onDrop={() => {
                        if (lane === 'AVAILABLE' && dragOrder) {
                          setReassignTarget({ pickerId: p.id, pickerName: p.name });
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => p.activeOrderId && setDrawerOrderId(p.activeOrderId)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && p.activeOrderId) setDrawerOrderId(p.activeOrderId);
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-colors',
                        p.activeOrderId && 'cursor-pointer',
                        lane === 'AVAILABLE' && dragOrder && 'ring-2 ring-dashed ring-blue-300'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <User size={12} className="text-violet-600" />
                        </div>
                        <span className="font-medium text-sm text-slate-800 truncate">{p.name}</span>
                        {itemsPerMin && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-600 tabular-nums">{itemsPerMin}/min</span>
                        )}
                      </div>
                      {p.activeOrderId && (
                        <p className="text-[10px] font-mono text-blue-600 mt-1 truncate">{p.activeOrderId}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <BatteryBadge level={p.batteryLevel} />
                        <span className="text-[10px] text-slate-400">{formatLastActivity(p.lastActivity)}</span>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DarkstoreDataTable
          columns={columns}
          data={pickers}
          loading={loading}
          rowKey={(p) => p.id}
          emptyIcon={UserCheck}
          emptyTitle="No pickers registered"
          emptyDescription="Pickers appear here after they log into the Picker App at this dark store."
          onRowClick={(p) => p.activeOrderId && setDrawerOrderId(p.activeOrderId)}
        />
      )}

      <OrderDetailsDrawer
        orderId={drawerOrderId}
        open={!!drawerOrderId}
        onOpenChange={(open) => !open && setDrawerOrderId(null)}
      />

      <ConfirmationDialog
        open={!!reassignTarget && !!dragOrder}
        onOpenChange={(o) => { if (!o) { setReassignTarget(null); setDragOrder(null); } }}
        title="Reassign order?"
        description={dragOrder && reassignTarget ? `Move order ${dragOrder.orderId} to ${reassignTarget.pickerName}?` : ''}
        confirmText={reassigning ? 'Reassigning…' : 'Reassign'}
        onConfirm={() => void handleReassign()}
      />
    </DarkstoreScreenShell>
  );
}
