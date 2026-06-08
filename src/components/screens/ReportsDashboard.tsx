import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingDown,
  PackageX,
  Activity,
  Filter,
  Download,
  User,
  History,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PageHeader } from '../ui/page-header';
import { AlertCard } from '../darkstore/AlertCard';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DateRangeSelect,
  getReportDateRangeLabel,
  type ReportDateRange,
} from '../ui/date-range-select';
import { toast } from 'sonner';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import { downloadPerformanceReport } from '../../api/staff-shifts/staff.api';
import {
  fetchInventoryReport,
  fetchStaffReport,
  fetchComplianceReport,
  downloadReportsExport,
  type InventoryReport,
  type StaffReport,
  type ComplianceLogRow,
} from '../../api/darkstore/reports.api';
import { getActiveStoreId } from '../../contexts/AuthContext';
import { useScreenTab } from '../../hooks/useScreenUrlState';
import { getDashboardSummary, getStaffLoad } from '../../api/dashboard';
import { getPipelineStats, getWorkflowSlaMetrics, type WorkflowSlaMetrics } from '../../api/darkstore/operations.api';
import { MetricCard } from '../darkstore/MetricCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreTabBar } from '../darkstore/DarkstoreTabBar';
import { FileText } from 'lucide-react';

type ReportsDashboardProps = { onNavigateToAudit?: () => void; variant?: 'darkstore' | 'default' };

function staffPeriodFromRange(range: ReportDateRange): string {
  return range === '30d' ? 'month' : 'week';
}

const REPORTS_TABS = ['inventory', 'staff', 'qc'] as const;

