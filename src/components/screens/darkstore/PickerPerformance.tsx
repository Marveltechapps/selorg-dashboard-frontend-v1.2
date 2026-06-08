import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Users, Package, Clock, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchPickerPerformanceSummary,
  fetchPickersWithMetrics,
  fetchPickerDrilldown,
  PickerPerformanceSummary,
  PickerPerformanceItem,
} from '@/api/darkstore/pickers.api';
import { toast } from 'sonner';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DarkstoreSheetContent } from '@/components/darkstore/DarkstoreSheetContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreDataTable, type DarkstoreColumn } from '@/components/darkstore/DarkstoreDataTable';
import { MetricCard } from '@/components/darkstore/MetricCard';
import { StatusBadge } from '@/components/darkstore/StatusBadge';

const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 30);
const DEFAULT_START = defaultStart.toISOString().slice(0, 10);
const DEFAULT_END = new Date().toISOString().slice(0, 10);

const pickerColumns: DarkstoreColumn<PickerPerformanceItem>[] = [
  {
    key: 'name',
    header: 'Picker Name',
    render: (p) => <span className="font-medium text-slate-900">{p.pickerName || '—'}</span>,
  },
  { key: 'orders', header: 'Orders/Day', render: (p) => p.ordersPerDay.toFixed(2) },
  { key: 'pickTime', header: 'Avg Pick Time (sec)', render: (p) => p.avgPickTimeSec.toFixed(1) },
  { key: 'missing', header: 'Missing %', render: (p) => `${p.missingRate.toFixed(2)}%` },
  { key: 'sla', header: 'SLA Breach %', render: (p) => `${p.slaBreachRate.toFixed(2)}%` },
  { key: 'items', header: 'Items/Hour', render: (p) => p.itemsPerHour.toFixed(1) },
  {
    key: 'risk',
    header: 'Risk Score',
    render: (p) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{p.riskScore}</span>
        <StatusBadge variant="severity" status={p.riskLevel} />
      </div>
    ),
  },
];

export function PickerPerformance() {
  const [summary, setSummary] = useState<PickerPerformanceSummary | null>(null);
  const [pickers, setPickers] = useState<PickerPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [riskFilter, setRiskFilter] = useState<'all' | 'high'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPicker, setSelectedPicker] = useState<PickerPerformanceItem | null>(null);
  const [drilldown, setDrilldown] = useState<any>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const loadData = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    try {
      const [summaryRes, pickersRes] = await Promise.all([
        fetchPickerPerformanceSummary({ startDate, endDate }),
        fetchPickersWithMetrics({
          startDate,
          endDate,
          risk: riskFilter === 'high' ? 'high' : undefined,
        }),
      ]);
      setSummary(summaryRes.data);
      setPickers(pickersRes.data);
      if (e) toast.success('Data refreshed');
    } catch (err) {
      setSummary(null);
      setPickers([]);
      toast.error(err instanceof Error ? err.message : 'Failed to load picker performance');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, riskFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDrilldown = async (picker: PickerPerformanceItem) => {
    setSelectedPicker(picker);
    setDrawerOpen(true);
    setDrilldownLoading(true);
    try {
      const res = await fetchPickerDrilldown(picker.pickerId, startDate, endDate);
      setDrilldown(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load picker drilldown');
      setDrilldown(null);
    } finally {
      setDrilldownLoading(false);
    }
  };

  return (
    <DarkstoreScreenShell
      title="Picker Performance"
      subtitle="Performance metrics, KPIs, and risk scores for the picker workforce"
      toolbar={{
        onRefresh: () => loadData(),
        refreshing: loading,
        showConnection: false,
        filters: (
          <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Risk</label>
          <Select value={riskFilter} onValueChange={(v: 'all' | 'high') => setRiskFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High risk only</SelectItem>
            </SelectContent>
          </Select>
        </div>
          </div>
        ),
      }}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading && !summary ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white h-32 rounded-xl border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </>
        ) : summary ? (
          <>
            <MetricCard label="Total Pickers" value={summary.totalPickers} icon={Users} />
            <MetricCard label="Avg Orders/Day" value={summary.avgOrdersPerDay.toFixed(2)} icon={Package} accent="success" />
            <MetricCard label="Avg Pick Time" value={`${summary.avgPickTimeSec.toFixed(1)}s`} icon={Clock} accent="warning" />
            <MetricCard label="Avg Missing %" value={`${summary.avgMissingRate.toFixed(2)}%`} icon={AlertTriangle} accent="warning" />
            <MetricCard label="Avg SLA Breach %" value={`${summary.avgSlaBreachRate.toFixed(2)}%`} icon={Shield} accent="danger" />
          </>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 px-1">Picker Performance & Risk</h3>
        <DarkstoreDataTable
          columns={pickerColumns}
          data={pickers}
          loading={loading}
          rowKey={(p) => p.pickerId}
          emptyIcon={Users}
          emptyTitle="No pickers match your filters"
          emptyDescription="Try adjusting the date range or risk filter."
          onRowClick={openDrilldown}
        />
      </div>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DarkstoreSheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedPicker?.pickerName || 'Picker'} Drilldown</SheetTitle>
          </SheetHeader>
          {drilldownLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
          ) : (
            <Tabs defaultValue="performance" className="mt-4">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="shifts">Shifts</TabsTrigger>
              </TabsList>
              <TabsContent value="performance" className="space-y-2 mt-4 text-sm">
                <div>Orders Picked: {drilldown?.performance?.ordersPicked ?? 0}</div>
                <div>Avg Pick Time: {drilldown?.performance?.avgPickTimeSec ?? 0}s</div>
                <div>Missing Rate: {drilldown?.performance?.missingRate ?? 0}%</div>
                <div>SLA Breach Rate: {drilldown?.performance?.slaBreachRate ?? 0}%</div>
              </TabsContent>
              <TabsContent value="training" className="mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left">Video</th>
                      <th className="px-2 py-2 text-left">Progress</th>
                      <th className="px-2 py-2 text-left">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldown?.training || []).map((row: any) => (
                      <tr key={row.videoId} className="border-t">
                        <td className="px-2 py-2">{row.title}</td>
                        <td className="px-2 py-2">{row.progress}%</td>
                        <td className="px-2 py-2">{row.completed ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="issues" className="mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Severity</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Reported At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldown?.issues || []).map((row: any) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-2 py-2">{row.issueType}</td>
                        <td className="px-2 py-2 capitalize">{row.severity}</td>
                        <td className="px-2 py-2 capitalize">{row.status}</td>
                        <td className="px-2 py-2">{row.reportedAt ? new Date(row.reportedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="shifts" className="mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left">Punch In</th>
                      <th className="px-2 py-2 text-left">Punch Out</th>
                      <th className="px-2 py-2 text-left">Worked (min)</th>
                      <th className="px-2 py-2 text-left">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldown?.shifts || []).map((row: any) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-2 py-2">{row.punchIn ? new Date(row.punchIn).toLocaleString() : '—'}</td>
                        <td className="px-2 py-2">{row.punchOut ? new Date(row.punchOut).toLocaleString() : '—'}</td>
                        <td className="px-2 py-2">{row.totalWorkedMinutes || 0}</td>
                        <td className="px-2 py-2">{row.ordersCompleted || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          )}
        </DarkstoreSheetContent>
      </Sheet>
    </DarkstoreScreenShell>
  );
}
