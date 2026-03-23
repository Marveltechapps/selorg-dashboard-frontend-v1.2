import React, { useState, useEffect, useMemo } from 'react';
import { Users, AlertTriangle, Truck, Star, Clock, X, ChevronDown, Download, CheckCircle, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { exportToCSV, exportToCSVForExcel } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import { EmptyState } from '../../ui/ux-components';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';
import { useOnDashboardRefresh, DASHBOARD_TOPICS } from '../../../hooks/useDashboardRefresh';
import { VendorProfileOverview } from './VendorProfile';
import { VENDOR_PAYMENT_TERMS } from './AddVendorModal';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, subValue, trend, trendUp, icon, color = "indigo" }: MetricCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">{label}</span>
        {icon && <div className={`text-${color}-500 p-1.5 bg-${color}-50 rounded-lg`}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#212121]">{value}</span>
        {subValue && <span className="text-sm text-[#757575] mb-1">{subValue}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [profileVendor, setProfileVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    vendorCode: '',
    vendorName: '',
    gstin: '',
    paymentTerms: '30 days' as (typeof VENDOR_PAYMENT_TERMS)[number],
    currencyCode: 'INR',
    line1: '',
    line2: '',
    line3: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    contactName: '',
    email: '',
    phone: '',
    category: '',
    rating: '',
  });
  const [saving, setSaving] = useState(false);

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

  useOnDashboardRefresh(DASHBOARD_TOPICS.vendor, () => {
    void loadVendors();
    void loadSummary();
  });

  const slaChartData = useMemo(() => {
    const trend = summary?.slaTrend;
    if (!Array.isArray(trend) || trend.length === 0) return [];
    return trend.map((p) => {
      const d = new Date(p.date + 'T12:00:00Z');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category.trim()) {
      toast.error('Category is required (stored in metadata)');
      return;
    }

    try {
      setSaving(true);

      const metadata: Record<string, string> = { category: formData.category.trim() };
      if (formData.rating.trim()) metadata.rating = formData.rating.trim();

      const payload = {
        vendorCode: formData.vendorCode.trim(),
        vendorName: formData.vendorName.trim(),
        taxInfo: { gstin: formData.gstin.trim() },
        paymentTerms: formData.paymentTerms,
        currencyCode: (formData.currencyCode.trim().toUpperCase() || 'INR').slice(0, 3),
        address: {
          line1: formData.line1.trim(),
          line2: formData.line2.trim() || null,
          line3: formData.line3.trim() || null,
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim() || 'India',
          zipCode: formData.zipCode.trim(),
        },
        contact: {
          name: formData.contactName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
        },
        status: 'active' as const,
        metadata,
      };

      await vendorApi.createVendor(payload);
      toast.success('Vendor created successfully');

      setFormData({
        vendorCode: '',
        vendorName: '',
        gstin: '',
        paymentTerms: '30 days',
        currencyCode: 'INR',
        line1: '',
        line2: '',
        line3: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: '',
        contactName: '',
        email: '',
        phone: '',
        category: '',
        rating: '',
      });
      setIsDialogOpen(false);

      await loadVendors();
      await loadSummary();
    } catch (error: unknown) {
      console.error('Failed to save vendor:', error);
      const err = error as { message?: string; details?: { msg?: string; message?: string }[] };
      toast.error(err.message || 'Failed to save vendor. Please try again.');
      if (err.details && Array.isArray(err.details)) {
        const validationErrors = err.details.map((d) => d.msg || d.message).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      }
    } finally {
      setSaving(false);
    }
  };

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
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 bg-[#1677FF] text-white font-medium rounded-lg hover:bg-[#409EFF] flex items-center gap-2"
            >
              <Plus size={16} />
              Add New Vendor
            </button>
          </div>
        }
      />

      {summaryError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Summary metrics could not be loaded. KPI cards show unavailable until the request succeeds.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Vendors"
          value={metricValue(s?.activeVendors ?? undefined)}
          subValue={
            !summaryLoading && !summaryError && s?.pendingVendors != null
              ? `${s.pendingVendors} pending`
              : undefined
          }
          icon={<Users size={18} />}
          color="indigo"
        />
        <MetricCard
          label="SLA Compliance (GRN)"
          value={summaryLoading ? '—' : summaryError ? '—' : formatPercent(s?.slaCompliance ?? undefined)}
          icon={<Clock size={18} />}
          color="green"
        />
        <MetricCard
          label="Open POs"
          value={metricValue(s?.openPOs ?? undefined)}
          subValue={
            !summaryLoading && !summaryError ? formatCurrencyINR(s?.openPOValue ?? undefined) : undefined
          }
          icon={<Truck size={18} />}
          color="blue"
        />
        <MetricCard
          label="Critical Alerts"
          value={metricValue(s?.criticalAlerts ?? undefined)}
          icon={<AlertTriangle size={18} />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="On-Time Delivery"
          value={summaryLoading ? '—' : summaryError ? '—' : formatPercent(s?.deliveryTimeliness ?? undefined)}
          icon={<Truck size={18} />}
          color="green"
        />
        <MetricCard
          label="QC Pass Rate"
          value={summaryLoading ? '—' : summaryError ? '—' : formatPercent(s?.productQuality ?? undefined)}
          icon={<CheckCircle size={18} />}
          color="blue"
        />
        <MetricCard
          label="Rejection Rate"
          value={summaryLoading ? '—' : summaryError ? '—' : formatPercent(s?.rejectionRate ?? undefined)}
          icon={<AlertTriangle size={18} />}
          color="orange"
        />
        <MetricCard
          label="Avg PO Response"
          value={
            summaryLoading || summaryError
              ? '—'
              : s?.avgPOResponseHours == null
                ? '—'
                : `${s.avgPOResponseHours} hrs`
          }
          icon={<Clock size={18} />}
          color="purple"
        />
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-[#212121]">On-time delivery by day</h3>
            <p className="text-xs text-[#757575] mt-0.5">
              Completed shipments with ETA, last 30 days (from database)
            </p>
          </div>
        </div>
        {slaChartData.length === 0 ? (
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
                      Loading vendors…
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
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-[#FAFAFA]">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDialogOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-[#E0E0E0]">
              <h3 className="font-bold text-[#212121] text-lg">Add New Vendor</h3>
              <button
                type="button"
                onClick={() => {
                  setIsDialogOpen(false);
                  setFormData({
                    vendorCode: '',
                    vendorName: '',
                    gstin: '',
                    paymentTerms: '30 days',
                    currencyCode: 'INR',
                    line1: '',
                    line2: '',
                    line3: '',
                    city: '',
                    state: '',
                    country: 'India',
                    zipCode: '',
                    contactName: '',
                    email: '',
                    phone: '',
                    category: '',
                    rating: '',
                  });
                }}
                className="text-[#616161] hover:text-[#212121] p-1 hover:bg-[#F5F5F5] rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Vendor code <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.vendorCode}
                    onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Currency <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.currencyCode}
                    onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                    maxLength={3}
                    minLength={3}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Vendor name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    GSTIN / tax ID <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Payment terms <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentTerms: e.target.value as (typeof VENDOR_PAYMENT_TERMS)[number],
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  >
                    {VENDOR_PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs font-bold text-[#757575] uppercase">Address</p>
              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Line 1 <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">Line 2</label>
                  <input
                    value={formData.line2}
                    onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">Line 3</label>
                  <input
                    value={formData.line3}
                    onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    City <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    State <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Country <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    ZIP / PIN <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
              </div>

              <p className="text-xs font-bold text-[#757575] uppercase">Contact</p>
              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Contact name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Email <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Phone <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
              </div>

              <p className="text-xs font-bold text-[#757575] uppercase">Internal</p>
              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Category (metadata) <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">Rating (metadata, optional)</label>
                <input
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}