export function ReportsDashboard({ onNavigateToAudit, variant = 'default' }: ReportsDashboardProps = {}) {
  const { activeTab, changeTab: setActiveTab } = useScreenTab(REPORTS_TABS, 'inventory');
  const [timeRange, setTimeRange] = useState<ReportDateRange>('today');
  const [exporting, setExporting] = useState(false);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowSlaMetrics | null>(null);
  const [shiftSummary, setShiftSummary] = useState<{
    queue: number;
    slaThreat: number;
    capacity: number;
    pickers: number;
    slaCritical: number;
    ordersUnder5Min: number;
    pipelineTotal: number;
  } | null>(null);

  useEffect(() => {
    if (variant !== 'darkstore') return;
    const storeId = getActiveStoreId() || '';
    Promise.all([
      getDashboardSummary(storeId),
      getStaffLoad(storeId),
      getPipelineStats({ storeId }),
      getWorkflowSlaMetrics({ storeId }),
    ]).then(([summary, staff, pipeline, slaMetrics]) => {
      if (slaMetrics?.data) setWorkflowMetrics(slaMetrics.data);
      const q = summary?.queue;
      const queueTotal = typeof q === 'object' ? (q?.total ?? 0) : (q ?? 0);
      setShiftSummary({
        queue: queueTotal,
        slaThreat: summary?.sla_threat?.percentage ?? summary?.sla_threat ?? 0,
        capacity: summary?.store_capacity?.percentage ?? 0,
        pickers: staff?.pickers?.active ?? 0,
        slaCritical: pipeline?.data?.slaCritical ?? 0,
        ordersUnder5Min: pipeline?.data?.ordersUnder5Min ?? 0,
        pipelineTotal: pipeline?.data?.totalActive ?? 0,
      });
    }).catch(() => {
      setShiftSummary(null);
      setWorkflowMetrics(null);
    });
  }, [variant, timeRange]);

  const handleEndOfShiftReport = () => {
    if (!shiftSummary) {
      toast.error('Shift summary still loading');
      return;
    }
    const storeId = getActiveStoreId() || 'unknown';
    const now = new Date();
    const body = [
      'SELORG DARKSTORE — END OF SHIFT REPORT',
      '========================================',
      `Store: ${storeId}`,
      `Generated: ${now.toLocaleString()}`,
      `Period: ${getReportDateRangeLabel(timeRange)}`,
      '',
      'SHIFT SNAPSHOT',
      `  Orders in Queue: ${shiftSummary.queue}`,
      `  SLA Threat: ${shiftSummary.slaThreat}%`,
      `  SLA Critical: ${shiftSummary.slaCritical}`,
      `  Orders < 5m to breach: ${shiftSummary.ordersUnder5Min}`,
      `  Pipeline Active: ${shiftSummary.pipelineTotal}`,
      `  Store Capacity: ${shiftSummary.capacity}%`,
      `  Active Pickers: ${shiftSummary.pickers}`,
      '',
      '---',
      'Export full analytics via Export All (CSV).',
    ].join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `end-of-shift-${storeId}-${now.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('End-of-shift report downloaded');
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const blob = await downloadReportsExport(timeRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `darkstore-reports-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setExporting(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <DateRangeSelect
        value={timeRange}
        onValueChange={(value) => {
          if (value === 'custom') {
            toast.info('Custom range', {
              description: 'Use Today, Last 7 Days, or Last 30 Days for now.',
            });
            return;
          }
          setTimeRange(value);
        }}
        disabled={exporting}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExportAll}
        disabled={exporting}
        className="h-9"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Export All
      </Button>
      {variant === 'darkstore' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleEndOfShiftReport}
          disabled={!shiftSummary}
        >
          <FileText size={16} className="mr-1.5" />
          End-of-Shift Report
        </Button>
      )}
    </div>
  );

  const shell = (
    <>
      {variant === 'darkstore' && (
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">End-of-Shift Snapshot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Orders in Queue" value={(shiftSummary?.queue ?? '—') as number | string} loading={!shiftSummary} />
              <MetricCard label="SLA Threat %" value={shiftSummary ? `${shiftSummary.slaThreat}%` : '—'} accent="danger" loading={!shiftSummary} />
              <MetricCard label="Store Capacity" value={shiftSummary ? `${shiftSummary.capacity}%` : '—'} accent="purple" loading={!shiftSummary} />
              <MetricCard label="Active Pickers" value={(shiftSummary?.pickers ?? '—') as number | string} accent="success" loading={!shiftSummary} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Workflow SLA Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard label="Pipeline Active" value={(shiftSummary?.pipelineTotal ?? '—') as number | string} loading={!shiftSummary} />
              <MetricCard label="SLA Critical Now" value={(shiftSummary?.slaCritical ?? '—') as number | string} accent="danger" loading={!shiftSummary} />
              <MetricCard label="&lt; 5 Min to Breach" value={(shiftSummary?.ordersUnder5Min ?? '—') as number | string} accent="warning" loading={!shiftSummary} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Pick Time &amp; Resolution Analytics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Pick Time P50"
                value={workflowMetrics ? `${workflowMetrics.pickTimeP50Sec}s` : '—'}
                loading={!workflowMetrics}
              />
              <MetricCard
                label="Pick Time P95"
                value={workflowMetrics ? `${workflowMetrics.pickTimeP95Sec}s` : '—'}
                accent="warning"
                loading={!workflowMetrics}
              />
              <MetricCard
                label="Avg Exception Resolution"
                value={workflowMetrics ? `${workflowMetrics.avgExceptionResolutionMin} min` : '—'}
                loading={!workflowMetrics}
              />
              <MetricCard
                label="Peak Breach Hour"
                value={
                  workflowMetrics
                    ? (() => {
                        const peak = [...workflowMetrics.breachRateByHour].sort((a, b) => b.rate - a.rate)[0];
                        return peak ? `${peak.hour}:00 (${peak.rate}%)` : '—';
                      })()
                    : '—'
                }
                accent="danger"
                loading={!workflowMetrics}
              />
            </div>
          </div>
        </div>
      )}

      <DarkstoreTabBar
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'inventory', label: 'Inventory KPIs', icon: Activity },
          { id: 'staff', label: 'Staff Efficiency', icon: User },
          { id: 'qc', label: 'Compliance Logs', icon: ShieldAlert },
        ]}
      />

      <div className="min-h-[500px]">
        {activeTab === 'inventory' && (
          <InventoryKPIs onViewLog={() => setActiveTab('qc')} timeRange={timeRange} />
        )}
        {activeTab === 'staff' && <StaffAnalytics timeRange={timeRange} />}
        {activeTab === 'qc' && (
          <ComplianceLogs onViewLog={onNavigateToAudit} timeRange={timeRange} />
        )}
      </div>
    </>
  );

  if (variant === 'darkstore') {
    return (
      <DarkstoreScreenShell
        title="Reports & Analytics"
        subtitle="Deep dive into dark-store performance, inventory health, and staff efficiency."
        actions={headerActions}
        toolbar={{ showDensityToggle: false, showConnection: false }}
      >
        {shell}
      </DarkstoreScreenShell>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Deep dive into dark-store performance, inventory health, and staff efficiency."
        actions={headerActions}
      />
      {shell}
    </div>
  );
}

