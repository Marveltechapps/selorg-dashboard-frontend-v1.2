import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, AlertTriangle, Truck, Star, Clock, ChevronDown, Download, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { exportToCSV, exportToCSVForExcel } from '../../../utils/csvExport';
import { cn } from '@/lib/utils';
import { exportToPDF } from '../../../utils/pdfExport';
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from '../../ui/ux-components';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';
import { useOnDashboardRefresh, DASHBOARD_TOPICS } from '../../../hooks/useDashboardRefresh';
import { VendorProfileOverview } from './VendorProfile';

type MetricCardColor = 'indigo' | 'green' | 'blue' | 'red' | 'orange' | 'purple';

const METRIC_ICON_STYLES: Record<MetricCardColor, string> = {
  indigo: 'text-indigo-600 bg-indigo-50',
  green: 'text-emerald-600 bg-emerald-50',
  blue: 'text-blue-600 bg-blue-50',
  red: 'text-red-600 bg-red-50',
  orange: 'text-amber-600 bg-amber-50',
  purple: 'text-violet-600 bg-violet-50',
};

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: MetricCardColor;
}

function MetricCard({ label, value, subValue, trend, trendUp, icon, color = 'indigo' }: MetricCardProps) {
  const iconWrap = METRIC_ICON_STYLES[color] ?? METRIC_ICON_STYLES.indigo;

  return (
    <div className="flex min-h-[7.5rem] flex-col rounded-xl border border-[#e4e4e7] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[#71717a] leading-snug">{label}</span>
        {icon ? (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>{icon}</div>
        ) : null}
      </div>
      <div className="mt-auto flex min-h-[2.25rem] flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-2xl font-bold tabular-nums text-[#18181b]">{value}</span>
        {subValue ? <span className="text-sm text-[#71717a]">{subValue}</span> : null}
      </div>
      {trend ? (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            trendUp ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      ) : null}
    </div>
  );
}

interface VendorOverviewProps {
  searchQuery?: string;
}

