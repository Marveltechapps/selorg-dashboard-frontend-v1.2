import React from 'react';
import {
  ArrowRight,
  AlertCircle,
  Package,
  BarChart3,
  AlertTriangle,
  Users,
  ClipboardList,
  Bike,
  RotateCcw,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DarkstoreScreenShell } from '../DarkstoreScreenShell';
import { MetricCard } from '../MetricCard';
import { ShiftContextBar } from '../ShiftContextBar';
import { SparklineChart } from '../SparklineChart';
import { AlertCard } from '../AlertCard';
import { StatusBadge } from '../StatusBadge';
import { getPaymentDisplay } from '@/utils/orderPaymentDisplay';
import { slaTextColor } from '../statusColors';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderPipelineBoard } from '../OrderPipelineBoard';
import { ActivityFeed } from '../ActivityFeed';
import { OpsContextBar } from '../OpsContextBar';
import { slaRowClassName } from '../slaRowStyles';
import { RegionalCommandPanel } from '../RegionalCommandPanel';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { PipelineStats, ActivityFeedItem } from '@/api/darkstore/operations.api';

type OrderBoardTab = 'new' | 'returns' | 'cancelled';

export interface DashboardOverviewViewProps {
  currentTime: Date;
  isRefreshing: boolean;
  isLoading: boolean;
  isWsConnected: boolean;
  stats: {
    queue: number;
    newOrders: number;
    returnsOrders: number;
    cancelledOrders: number;
    slaThreat: number;
    capacity: number;
    riderWait: string;
    breakdown: { normal: number; priority: number; express: number };
    ordersUnder5Min: number;
    expectedPeakTime: string;
    lastHourData: number[];
  };
  staffLoad: {
    pickers: { active: number; total: number; load_percentage: number };
    packers: { active: number; total: number; load_percentage: number };
  };
  stockAlerts: any[];
  rtoAlerts: any[];
  liveOrders: any[];
  orderTab: OrderBoardTab;
  setOrderTab: (tab: OrderBoardTab) => void;
  restockedItems: Set<string>;
  callingOrders: Map<string, string>;
  rtoMarkedOrders: Set<string>;
  expandedHistory: Set<string>;
  historyData: Map<string, any[]>;
  loadingHistory: Set<string>;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
  onOrderClick: (orderId: string) => void;
  onRestock: (sku: string) => void;
  onCallCustomer: (orderId: string) => void;
  onMarkRTO: (orderId: string) => void;
  onToggleHistory: (type: 'RTO' | 'STOCK', entityId: string) => void;
  queueTrend?: string;
  slaTrend?: string;
  pipeline?: PipelineStats | null;
  pipelineLoading?: boolean;
  activityFeed?: ActivityFeedItem[];
  onPipelineStageClick?: (stage: string) => void;
  onActivityClick?: (item: ActivityFeedItem) => void;
  onShiftHandoffExport?: () => void;
  onStoreSwitch?: (storeId: string) => void;
}