function InventoryKPIs({
  onViewLog,
  timeRange,
}: {
  onViewLog: () => void;
  timeRange: ReportDateRange;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventoryReport(timeRange);
      setReport(data);
    } catch (e) {
      console.error('Failed to load inventory report:', e);
      setError(e instanceof Error ? e.message : 'Failed to load inventory report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = report?.kpis;
  const discrepancies = report?.discrepancies ?? [];
  const delta = kpis?.shrinkage_delta_pct ?? 0;
  const deltaLabel =
    delta === 0
      ? 'No change vs prior period'
      : `${delta > 0 ? '+' : ''}${delta}% vs prior period`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <AlertCard
        title={error}
        severity="danger"
        icon={ShieldAlert}
        actions={[{ label: 'Retry', onClick: load }]}
        className="p-6"
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 font-medium">
        Period:{' '}
        <span className="text-slate-900">
          {report?.period ?? getReportDateRangeLabel(timeRange)}
        </span>
        {getActiveStoreId() && (
          <span className="text-slate-400 ml-2">· Store {getActiveStoreId()}</span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Shrinkage Value"
          value={kpis?.shrinkage_value_display ?? '₹0.00'}
          icon={TrendingDown}
          accent="danger"
          footer={<p className={cn('text-xs font-bold', delta > 0 ? 'text-red-700' : 'text-emerald-700')}>{deltaLabel}</p>}
        />
        <MetricCard
          label="Damage Write-offs"
          value={`${kpis?.damage_writeoff_count ?? 0} Items`}
          icon={PackageX}
          accent="warning"
          footer={
            <p className="text-xs text-slate-500">
              Most damaged: <span className="font-bold text-slate-900">{kpis?.most_damaged_product ?? '—'}</span>
            </p>
          }
        />
        <MetricCard
          label="Cycle Count Accuracy"
          value={`${kpis?.cycle_count_accuracy_pct ?? 0}%`}
          icon={Activity}
          accent="success"
          footer={
            <StatusBadge variant="workflow" status={kpis?.audit_passed ? 'audit_passed' : 'below_target'} />
          }
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Discrepancy Log (Shrinkage & Damage)</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors',
                showHistory ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
              )}
            >
              <History size={12} /> {showHistory ? 'View table' : 'History'}
            </button>
            <button
              type="button"
              onClick={onViewLog}
              className="text-blue-600 text-xs font-bold hover:underline"
            >
              View compliance log
            </button>
          </div>
        </div>

        {showHistory ? (
          <div className="p-4 overflow-y-auto max-h-[400px]">
            <ActionHistoryViewer module="inventory" action="adjustment" limit={10} />
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No shrinkage or damage adjustments in this period.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Quantity</th>
                <th className="px-6 py-3 font-medium">Value</th>
                <th className="px-6 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discrepancies.map((row) => (
                <tr key={`${row.sku}-${row.created_at}`} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{row.sku}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{row.product_name}</td>
                  <td className="px-6 py-3">
                    <StatusBadge variant="workflow" status={row.type === 'Shrink' ? 'shrink' : 'surplus'} />
                  </td>
                  <td className="px-6 py-3 font-bold text-slate-900">{row.quantity}</td>
                  <td className="px-6 py-3 text-slate-600">{row.value}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const ERROR_COLORS: Record<string, string> = {
  'Picking Errors': 'bg-red-500',
  'Packing Errors': 'bg-amber-500',
  Labeling: 'bg-blue-600',
};

function StaffAnalytics({ timeRange }: { timeRange: ReportDateRange }) {
  const [report, setReport] = useState<StaffReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchStaffReport(timeRange);
        if (!cancelled) setReport(data);
      } catch (e) {
        console.error('Failed to load staff report:', e);
        if (!cancelled) {
          toast.error('Failed to load staff metrics');
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const attendance = report?.attendance;
  const rate = attendance?.rate_pct ?? 0;
  const circumference = 226;
  const strokeOffset = circumference - (circumference * rate) / 100;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const storeId = getActiveStoreId();
      const blob = await downloadPerformanceReport({
        period: staffPeriodFromRange(timeRange),
        ...(storeId ? { storeId } : {}),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-performance-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Staff report downloaded');
    } catch {
      toast.error('Failed to download staff report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 font-medium">
        Period:{' '}
        <span className="text-slate-900">
          {report?.period ?? getReportDateRangeLabel(timeRange)}
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Attendance Rate</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="36" fill="none" className="stroke-slate-200" stroke="currentColor" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  className="stroke-emerald-600"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <span className="absolute text-xl font-bold text-slate-900">{rate}%</span>
            </div>
            <div>
              <div className="text-xs text-slate-500">Present (active roster)</div>
              <div className="font-bold text-slate-900 text-lg">
                {attendance?.present_count ?? 0} Staff
              </div>
              <div className="text-xs text-red-500 mt-1 font-bold">
                {attendance?.absent_count ?? 0} Absence records
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Error Contribution</h3>
          <div className="space-y-3">
            {(report?.error_contribution ?? []).map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-xs mb-1 font-bold text-slate-600">
                  <span>{item.type}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      ERROR_COLORS[item.type] ?? 'bg-blue-600'
                    )}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
            <Download size={24} />
          </div>
          <h3 className="font-bold text-slate-900">Performance Report</h3>
          <p className="text-xs text-slate-500 mb-4">
            Download staff productivity data for this period.
          </p>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full bg-blue-600 hover:bg-blue-500 font-bold"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Download CSV'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComplianceLogs({
  onViewLog,
  timeRange,
}: {
  onViewLog?: () => void;
  timeRange: ReportDateRange;
}) {
  const [logs, setLogs] = useState<ComplianceLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceReport(timeRange, {
        category: categoryFilter,
        limit: 100,
      });
      setLogs(res.logs ?? []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load compliance logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange, categoryFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3 justify-between">
        <h3 className="font-bold text-slate-900">Recent Compliance Events</h3>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="temperature">Temperature</SelectItem>
              <SelectItem value="food_safety">Food Safety</SelectItem>
              <SelectItem value="fssai_docs">FSSAI Docs</SelectItem>
              <SelectItem value="storage_conditions">Storage</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchLogs();
              toast.success('Logs refreshed');
            }}
            className="text-blue-600 text-xs font-bold h-8"
          >
            <Filter size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>
      <div className="divide-y divide-slate-100 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-slate-500">No compliance logs in this period</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.log_id}
              className="p-4 hover:bg-slate-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    log.status === 'breached' || log.status === 'warning'
                      ? 'bg-red-500'
                      : 'bg-emerald-600'
                  )}
                />
                <div>
                  <div className="font-bold text-slate-900">
                    {log.category.replace(/_/g, ' ').toUpperCase()} - {log.zone}
                  </div>
                  <div className="text-xs text-slate-500">
                    {log.log_id} • Reading: {log.reading}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{log.status.toUpperCase()}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  {new Date(log.logged_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
        <button
          type="button"
          onClick={() => onViewLog?.()}
          className="text-blue-600 text-sm font-bold hover:underline"
        >
          View Full Audit Trail
        </button>
      </div>
    </div>
  );
}
