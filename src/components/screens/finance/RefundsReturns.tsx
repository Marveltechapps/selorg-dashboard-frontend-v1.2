import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/api/apiClient';

import { RefundsSummaryCards } from './RefundsSummaryCards';
import { RefundQueueTable } from './RefundQueueTable';
import { RefundDetailsDrawer } from './RefundDetailsDrawer';
import { ApproveRefundModal } from './ApproveRefundModal';
import { RejectRefundModal } from './RejectRefundModal';
import { DisputeCenter } from './DisputeCenter';

import { 
    RefundRequest, 
    RefundsSummary, 
    RefundQueueFilter,
    fetchRefundsSummary,
    fetchRefundQueue,
    fetchRefundDetails
} from './refundsApi';

export function RefundsReturns() {
  // --- State ---
  const [summary, setSummary] = useState<RefundsSummary | null>(null);
  const [queue, setQueue] = useState<RefundRequest[]>([]);
  
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  
  const [filters, setFilters] = useState<RefundQueueFilter>({
      page: 1,
      pageSize: 50, // Increased to show more data
      status: undefined, // Show all by default
      reason: undefined,
      dateFrom: undefined,
      dateTo: undefined
  });

  // Wallet transactions
  const [activeView, setActiveView] = useState<'refunds' | 'wallet'>('refunds');
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);

  // Modals / Drawers
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  // --- Data Fetching ---
  const loadSummary = async () => {
      try {
          const data = await fetchRefundsSummary();
          setSummary(data);
      } catch (e) {
          console.error("Failed to load summary", e);
      } finally {
          setIsLoadingSummary(false);
      }
  };

  const loadQueue = useCallback(async () => {
      setIsLoadingQueue(true);
      try {
          // Fetch refund queue with current filters
          const result = await fetchRefundQueue(filters);
          setQueue(result.data);
      } catch (e) {
          toast.error("Failed to load refund queue");
      } finally {
          setIsLoadingQueue(false);
      }
  }, [filters]);

  useEffect(() => {
      loadSummary();
  }, []);

  useEffect(() => {
      loadQueue();
  }, [loadQueue]);

  // --- Handlers ---
  const handleFilterClick = (type: 'pending' | 'chargebacks' | 'processed') => {
      if (type === 'chargebacks') {
          setDisputeOpen(true);
      } else if (type === 'processed') {
           setFilters(prev => ({ ...prev, status: 'processed', page: 1 }));
      } else {
           setFilters(prev => ({ ...prev, status: 'pending', page: 1 }));
      }
  };

  const handleApproveClick = (refund: RefundRequest) => {
      setSelectedRefund(refund);
      setApproveOpen(true);
  };

  const handleRejectClick = (refund: RefundRequest) => {
      setSelectedRefund(refund);
      setRejectOpen(true);
  };

  const handleViewDetails = async (refund: RefundRequest) => {
      setSelectedRefund(refund);
      setDetailsOpen(true);
      try {
          const detailed = await fetchRefundDetails(refund.id);
          setSelectedRefund(detailed);
      } catch (e) {
          // Silent fail
      }
  };

  const loadWalletTransactions = async () => {
    setWalletLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: any[] }>('/finance/wallet-transactions');
      setWalletTxns(res.data ?? []);
    } catch {
      setWalletTxns([]);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'wallet') loadWalletTransactions();
  }, [activeView]);

  const handleRefresh = () => {
      loadQueue();
      loadSummary();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Refunds & Returns</h1>
          <p className="text-[#757575] text-sm">Process refund requests, handle chargebacks, and track returns</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setDisputeOpen(true)}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] flex items-center gap-2 shadow-sm transition-colors"
             >
                <AlertTriangle size={16} />
                Dispute Center
            </button>
        </div>
      </div>

      <RefundsSummaryCards 
        summary={summary} 
        isLoading={isLoadingSummary} 
        onFilterClick={handleFilterClick}
      />

      {/* View Toggle: Refunds | Wallet Transactions */}
      <div className="flex gap-2 border-b border-[#E0E0E0] pb-0">
        <button
          onClick={() => setActiveView('refunds')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'refunds' ? 'border-[#14B8A6] text-[#14B8A6]' : 'border-transparent text-[#757575] hover:text-[#212121]'}`}
        >
          Refund Queue
        </button>
        <button
          onClick={() => setActiveView('wallet')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeView === 'wallet' ? 'border-[#14B8A6] text-[#14B8A6]' : 'border-transparent text-[#757575] hover:text-[#212121]'}`}
        >
          <Wallet size={14} /> Wallet Transactions
        </button>
      </div>

      {activeView === 'wallet' ? (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
            <h3 className="font-bold text-[#212121]">Wallet Transactions</h3>
          </div>
          {walletLoading ? (
            <div className="p-12 text-center text-gray-500">Loading wallet transactions...</div>
          ) : walletTxns.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No wallet transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                  <tr>
                    <th className="px-6 py-3">Transaction ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {walletTxns.map((txn: any) => (
                    <tr key={txn._id || txn.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-6 py-4 font-mono text-xs text-[#616161]">{(txn._id || txn.id || '').slice(-8)}</td>
                      <td className="px-6 py-4 font-medium text-[#212121]">{txn.customerName || txn.customerId || '—'}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize border-0 font-medium text-xs ${txn.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {txn.type || '—'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#212121]">₹{(txn.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-[#757575]">{txn.reference || txn.orderId || '—'}</td>
                      <td className="px-6 py-4 text-xs text-[#757575]">{txn.createdAt ? new Date(txn.createdAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      <RefundQueueTable 
        data={queue}
        isLoading={isLoadingQueue}
        filters={filters}
        onFilterChange={setFilters}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
        onViewDetails={handleViewDetails}
      />
      )}

      {/* Details Drawer */}
      <RefundDetailsDrawer 
        refund={selectedRefund}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onApprove={(r) => {
            setDetailsOpen(false);
            handleApproveClick(r);
        }}
        onReject={(r) => {
             setDetailsOpen(false);
             handleRejectClick(r);
        }}
        onRefresh={handleRefresh}
      />

      {/* Action Modals */}
      <ApproveRefundModal 
        refund={selectedRefund}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onSuccess={handleRefresh}
      />

      <RejectRefundModal 
        refund={selectedRefund}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Dispute Center Modal */}
      <DisputeCenter 
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
      />
    </div>
  );
}
