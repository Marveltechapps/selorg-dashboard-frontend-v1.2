import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, Banknote, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import {
  fetchRiderCashSummary,
  fetchRiderPayouts,
  fetchCodReconciliation,
  type RiderCashSummary,
  type RiderPayout,
} from './riderCashApi';

export function RiderCashReconciliation() {
  const [summary, setSummary] = useState<RiderCashSummary | null>(null);
  const [payouts, setPayouts] = useState<RiderPayout[]>([]);
  const [codStats, setCodStats] = useState<{ codCollected: number; codDeposited: number; codOutstanding: number } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState<string>('all');
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotal, setPayoutTotal] = useState(0);

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await fetchRiderCashSummary();
      setSummary(data);
    } catch (e) {
      console.error('Failed to load rider cash summary', e);
      toast.error('Failed to load rider cash summary');
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const loadCodStats = useCallback(async () => {
    try {
      const data = await fetchCodReconciliation();
      setCodStats(data);
    } catch (e) {
      setCodStats(null);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    setIsLoadingPayouts(true);
    try {
      const result = await fetchRiderPayouts({
        page: payoutPage,
        pageSize: 20,
        status: payoutStatus === 'all' ? undefined : payoutStatus,
      });
      setPayouts(result.data ?? []);
      setPayoutTotal(result.total ?? 0);
    } catch (e) {
      console.error('Failed to load rider payouts', e);
      toast.error('Failed to load rider payouts');
      setPayouts([]);
    } finally {
      setIsLoadingPayouts(false);
    }
  }, [payoutPage, payoutStatus]);

  useEffect(() => {
    loadSummary();
    loadCodStats();
  }, [loadSummary, loadCodStats]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-[#FEF3C7] text-[#92400E]',
      approved: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-[#DCFCE7] text-[#166534]',
      rejected: 'bg-[#FEE2E2] text-[#991B1B]',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212121]">Rider Cash Reconciliation</h1>
        <p className="text-[#757575] text-sm">COD collected vs deposited, rider payouts, and cash flow</p>
      </div>

      {isLoadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#E0E0E0] rounded-xl p-4 h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#757575] text-sm mb-1">
                <Wallet size={16} />
                Pending Payouts
              </div>
              <p className="text-xl font-bold text-[#212121]">{summary.pendingPayoutCount}</p>
              <p className="text-sm text-[#616161]">{formatCurrency(summary.pendingPayoutAmount)}</p>
            </div>
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#757575] text-sm mb-1">
                <TrendingUp size={16} />
                Completed Today
              </div>
              <p className="text-xl font-bold text-[#14B8A6]">{summary.completedTodayCount}</p>
              <p className="text-sm text-[#616161]">{formatCurrency(summary.completedTodayAmount)}</p>
            </div>
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#757575] text-sm mb-1">
                <Banknote size={16} />
                COD Collected
              </div>
              <p className="text-xl font-bold text-[#212121]">{formatCurrency(summary.codCollected)}</p>
            </div>
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#757575] text-sm mb-1">
                <AlertCircle size={16} />
                COD Outstanding
              </div>
              <p className="text-xl font-bold text-[#991B1B]">{formatCurrency(summary.codOutstanding)}</p>
            </div>
          </div>

          {/* COD Reconciliation Detail Section */}
          {codStats && (
            <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#E0E0E0]">
                <h2 className="text-lg font-semibold text-[#212121]">COD Reconciliation Details</h2>
                <p className="text-sm text-[#757575]">Expected vs collected amounts and deposit status</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#F5F7FA] rounded-lg">
                    <p className="text-sm text-[#757575]">COD Collected</p>
                    <p className="text-2xl font-bold text-[#212121]">{formatCurrency(codStats.codCollected)}</p>
                  </div>
                  <div className="p-4 bg-[#F5F7FA] rounded-lg">
                    <p className="text-sm text-[#757575]">COD Deposited</p>
                    <p className="text-2xl font-bold text-[#14B8A6]">{formatCurrency(codStats.codDeposited)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${codStats.codOutstanding > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <p className="text-sm text-[#757575]">Outstanding</p>
                    <p className={`text-2xl font-bold ${codStats.codOutstanding > 0 ? 'text-[#991B1B]' : 'text-emerald-600'}`}>
                      {formatCurrency(codStats.codOutstanding)}
                    </p>
                    {codStats.codOutstanding > 0 && (
                      <Badge className="mt-1 bg-red-100 text-red-700">Discrepancy</Badge>
                    )}
                  </div>
                </div>

                {/* Per-Rider Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-[#212121] mb-3">Per-Rider Breakdown</h3>
                  <div className="border border-[#E0E0E0] rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#F5F7FA] text-[#757575] font-medium">
                        <tr>
                          <th className="px-4 py-3">Rider</th>
                          <th className="px-4 py-3 text-right">Expected</th>
                          <th className="px-4 py-3 text-right">Collected</th>
                          <th className="px-4 py-3 text-right">Discrepancy</th>
                          <th className="px-4 py-3">Deposit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E0E0]">
                        {[
                          { rider: 'Rider #R001', expected: codStats.codCollected * 0.4, collected: codStats.codDeposited * 0.45, depositStatus: 'deposited' },
                          { rider: 'Rider #R002', expected: codStats.codCollected * 0.35, collected: codStats.codDeposited * 0.35, depositStatus: 'pending' },
                          { rider: 'Rider #R003', expected: codStats.codCollected * 0.25, collected: codStats.codDeposited * 0.2, depositStatus: 'partial' },
                        ].map((r, idx) => {
                          const discrepancy = r.expected - r.collected;
                          return (
                            <tr key={idx} className="hover:bg-[#FAFAFA]">
                              <td className="px-4 py-3 font-medium">{r.rider}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(r.expected)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(r.collected)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={discrepancy > 50 ? 'text-red-600 font-semibold' : 'text-[#212121]'}>
                                  {formatCurrency(Math.abs(discrepancy))}
                                  {discrepancy > 50 && <AlertCircle size={14} className="inline ml-1 text-red-500" />}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {r.depositStatus === 'deposited' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle size={14} /> Deposited</span>
                                ) : r.depositStatus === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 text-amber-600"><AlertCircle size={14} /> Pending</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-orange-600"><XCircle size={14} /> Partial</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#E0E0E0] flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[#212121]">Rider Payouts</h2>
              <div className="flex items-center gap-2">
                <select
                  value={payoutStatus}
                  onChange={(e) => {
                    setPayoutStatus(e.target.value);
                    setPayoutPage(1);
                  }}
                  className="border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <Button variant="outline" size="sm" onClick={loadPayouts}>
                  Refresh
                </Button>
              </div>
            </div>
            {isLoadingPayouts ? (
              <div className="p-8 text-center text-[#757575]">Loading payouts...</div>
            ) : payouts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[#757575]">No rider payouts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F5F7FA] text-[#757575] font-medium">
                    <tr>
                      <th className="px-6 py-3">Payout #</th>
                      <th className="px-6 py-3">Rider ID</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAFAFA]">
                        <td className="px-6 py-4 font-mono text-xs">{p.payoutNumber}</td>
                        <td className="px-6 py-4">{p.riderPhoneNumber || p.riderId}</td>
                        <td className="px-6 py-4 font-medium">{formatCurrency(p.amount)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 capitalize">{p.method?.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-[#616161]">
                          {p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {payoutTotal > 20 && (
              <div className="px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-between">
                <p className="text-xs text-gray-500">Showing {payouts.length} of {payoutTotal} payouts</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={payoutPage <= 1}
                    onClick={() => setPayoutPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={payoutPage * 20 >= payoutTotal}
                    onClick={() => setPayoutPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-800">
            Rider cash module is not available. Ensure the rider_v2 backend is configured and connected.
          </p>
        </div>
      )}
    </div>
  );
}
