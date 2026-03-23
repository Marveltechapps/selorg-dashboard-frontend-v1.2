import React, { useEffect, useState } from 'react';
import { X, Package, Clock, CheckCircle, XCircle, IndianRupee, Loader2 } from 'lucide-react';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';

interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  complianceStatus: 'Compliant' | 'Pending' | 'Non-Compliant';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Review';
  statusColor: string;
}

interface PerformanceReportModalProps {
  vendor: Vendor;
  onClose: () => void;
}

type PerformanceApi = {
  vendorId: string;
  overallScore: number;
  deliveryTimelinessPct: number;
  productQualityPct: number;
  orderFulfillmentPct: number;
  compliancePct: number;
  purchaseOrders: { total: number; completed: number; pending: number; cancelled: number };
  qc: { total: number; passed: number; failed: number; pending: number };
  grn?: { total: number; approved: number; rejected: number };
  totalRevenue?: number;
  currencyCode?: string;
  complaintsLast30d?: number;
};

export function PerformanceReportModal({ vendor, onClose }: PerformanceReportModalProps) {
  const [data, setData] = useState<PerformanceApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await vendorApi.getVendorPerformance(vendor.id);
        if (!cancelled) setData(raw as PerformanceApi);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load performance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor.id]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 75) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-[#D1FAE5]';
    if (score >= 75) return 'bg-[#FEF3C7]';
    return 'bg-[#FEE2E2]';
  };

  const fmtInr = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Number.isFinite(n) ? n : 0,
    );

  const po = data?.purchaseOrders;
  const qc = data?.qc;
  const grn = data?.grn;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <h2 className="text-xl font-bold">Performance Report</h2>
              <p className="text-sm opacity-90 mt-1">{vendor.name}</p>
              <p className="text-xs opacity-75 mt-0.5">Vendor ID: {vendor.id}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#6B7280]">
              <Loader2 className="animate-spin text-[#4F46E5]" size={40} />
              <p>Loading metrics from purchase orders, QC checks, and GRNs…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] px-4 py-3 text-sm">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <div className="mb-6 text-center">
                <div
                  className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(data.overallScore)} mb-3`}
                >
                  <span className={`text-3xl font-bold ${getScoreColor(data.overallScore)}`}>
                    {Math.round(data.overallScore)}
                  </span>
                </div>
                <h3 className="font-bold text-[#1F2937] mb-1">Overall Performance Score</h3>
                <p className="text-sm text-[#6B7280]">Computed from on-time GRNs, QC pass rate, and PO fulfillment</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={18} className="text-[#4F46E5]" />
                    <span className="text-xs text-[#6B7280] font-medium">Total POs</span>
                  </div>
                  <p className="text-2xl font-bold text-[#1F2937]">{po?.total ?? 0}</p>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-[#10B981]" />
                    <span className="text-xs text-[#6B7280] font-medium">Completed POs</span>
                  </div>
                  <p className="text-2xl font-bold text-[#10B981]">{po?.completed ?? 0}</p>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-[#F59E0B]" />
                    <span className="text-xs text-[#6B7280] font-medium">Open / pending POs</span>
                  </div>
                  <p className="text-2xl font-bold text-[#F59E0B]">{po?.pending ?? 0}</p>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} className="text-[#EF4444]" />
                    <span className="text-xs text-[#6B7280] font-medium">Cancelled POs</span>
                  </div>
                  <p className="text-2xl font-bold text-[#EF4444]">{po?.cancelled ?? 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-sm">
                <div className="border border-[#E5E7EB] rounded-lg p-3">
                  <p className="text-[#6B7280] text-xs font-medium mb-1">QC checks</p>
                  <p className="font-semibold text-[#1F2937]">
                    {qc?.total ?? 0} total · {qc?.passed ?? 0} pass · {qc?.failed ?? 0} fail · {qc?.pending ?? 0} other
                  </p>
                </div>
                {grn && (
                  <div className="border border-[#E5E7EB] rounded-lg p-3">
                    <p className="text-[#6B7280] text-xs font-medium mb-1">GRNs</p>
                    <p className="font-semibold text-[#1F2937]">
                      {grn.total} total · {grn.approved} approved · {grn.rejected} rejected
                    </p>
                  </div>
                )}
                <div className="border border-[#E5E7EB] rounded-lg p-3">
                  <p className="text-[#6B7280] text-xs font-medium mb-1">Complaints (alerts)</p>
                  <p className="font-semibold text-[#1F2937]">{data.complaintsLast30d ?? 0}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="font-bold text-[#1F2937]">Score breakdown</h4>

                {[
                  { label: 'Delivery / GRN timeliness (proxy)', value: data.deliveryTimelinessPct },
                  { label: 'Product quality (QC pass rate)', value: data.productQualityPct },
                  { label: 'Order fulfillment', value: data.orderFulfillmentPct },
                  { label: 'Compliance (QC-based)', value: data.compliancePct },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-[#1F2937]">{row.label}</span>
                      <span className={`font-bold ${getScoreColor(row.value)}`}>{Math.round(row.value)}%</span>
                    </div>
                    <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4F46E5] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] p-4 rounded-lg border border-[#BBF7D0]">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee size={18} className="text-[#10B981]" />
                    <span className="text-xs text-[#065F46] font-medium">PO revenue (sum of grand totals)</span>
                  </div>
                  <p className="text-xl font-bold text-[#065F46]">{fmtInr(data.totalRevenue ?? 0)}</p>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280]">
                  Trend charts require stored time-series aggregation and are not shown here. All numbers above are live
                  counts from your vendor database.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
          <p className="text-xs text-[#6B7280]">Report generated on {new Date().toLocaleDateString()}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
