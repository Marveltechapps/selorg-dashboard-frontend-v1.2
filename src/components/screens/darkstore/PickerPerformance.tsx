import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Users, Package, Clock, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 30);
const DEFAULT_START = defaultStart.toISOString().slice(0, 10);
const DEFAULT_END = new Date().toISOString().slice(0, 10);

function RiskBadge({ riskLevel }: { riskLevel: 'low' | 'medium' | 'high' }) {
  const cls =
    riskLevel === 'high'
      ? 'bg-red-100 text-red-800'
      : riskLevel === 'medium'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';
  return (
    <Badge variant="outline" className={`capitalize border-0 font-medium ${cls}`}>
      {riskLevel}
    </Badge>
  );
}

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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-3">
            Picker Performance
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wider font-semibold">
              Workforce
            </span>
          </h1>
          <p className="text-[#757575] text-sm">
            Performance metrics, KPIs, and risk scores for the picker workforce
          </p>
        </div>
        <Button variant="outline" onClick={(e) => loadData(e)} disabled={loading} type="button">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#757575]">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#757575]">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#757575]">Risk</label>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading && !summary ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white h-32 rounded-xl border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </>
        ) : summary ? (
          <>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                  Total Pickers
                </span>
                <div className="text-blue-500 p-1.5 bg-blue-50 rounded-lg">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#212121]">{summary.totalPickers}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                  Avg Orders/Day
                </span>
                <div className="text-teal-500 p-1.5 bg-teal-50 rounded-lg">
                  <Package size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#212121]">
                {summary.avgOrdersPerDay.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                  Avg Pick Time
                </span>
                <div className="text-amber-500 p-1.5 bg-amber-50 rounded-lg">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#212121]">
                {summary.avgPickTimeSec.toFixed(1)}s
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                  Avg Missing %
                </span>
                <div className="text-orange-500 p-1.5 bg-orange-50 rounded-lg">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#212121]">
                {summary.avgMissingRate.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                  Avg SLA Breach %
                </span>
                <div className="text-red-500 p-1.5 bg-red-50 rounded-lg">
                  <Shield size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#212121]">
                {summary.avgSlaBreachRate.toFixed(2)}%
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Picker Table */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <h3 className="font-bold text-[#212121]">Picker Performance & Risk</h3>
        </div>
        {loading && pickers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : pickers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No pickers match your filters. Try adjusting the date range or risk filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                  <th className="px-6 py-3">Picker Name</th>
                  <th className="px-6 py-3">Orders/Day</th>
                  <th className="px-6 py-3">Avg Pick Time (sec)</th>
                  <th className="px-6 py-3">Missing %</th>
                  <th className="px-6 py-3">SLA Breach %</th>
                  <th className="px-6 py-3">Items/Hour</th>
                  <th className="px-6 py-3">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {pickers.map((p) => (
                  <tr key={p.pickerId} className="hover:bg-[#FAFAFA] cursor-pointer" onClick={() => openDrilldown(p)}>
                    <td className="px-6 py-4 font-medium text-[#212121]">{p.pickerName || '—'}</td>
                    <td className="px-6 py-4">{p.ordersPerDay.toFixed(2)}</td>
                    <td className="px-6 py-4">{p.avgPickTimeSec.toFixed(1)}</td>
                    <td className="px-6 py-4">{p.missingRate.toFixed(2)}%</td>
                    <td className="px-6 py-4">{p.slaBreachRate.toFixed(2)}%</td>
                    <td className="px-6 py-4">{p.itemsPerHour.toFixed(1)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.riskScore}</span>
                        <RiskBadge riskLevel={p.riskLevel} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[700px] sm:max-w-[700px]">
          <SheetHeader>
            <SheetTitle>{selectedPicker?.pickerName || 'Picker'} Drilldown</SheetTitle>
          </SheetHeader>
          {drilldownLoading ? (
            <div className="py-10 text-center text-sm text-[#757575]">Loading...</div>
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
                  <thead className="bg-gray-50">
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
                  <thead className="bg-gray-50">
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
                  <thead className="bg-gray-50">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