interface Vendor {
  id: string;
  code?: string;
  name: string;
  category: string;
  rating: string;
  status: string;
  statusColor: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface SlaTrendPoint {
  date: string;
  sla: number;
}

interface VendorSummary {
  activeVendors?: number | null;
  totalVendors?: number | null;
  pendingVendors?: number | null;
  slaCompliance?: number | null;
  openPOs?: number | null;
  openPOValue?: number | null;
  criticalAlerts?: number | null;
  deliveryTimeliness?: number | null;
  productQuality?: number | null;
  rejectionRate?: number | null;
  avgPOResponseHours?: number | null;
  complianceStatus?: number | null;
  topPerformers?: string[];
  slaTrend?: SlaTrendPoint[];
  generatedAt?: string;
}

function formatNumber(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return String(v);
}

function formatPercent(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v}%`;
}

function formatCurrencyINR(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

function mapVendorStatus(raw: string): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  switch (raw) {
    case 'active':
      return { label: 'Active', color: 'green' };
    case 'pending':
    case 'under_review':
      return { label: raw === 'under_review' ? 'Under Review' : 'Under Review', color: 'yellow' };
    case 'inactive':
      return { label: 'On Hold', color: 'red' };
    case 'rejected':
      return { label: 'Rejected', color: 'red' };
    case 'archived':
      return { label: 'Archived', color: 'gray' };
    default:
      return { label: raw || '—', color: 'gray' };
  }
}

export function VendorOverview({ searchQuery = '' }: VendorOverviewProps) {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight')?.trim() || '';
  const tableHighlightRef = useRef<HTMLTableRowElement | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [profileVendor, setProfileVendor] = useState<Vendor | null>(null);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await vendorApi.getVendors({ page: 1, pageSize: 500 });

      let vendorsData: Record<string, unknown>[] = [];
      if (Array.isArray(response)) {
        vendorsData = response as Record<string, unknown>[];
      } else if (response && typeof response === 'object') {
        const r = response as Record<string, unknown>;
        if (Array.isArray(r.data)) vendorsData = r.data as Record<string, unknown>[];
        else if (Array.isArray(r.vendors)) vendorsData = r.vendors as Record<string, unknown>[];
      }

      const transformedVendors: Vendor[] = vendorsData
        .map((v): Vendor | null => {
          const id =
            v._id != null
              ? String(v._id)
              : v.id != null
                ? String(v.id)
                : null;
          const nm =
            (typeof v.vendorName === 'string' && v.vendorName.trim()) ||
            (typeof v.name === 'string' && v.name.trim()) ||
            '';
          if (!id || !nm) return null;

          const meta = v.metadata as Record<string, unknown> | undefined;
          const onboard = v.onboarding as Record<string, unknown> | undefined;
          const contact = v.contact as Record<string, unknown> | undefined;
          const rawStatus = typeof v.status === 'string' ? v.status : '';
          const { label, color } = mapVendorStatus(rawStatus);
          const catRaw = meta?.category ?? onboard?.category;
          const category = typeof catRaw === 'string' && catRaw.trim() ? catRaw : '—';
          const ratingRaw = meta?.rating;
          const rating =
            ratingRaw != null && String(ratingRaw).trim() !== '' ? String(ratingRaw) : '—';

          const codeStr =
            (typeof v.vendorCode === 'string' && v.vendorCode.trim()) ||
            (typeof v.code === 'string' && v.code.trim()) ||
            undefined;

          return {
            id,
            code: codeStr,
            name: nm,
            category,
            rating,
            status: label,
            statusColor: color,
            contactPerson: typeof contact?.name === 'string' ? contact.name : undefined,
            email: typeof contact?.email === 'string' ? contact.email : undefined,
            phone: typeof contact?.phone === 'string' ? contact.phone : undefined,
          };
        })
        .filter((x): x is Vendor => x != null);

      setVendors(transformedVendors);
    } catch (error: unknown) {
      console.error('Failed to load vendors:', error);
      const message = error instanceof Error ? error.message : 'Failed to load vendors from server';
      toast.error(message);
      setVendors([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Load vendor summary (metrics, counts)
  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(false);
      const resp = await vendorApi.getVendorSummary();
      const raw = resp && typeof resp === 'object' && 'data' in resp ? (resp as { data: VendorSummary }).data : (resp as VendorSummary);
      setSummary(raw && typeof raw === 'object' ? raw : null);
    } catch (error: unknown) {
      console.error('Failed to load vendor summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to load vendor summary';
      toast.error(message);
      setSummary(null);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (!highlightId || !tableHighlightRef.current) return;
    tableHighlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, vendors, loading]);

  useOnDashboardRefresh(DASHBOARD_TOPICS.vendor, () => {
    void loadVendors();
    void loadSummary();
  });

  const slaChartData = useMemo(() => {
    const trend = summary?.slaTrend;
    if (!Array.isArray(trend) || trend.length === 0) return [];
    return trend.map((p) => {
      // Parse as "local date" (no Z suffix) to avoid timezone drift in labels.
      const d = new Date(`${p.date}T00:00:00`);
      const label = Number.isNaN(d.getTime())
        ? p.date
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return { date: label, sla: p.sla };
    });
  }, [summary?.slaTrend]);

  const chartYDomain = useMemo((): [number, number] => {
    if (!slaChartData.length) return [0, 100];
    const vals = slaChartData.map((d) => d.sla);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = 5;
    return [Math.max(0, lo - pad), Math.min(100, hi + pad)];
  }, [slaChartData]);

  const handleDownload = (format: string) => {
    setShowDownloadMenu(false);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      if (format.toLowerCase() === 'csv' || format.toLowerCase() === 'xlsx') {
        const csvData: (string | number)[][] = [
          ['Vendor Overview Report', `Date: ${today}`, `Time: ${timestamp}`],
          [''],
          ['Vendor ID', 'Name', 'Category', 'Rating', 'Status'],
          ...filteredVendors.map(v => [
            v.id,
            v.name,
            v.category,
            v.rating,
            v.status
          ]),
        ];
        exportToCSVForExcel(csvData, `vendor-overview-${today}-${timestamp.replace(/:/g, '-')}`);
      } else if (format.toLowerCase() === 'pdf') {
        const htmlContent = `
          <h1>Vendor Overview Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
            <tr>
              <th>Vendor ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
            ${filteredVendors.map(v => `
              <tr>
                <td>${v.id}</td>
                <td>${v.name}</td>
                <td>${v.category}</td>
                <td>${v.rating}</td>
                <td>${v.status}</td>
              </tr>
            `).join('')}
          </table>
        `;
        exportToPDF(htmlContent, `vendor-overview-${today}`);
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    setProfileVendor(vendor);
  };

  // Filter vendors by status and search query
  const filteredVendors = vendors.filter(vendor => {
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && vendor.status !== 'Active') return false;
      if (filterStatus === 'review' && vendor.status !== 'Review Due' && vendor.status !== 'Under Review') return false;
      if (filterStatus === 'hold' && vendor.status !== 'On Hold') return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        vendor.id.toLowerCase().includes(query) ||
        vendor.name.toLowerCase().includes(query) ||
        (vendor.category !== '—' && vendor.category.toLowerCase().includes(query)) ||
        (vendor.contactPerson?.toLowerCase().includes(query) ?? false) ||
        (vendor.email?.toLowerCase().includes(query) ?? false) ||
        (vendor.phone?.toLowerCase().includes(query) ?? false) ||
        (vendor.code?.toLowerCase().includes(query) ?? false)
      );
    }
    
    return true;
  });

  if (profileVendor) {
    return (
      <VendorProfileOverview
        vendorId={profileVendor.id}
        vendorName={profileVendor.name}
        vendorCode={profileVendor.code || profileVendor.id}
        vendorCategory={profileVendor.category}
        vendorStatus={profileVendor.status}
        vendorRating={profileVendor.rating}
        onBack={() => setProfileVendor(null)}
      />
    );
  }

  const s = summary;
  const metricValue = (v: number | null | undefined) =>
    summaryLoading ? '—' : summaryError ? '—' : formatNumber(v);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Overview"
        subtitle="Supplier performance, active relationships, and health monitoring"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadMenu((o) => !o)}
                className="px-4 py-2 border border-[#E0E0E0] bg-white text-[#212121] font-medium rounded-lg hover:bg-[#F9FAFB] flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 py-1">
                    <button
                      type="button"
                      onClick={() => handleDownload('csv')}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#F9FAFB]"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('pdf')}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#F9FAFB]"
                    >
                      PDF
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        }
      />

      {summaryError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Summary metrics could not be loaded. KPI cards show unavailable until the request succeeds.
        </div>
      )}

      {summaryLoading ? (
        <CardSkeleton count={8} columns={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Active Vendors"
              value={metricValue(s?.activeVendors ?? undefined)}
              subValue={
                !summaryError && s?.pendingVendors != null ? `${s.pendingVendors} pending` : undefined
              }
              icon={<Users size={16} />}
              color="indigo"
            />
            <MetricCard
              label="SLA Compliance (GRN)"
              value={summaryError ? '—' : formatPercent(s?.slaCompliance ?? undefined)}
              icon={<Clock size={16} />}
              color="green"
            />
            <MetricCard
              label="Open POs"
              value={metricValue(s?.openPOs ?? undefined)}
              subValue={
                !summaryError && s?.openPOValue != null
                  ? formatCurrencyINR(s.openPOValue)
                  : undefined
              }
              icon={<Truck size={16} />}
              color="blue"
            />
            <MetricCard
              label="Critical Alerts"
              value={metricValue(s?.criticalAlerts ?? undefined)}
              icon={<AlertTriangle size={16} />}
              color="red"
            />
            <MetricCard
              label="On-Time Delivery"
              value={summaryError ? '—' : formatPercent(s?.deliveryTimeliness ?? undefined)}
              icon={<Truck size={16} />}
              color="green"
            />
            <MetricCard
              label="QC Pass Rate"
              value={summaryError ? '—' : formatPercent(s?.productQuality ?? undefined)}
              icon={<CheckCircle size={16} />}
              color="blue"
            />
            <MetricCard
              label="Rejection Rate"
              value={summaryError ? '—' : formatPercent(s?.rejectionRate ?? undefined)}
              icon={<AlertTriangle size={16} />}
              color="orange"
            />
            <MetricCard
              label="Avg PO Response"
              value={
                summaryError
                  ? '—'
                  : s?.avgPOResponseHours == null
                    ? '—'
                    : `${s.avgPOResponseHours} hrs`
              }
              icon={<Clock size={16} />}
              color="purple"
            />
          </div>
      )}

      <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-[#212121]">On-time delivery by day</h3>
            <p className="text-xs text-[#757575] mt-0.5">
              Completed shipments with ETA, last 30 days (from database)
            </p>
          </div>
        </div>
        {summaryError ? (
          <ErrorState
            title="Could not load chart data"
            description="Fix the error and refresh, or check your connection and API configuration."
          />
        ) : summaryLoading ? (
          <div className="h-[200px] rounded-xl bg-slate-50 border border-slate-200 animate-pulse" />
        ) : slaChartData.length === 0 ? (
          <EmptyState
            title="No shipment trend data"
            description="There are no completed shipments with both delivered and estimated arrival times in the last 30 days."
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={slaChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(slaChartData.length / 6))}
              />
              <YAxis
                domain={chartYDomain}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'On-time rate']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E0E0E0',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="sla"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendor Health Monitor */}
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-6">
              <h3 className="font-bold text-[#212121] mb-4">Vendor Health Monitor</h3>
              <div className="space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Delivery Timeliness</span>
                              <span className={`font-bold ${s?.deliveryTimeliness == null ? 'text-gray-500' : s.deliveryTimeliness >= 80 ? 'text-green-600' : s.deliveryTimeliness >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                {summaryLoading || summaryError ? '—' : formatPercent(s?.deliveryTimeliness ?? undefined)}
                              </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${s?.deliveryTimeliness ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Product Quality</span>
                              <span className={`font-bold ${s?.productQuality == null ? 'text-gray-500' : s.productQuality >= 80 ? 'text-green-600' : s.productQuality >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                {summaryLoading || summaryError ? '—' : formatPercent(s?.productQuality ?? undefined)}
                              </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${s?.productQuality ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Compliance Status</span>
                              <span className={`font-bold ${s?.complianceStatus == null ? 'text-gray-500' : s.complianceStatus >= 80 ? 'text-green-600' : s.complianceStatus >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                {summaryLoading || summaryError ? '—' : formatPercent(s?.complianceStatus ?? undefined)}
                              </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${s?.complianceStatus ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
                      <h4 className="text-xs font-bold text-[#757575] uppercase mb-2">Top Performers</h4>
                      <div className="flex flex-wrap gap-2">
                          {summaryLoading || summaryError ? (
                            <span className="text-xs text-[#9CA3AF]">—</span>
                          ) : Array.isArray(s?.topPerformers) && s.topPerformers.length > 0 ? (
                            s.topPerformers.map((name, i) => (
                              <span key={`${name}-${i}`} className="px-2 py-1 bg-[#F0FDF4] text-[#166534] text-xs font-medium rounded border border-[#DCFCE7]">{name}</span>
                            ))
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">No ranked performers in the database</span>
                          )}
                      </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-3 text-right">
                    Summary generated:{' '}
                    {s?.generatedAt
                      ? new Date(s.generatedAt).toLocaleString()
                      : summaryLoading
                        ? '—'
                        : '—'}
                  </p>
              </div>
          </div>

          {/* Active Vendor List */}
          <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
              <h3 className="font-bold text-[#212121]">Live Vendor Dashboard</h3>
              <div className="relative">
                 <button 
                   onClick={() => setShowFilterMenu(!showFilterMenu)}
                   className="text-xs font-medium px-2 py-1 bg-[#E0E7FF] text-[#4F46E5] rounded hover:bg-[#C7D2FE] flex items-center gap-2"
                 >
                   Filter: {filterStatus === 'all' ? 'All' : filterStatus}
                   <ChevronDown size={16} className={`transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                 </button>
                 {/* Filter Dropdown Menu */}
                 {showFilterMenu && (
                   <>
                     <div 
                       className="fixed inset-0 z-10" 
                       onClick={() => setShowFilterMenu(false)}
                     />
                     <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 py-1">
                       <button 
                         onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>All</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('active'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>Active</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('review'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>Review Due</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('hold'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>On Hold</span>
                       </button>
                     </div>
                   </>
                 )}
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                  <th className="px-6 py-3">Vendor Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Rating</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#757575] text-sm">
                      <div className="max-w-3xl mx-auto">
                        <TableSkeleton rows={5} columns={5} />
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8">
                      <EmptyState title="Could not load vendors" description="Fix the error and refresh, or check your connection and API configuration." />
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8">
                      <EmptyState title="No vendors" description="No vendors match the current filters, or the database has no vendor records yet." />
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => {
                    const isHighlighted =
                      highlightId &&
                      (vendor.id === highlightId ||
                        vendor.code === highlightId ||
                        String(vendor.id).toLowerCase() === highlightId.toLowerCase());
                    return (
                    <tr
                      key={vendor.id}
                      ref={isHighlighted ? tableHighlightRef : undefined}
                      className={cn(
                        'hover:bg-[#FAFAFA]',
                        isHighlighted && 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-200'
                      )}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#212121]">{vendor.name}</p>
                        <p className="text-xs text-[#757575]">ID: {vendor.code ?? vendor.id}</p>
                      </td>
                      <td className="px-6 py-4 text-[#616161]">{vendor.category}</td>
                      <td className="px-6 py-4">
                        {vendor.rating === '—' ? (
                          <span className="text-[#9CA3AF] text-sm">—</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#F59E0B] font-bold">
                            <Star size={14} fill="#F59E0B" /> {vendor.rating}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.statusColor === 'green'
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : vendor.statusColor === 'yellow'
                                ? 'bg-[#FEF3C7] text-[#92400E]'
                                : vendor.statusColor === 'gray'
                                  ? 'bg-[#F3F4F6] text-[#4B5563]'
                                  : 'bg-[#FEE2E2] text-[#991B1B]'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="text-[#4F46E5] hover:text-[#4338CA] font-medium text-xs"
                          onClick={() => handleViewVendor(vendor)}
                        >
                          Profile
                        </button>
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
  );
}