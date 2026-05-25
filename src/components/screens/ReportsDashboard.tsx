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

type ReportsDashboardProps = { onNavigateToAudit?: () => void };

function staffPeriodFromRange(range: ReportDateRange): string {
  return range === '30d' ? 'month' : 'week';
}

export function ReportsDashboard({ onNavigateToAudit }: ReportsDashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'staff' | 'qc'>('inventory');
  const [timeRange, setTimeRange] = useState<ReportDateRange>('today');
  const [exporting, setExporting] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Deep dive into dark-store performance, inventory health, and staff efficiency."
        actions={
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
              className="h-9 border-[#E0E0E0] text-[#212121] font-semibold shadow-sm"
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export All
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="inventory" label="Inventory KPIs" icon={Activity} active={activeTab} onClick={setActiveTab} />
        <TabButton id="staff" label="Staff Efficiency" icon={User} active={activeTab} onClick={setActiveTab} />
        <TabButton id="qc" label="Compliance Logs" icon={ShieldAlert} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'inventory' && (
          <InventoryKPIs onViewLog={() => setActiveTab('qc')} timeRange={timeRange} />
        )}
        {activeTab === 'staff' && <StaffAnalytics timeRange={timeRange} />}
        {activeTab === 'qc' && (
          <ComplianceLogs onViewLog={onNavigateToAudit} timeRange={timeRange} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  id,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: string;
  onClick: (id: 'inventory' | 'staff' | 'qc') => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id as 'inventory' | 'staff' | 'qc')}
      className={cn(
        'flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap',
        active === id
          ? 'border-[#1677FF] text-[#1677FF] bg-[#F0F7FF]'
          : 'border-transparent text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5]'
      )}
    >
      <Icon size={16} />
      {label}
    </button>
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
        <Loader2 className="w-8 h-8 animate-spin text-[#1677FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-6 text-center">
        <p className="text-[#991B1B] font-medium">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#757575] font-medium">
        Period:{' '}
        <span className="text-[#212121]">
          {report?.period ?? getReportDateRangeLabel(timeRange)}
        </span>
        {getActiveStoreId() && (
          <span className="text-[#9E9E9E] ml-2">· Store {getActiveStoreId()}</span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[#757575] font-bold uppercase text-xs">Shrinkage Value</h4>
              <p className="text-3xl font-bold text-[#EF4444] mt-2">
                {kpis?.shrinkage_value_display ?? '₹0.00'}
              </p>
            </div>
            <div className="p-2 bg-[#FEE2E2] rounded-lg text-[#EF4444]">
              <TrendingDown size={20} />
            </div>
          </div>
          <div
            className={cn(
              'text-xs px-2 py-1 rounded inline-block w-fit font-bold',
              delta > 0 ? 'text-[#7F1D1D] bg-[#FEF2F2]' : 'text-[#166534] bg-[#DCFCE7]'
            )}
          >
            {deltaLabel}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[#757575] font-bold uppercase text-xs">Damage Write-offs</h4>
              <p className="text-3xl font-bold text-[#F59E0B] mt-2">
                {kpis?.damage_writeoff_count ?? 0} Items
              </p>
            </div>
            <div className="p-2 bg-[#FFF7ED] rounded-lg text-[#F59E0B]">
              <PackageX size={20} />
            </div>
          </div>
          <div className="text-xs text-[#757575]">
            Most damaged:{' '}
            <span className="font-bold text-[#212121]">
              {kpis?.most_damaged_product ?? '—'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[#757575] font-bold uppercase text-xs">Cycle Count Accuracy</h4>
              <p className="text-3xl font-bold text-[#16A34A] mt-2">
                {kpis?.cycle_count_accuracy_pct ?? 0}%
              </p>
            </div>
            <div className="p-2 bg-[#F0FDF4] rounded-lg text-[#16A34A]">
              <Activity size={20} />
            </div>
          </div>
          <div
            className={cn(
              'text-xs px-2 py-1 rounded inline-block w-fit font-bold',
              kpis?.audit_passed ? 'text-[#166534] bg-[#DCFCE7]' : 'text-[#7F1D1D] bg-[#FEF2F2]'
            )}
          >
            {kpis?.audit_passed ? 'Audit Passed' : 'Below Target'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Discrepancy Log (Shrinkage & Damage)</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors',
                showHistory ? 'bg-[#1677FF] text-white' : 'text-[#1677FF] hover:bg-[#E6F7FF]'
              )}
            >
              <History size={12} /> {showHistory ? 'View table' : 'History'}
            </button>
            <button
              type="button"
              onClick={onViewLog}
              className="text-[#1677FF] text-xs font-bold hover:underline"
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
          <div className="p-12 text-center text-[#757575] text-sm">
            No shrinkage or damage adjustments in this period.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Quantity</th>
                <th className="px-6 py-3 font-medium">Value</th>
                <th className="px-6 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {discrepancies.map((row) => (
                <tr key={`${row.sku}-${row.created_at}`} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-[#616161] font-mono text-xs">{row.sku}</td>
                  <td className="px-6 py-3 font-medium text-[#212121]">{row.product_name}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        row.type === 'Shrink'
                          ? 'bg-[#FEE2E2] text-[#EF4444]'
                          : 'bg-[#FFF7ED] text-[#F59E0B]'
                      )}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-bold text-[#212121]">{row.quantity}</td>
                  <td className="px-6 py-3 text-[#616161]">{row.value}</td>
                  <td className="px-6 py-3 text-[#616161] text-xs">{row.reason}</td>
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
  'Picking Errors': 'bg-[#EF4444]',
  'Packing Errors': 'bg-[#F59E0B]',
  Labeling: 'bg-[#1677FF]',
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
        <Loader2 className="w-8 h-8 animate-spin text-[#1677FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#757575] font-medium">
        Period:{' '}
        <span className="text-[#212121]">
          {report?.period ?? getReportDateRangeLabel(timeRange)}
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4">Attendance Rate</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="36" fill="none" stroke="#F5F5F5" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <span className="absolute text-xl font-bold text-[#212121]">{rate}%</span>
            </div>
            <div>
              <div className="text-xs text-[#757575]">Present (active roster)</div>
              <div className="font-bold text-[#212121] text-lg">
                {attendance?.present_count ?? 0} Staff
              </div>
              <div className="text-xs text-[#EF4444] mt-1 font-bold">
                {attendance?.absent_count ?? 0} Absence records
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4">Error Contribution</h3>
          <div className="space-y-3">
            {(report?.error_contribution ?? []).map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-xs mb-1 font-bold text-[#616161]">
                  <span>{item.type}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="w-full bg-[#F5F5F5] rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      ERROR_COLORS[item.type] ?? 'bg-[#1677FF]'
                    )}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-[#E6F7FF] rounded-full flex items-center justify-center text-[#1677FF] mb-3">
            <Download size={24} />
          </div>
          <h3 className="font-bold text-[#212121]">Performance Report</h3>
          <p className="text-xs text-[#757575] mb-4">
            Download staff productivity data for this period.
          </p>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full bg-[#1677FF] hover:bg-[#409EFF] font-bold"
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
    <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex flex-wrap items-center gap-3 justify-between">
        <h3 className="font-bold text-[#212121]">Recent Compliance Events</h3>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs border-[#E0E0E0]">
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
            className="text-[#1677FF] text-xs font-bold h-8"
          >
            <Filter size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>
      <div className="divide-y divide-[#F0F0F0] min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#1677FF]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-[#757575]">No compliance logs in this period</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.log_id}
              className="p-4 hover:bg-[#F9FAFB] flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    log.status === 'breached' || log.status === 'warning'
                      ? 'bg-[#EF4444]'
                      : 'bg-[#16A34A]'
                  )}
                />
                <div>
                  <div className="font-bold text-[#212121]">
                    {log.category.replace(/_/g, ' ').toUpperCase()} - {log.zone}
                  </div>
                  <div className="text-xs text-[#757575]">
                    {log.log_id} • Reading: {log.reading}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#212121]">{log.status.toUpperCase()}</div>
                <div className="text-[10px] text-[#757575] uppercase font-bold">
                  {new Date(log.logged_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 bg-[#FAFAFA] border-t border-[#E0E0E0] text-center">
        <button
          type="button"
          onClick={() => onViewLog?.()}
          className="text-[#1677FF] text-sm font-bold hover:underline"
        >
          View Full Audit Trail
        </button>
      </div>
    </div>
  );
}