export function DashboardOverviewView(props: DashboardOverviewViewProps) {
  const {
    currentTime,
    isRefreshing,
    isLoading,
    isWsConnected,
    stats,
    staffLoad,
    stockAlerts,
    rtoAlerts,
    liveOrders,
    orderTab,
    setOrderTab,
    restockedItems,
    callingOrders,
    rtoMarkedOrders,
    expandedHistory,
    historyData,
    loadingHistory,
    onRefresh,
    onNavigate,
    onOrderClick,
    onRestock,
    onCallCustomer,
    onMarkRTO,
    onToggleHistory,
    queueTrend,
    slaTrend,
    pipeline,
    pipelineLoading,
    activityFeed = [],
    onPipelineStageClick,
    onActivityClick,
    onShiftHandoffExport,
    onStoreSwitch,
  } = props;

  const orderTabs: { id: OrderBoardTab; label: string; count: number; color: string; bg: string }[] = [
    { id: 'new', label: 'New Orders', count: stats.newOrders, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'returns', label: 'Returns', count: stats.returnsOrders, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'cancelled', label: 'Cancelled', count: stats.cancelledOrders, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const needsAction =
    stats.ordersUnder5Min +
    rtoAlerts.filter((a: any) => !rtoMarkedOrders.has(a.order_id)).length +
    stockAlerts.filter((a: any) => !restockedItems.has(a.sku)).length;

  return (
    <DarkstoreScreenShell
      title="Store Overview"
      subtitle="Live operational metrics and active queues."
      actions={
        onShiftHandoffExport ? (
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={onShiftHandoffExport}>
            <FileText size={16} className="mr-1.5" />
            Shift Handoff
          </Button>
        ) : undefined
      }
      toolbar={{
        onRefresh,
        refreshing: isRefreshing,
        lastSync: currentTime,
        showConnection: true,
        showDensityToggle: false,
      }}
    >

      <OpsContextBar />

      <ShiftContextBar
        pickersActive={staffLoad.pickers.active}
        pickersTotal={staffLoad.pickers.total}
        expectedPeakTime={stats.expectedPeakTime}
        loading={isLoading}
      />

      <OrderPipelineBoard
        pipeline={pipeline ?? null}
        loading={pipelineLoading}
        onStageClick={onPipelineStageClick}
      />

      <RegionalCommandPanel onStoreClick={onStoreSwitch} className="mb-4" />

      {needsAction > 0 && (
        <AlertCard
          title={`${needsAction} items need action now`}
          subtitle={stats.ordersUnder5Min > 0 ? `${stats.ordersUnder5Min} SLA critical` : undefined}
          severity="danger"
          icon={AlertTriangle}
          actions={[
            { label: 'Open Exception Inbox', onClick: () => onNavigate('exception-inbox') },
          ]}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 darkstore-content-loaded">
        <MetricCard
          label="Order Queue"
          value={stats.queue as number}
          icon={ClipboardList}
          loading={isLoading}
          onClick={() => onNavigate('liveorders')}
          trend={queueTrend ? { value: queueTrend, direction: 'up', label: 'vs last sync' } : undefined}
          footer={
            <>
              <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                {stats.queue > 0 && (
                  <>
                    <div className="bg-blue-500 transition-all" style={{ width: `${(stats.breakdown.normal / stats.queue) * 100}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${(stats.breakdown.priority / stats.queue) * 100}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${(stats.breakdown.express / stats.queue) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-500">
                <span>{stats.breakdown.normal} Normal</span>
                <span>{stats.breakdown.priority} Priority</span>
                <span>{stats.breakdown.express} Express</span>
              </div>
            </>
          }
        />
        <MetricCard
          label="SLA Threat Meter"
          value={`${stats.slaThreat}%`}
          icon={AlertTriangle}
          accent="danger"
          loading={isLoading}
          onClick={() => onNavigate('slamonitor')}
          trend={slaTrend ? { value: slaTrend, direction: 'down', label: 'at risk' } : undefined}
          footer={
            <>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full rounded-full transition-all"
                  style={{ width: `${stats.slaThreat}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <span className="font-bold text-red-600">{stats.ordersUnder5Min} orders</span> &lt; 5 mins to breach
              </p>
            </>
          }
        />
        <MetricCard
          label="Store Capacity"
          value={`${stats.capacity}%`}
          icon={BarChart3}
          accent="purple"
          loading={isLoading}
          onClick={() => onNavigate('health')}
          footer={
            <>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${stats.capacity}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">Peak expected at {stats.expectedPeakTime}</p>
            </>
          }
        />
        <MetricCard
          label="Rider Wait Times"
          value={stats.riderWait}
          icon={Bike}
          accent="success"
          loading={isLoading}
          onClick={() => onNavigate('livepickerboard')}
          footer={
            <>
              <SparklineChart data={stats.lastHourData} height={36} />
              <p className="text-xs text-slate-500 mt-2">Avg wait time (last hour)</p>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4 lg:col-span-1">
          <ActivityFeed
            items={activityFeed}
            loading={pipelineLoading}
            onItemClick={onActivityClick}
          />
          <div className="darkstore-card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Picker & Packer Load
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Pickers', data: staffLoad.pickers, color: 'bg-blue-500' },
                  { label: 'Packers', data: staffLoad.packers, color: 'bg-blue-400' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">
                        {row.label} ({row.data.active}/{row.data.total})
                      </span>
                      <span className="font-semibold text-slate-800">{row.data.load_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', row.color)} style={{ width: `${row.data.load_percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="darkstore-card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              Stock-Out Alerts
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : stockAlerts.filter((a: any) => !restockedItems.has(a.sku)).length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-sm">No stock alerts</p>
              ) : (
                stockAlerts
                  .filter((a: any) => !restockedItems.has(a.sku))
                  .slice(0, 5)
                  .map((alert: any) => (
                    <AlertCard
                      key={alert.sku}
                      title={alert.item_name}
                      subtitle={`${alert.sku} · ${alert.current_count} left`}
                      severity="warning"
                      actions={[
                        {
                          label: restockedItems.has(alert.sku) ? 'Restocked' : 'Restock',
                          onClick: () => onRestock(alert.sku),
                          disabled: restockedItems.has(alert.sku),
                        },
                      ]}
                      onToggleHistory={() => onToggleHistory('STOCK', alert.sku)}
                      historyExpanded={expandedHistory.has(`STOCK-${alert.sku}`)}
                      historyContent={
                        loadingHistory.has(`STOCK-${alert.sku}`) ? (
                          <p className="text-xs text-slate-400 text-center">Loading…</p>
                        ) : (
                          (historyData.get(`STOCK-${alert.sku}`) || []).map((entry: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white/60 rounded p-2 mb-1">
                              Restocked +{entry.metadata?.quantity_added ?? '—'} at{' '}
                              {new Date(entry.performed_at).toLocaleString()}
                            </div>
                          ))
                        )
                      }
                    />
                  ))
              )}
            </div>
          </div>

          <div className="darkstore-card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <RotateCcw size={18} className="text-red-600" />
              RTO Risk Alerts
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : rtoAlerts.filter((a: any) => !rtoMarkedOrders.has(a.order_id)).length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-sm">No RTO alerts</p>
              ) : (
                rtoAlerts
                  .filter((a: any) => !rtoMarkedOrders.has(a.order_id))
                  .slice(0, 3)
                  .map((alert: any) => {
                    const isCalling = callingOrders.has(alert.order_id);
                    return (
                      <AlertCard
                        key={alert.order_id}
                        title={`Order ${alert.order_id}`}
                        subtitle={alert.description || alert.issue_type}
                        severity="danger"
                        actions={[
                          { label: isCalling ? 'Calling…' : 'Call Cust.', onClick: () => onCallCustomer(alert.order_id), disabled: isCalling },
                          { label: 'Mark RTO', onClick: () => onMarkRTO(alert.order_id), variant: 'destructive' },
                        ]}
                        onToggleHistory={() => onToggleHistory('RTO', alert.order_id)}
                        historyExpanded={expandedHistory.has(`RTO-${alert.order_id}`)}
                        historyContent={
                          (historyData.get(`RTO-${alert.order_id}`) || []).map((entry: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white/60 rounded p-2 mb-1">
                              {entry.action} — {new Date(entry.performed_at).toLocaleString()}
                            </div>
                          ))
                        }
                      />
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 darkstore-card flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                Live Order Board
                {isWsConnected && <StatusBadge variant="live" status="live" pulse />}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('liveorders')}
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {orderTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors flex items-center gap-2',
                    orderTab === tab.id ? `${tab.bg} ${tab.color} border-current` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {tab.label}
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', orderTab === tab.id ? 'bg-white/60' : 'bg-slate-100')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="darkstore-table w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">SLA Timer</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : liveOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No {orderTabs.find((t) => t.id === orderTab)?.label.toLowerCase()} found
                    </td>
                  </tr>
                ) : (
                  liveOrders.map((order: any) => {
                    const pd = getPaymentDisplay(order);
                    return (
                      <tr
                        key={order.order_id}
                        className={cn('hover:bg-slate-50 cursor-pointer', slaRowClassName(order))}
                        onClick={() => onOrderClick(order.order_id)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{order.order_id}</span>
                          <div className="mt-0.5">
                            <StatusBadge variant="orderType" status={order.order_type || 'Normal'} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Package size={14} /> {order.item_count} items
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge variant="payment" status={pd.label} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('font-mono font-bold inline-flex items-center gap-1', slaTextColor(order.sla_status))}>
                            <Clock size={14} />
                            {order.sla_timer}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {order.assignee?.name || 'Unassigned'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DarkstoreScreenShell>
  );
}
