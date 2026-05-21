import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  Package,
  RefreshCw,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import {
  downloadOperationsViewCsv,
  fetchOperationsView,
  WarehouseOperationsView,
} from './warehouseApi';

const STATUS_STYLES = {
  healthy: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: 'All Systems Normal',
  },
  warning: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Elevated Load',
  },
  critical: {
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 border-red-200',
    label: 'Action Required',
  },
} as const;

function UtilizationBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function WarehouseNavigation() {
  const [data, setData] = useState<WarehouseOperationsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const view = await fetchOperationsView();
      setData(view);
    } catch {
      toast.error('Failed to load navigation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const dataInterval = setInterval(() => load(true), 10000);
    const clockInterval = setInterval(() => setClock(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [load]);

  const statusKey = data?.operationalStatus ?? 'healthy';
  const statusStyle = STATUS_STYLES[statusKey];
  const m = data?.metrics;
  const cap = m?.capacityUtilization;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Navigation"
        subtitle="Real-time operational status, capacity, order flow, and alerts"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              disabled={!data}
              onClick={() => data && downloadOperationsViewCsv(data)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Device-style status bar */}
        <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-5 py-2.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="tabular-nums">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </span>
            <span className="text-[#94a3b8] hidden sm:inline">
              {data?.lastUpdate
                ? `Updated ${new Date(data.lastUpdate).toLocaleString()}`
                : 'Syncing…'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[#94a3b8]">
            <Wifi size={14} />
            <Activity size={14} className="text-[#0891b2]" />
          </div>
        </div>

        {/* Overall status strip */}
        <div className="border-b border-[#E2E8F0]">
          <div className={`h-1 ${statusStyle.bar}`} />
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.badge}`}
              >
                {statusStyle.label}
              </span>
              <span className="text-sm text-[#64748B]">{data?.statusMessage}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#475569]">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-[#0891b2]" />
                <strong>{data?.activeStaff ?? '—'}</strong> staff on duty
              </span>
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" />
                <strong>{data?.openExceptions ?? 0}</strong> open exceptions
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]" />
            </div>
          ) : data && m ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Inbound Queue',
                    value: m.inboundQueue,
                    sub: 'trucks waiting',
                    icon: <ArrowDownToLine size={16} className="text-blue-600" />,
                    bg: 'bg-blue-50',
                  },
                  {
                    label: 'Outbound Queue',
                    value: m.outboundQueue,
                    sub: 'orders pending',
                    icon: <ArrowUpFromLine size={16} className="text-emerald-600" />,
                    bg: 'bg-emerald-50',
                  },
                  {
                    label: 'Inventory Health',
                    value: `${m.inventoryHealth}%`,
                    sub: 'accuracy',
                    icon: <Package size={16} className="text-cyan-600" />,
                    bg: 'bg-cyan-50',
                  },
                  {
                    label: 'Critical Alerts',
                    value: m.criticalAlerts,
                    sub: m.criticalAlerts > 0 ? 'action needed' : 'all clear',
                    icon: <AlertTriangle size={16} className="text-amber-600" />,
                    bg: 'bg-amber-50',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                        {kpi.label}
                      </span>
                      <div className={`p-1.5 rounded-lg ${kpi.bg}`}>{kpi.icon}</div>
                    </div>
                    <div className="text-2xl font-bold text-[#1E293B]">{kpi.value}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-[#1E293B] mb-4">Capacity Utilization</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Storage Bins', value: cap?.bins ?? 0, color: 'bg-[#0891b2]' },
                      { label: 'Stage', value: cap?.stage ?? 0, color: 'bg-violet-500' },
                      { label: 'Cold Storage', value: cap?.coldStorage ?? 0, color: 'bg-amber-500' },
                      { label: 'Ambient', value: cap?.ambient ?? 0, color: 'bg-emerald-500' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-medium text-[#64748B] mb-1.5">
                          <span>{item.label}</span>
                          <span className="text-[#1E293B]">{item.value}%</span>
                        </div>
                        <UtilizationBar value={item.value} color={item.color} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-[#1E293B] mb-4">Order Pipeline</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Pending', count: data.orderFlow.byStatus.pending, color: 'bg-slate-100 text-slate-700' },
                      { label: 'Picking', count: data.orderFlow.byStatus.picking, color: 'bg-sky-100 text-sky-800' },
                      {
                        label: 'Dispatching',
                        count: data.orderFlow.byStatus.dispatching,
                        color: 'bg-orange-100 text-orange-800',
                      },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-lg px-3 py-3 text-center ${s.color}`}>
                        <div className="text-xl font-bold">{s.count}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    <span className="font-semibold text-[#1E293B]">{data.orderFlow.total}</span> active
                    orders in flow
                  </p>
                </div>
              </div>

              {data.zones.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-[#1E293B] mb-4">Zone Utilization</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {data.zones.slice(0, 8).map((zone) => (
                      <div key={zone.id} className="rounded-lg border border-[#E2E8F0] p-3">
                        <div className="flex justify-between text-sm font-medium text-[#1E293B] mb-2">
                          <span className="truncate">{zone.name}</span>
                          <span className="text-[#0891b2] font-bold shrink-0 ml-2">
                            {zone.utilization}%
                          </span>
                        </div>
                        <UtilizationBar
                          value={zone.utilization}
                          color={
                            zone.utilization >= 90
                              ? 'bg-red-500'
                              : zone.utilization >= 75
                                ? 'bg-amber-500'
                                : 'bg-[#0891b2]'
                          }
                        />
                        <p className="text-[10px] text-[#64748B] mt-1.5">
                          {zone.occupied} / {zone.total} bins occupied
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(data.equipmentStatus).length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                    <Wrench size={16} className="text-[#64748B]" />
                    Equipment Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.equipmentStatus).map(([type, stats]) => (
                      <div
                        key={type}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                      >
                        <span className="text-sm font-medium text-[#1E293B] capitalize">
                          {type.replace(/-/g, ' ')}
                        </span>
                        <span className="text-xs text-emerald-700 font-semibold">
                          {stats.active} active
                        </span>
                        {stats.maintenance > 0 && (
                          <span className="text-xs text-amber-700 font-semibold">
                            {stats.maintenance} maint.
                          </span>
                        )}
                        <span className="text-xs text-[#64748B]">/ {stats.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                  <h3 className="font-bold text-[#1E293B]">Live Order Flow</h3>
                  <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                    Real-time Status
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs font-medium">
                      <tr>
                        <th className="px-4 py-2 text-left">Order</th>
                        <th className="px-4 py-2 text-left">Destination</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-right">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {data.orderFlow.recent.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-[#64748B]">
                            No active orders
                          </td>
                        </tr>
                      ) : (
                        data.orderFlow.recent.map((order, i) => (
                          <tr key={order.id || order.orderId || i} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-2.5 font-mono text-xs text-[#475569]">
                              {order.orderId}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#1E293B]">
                              {order.customer?.trim() ? order.customer : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-[#64748B]">{order.items}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-[#64748B] py-12">Unable to load navigation data.</p>
          )}
        </div>
      </div>
    </div>
  );
}
