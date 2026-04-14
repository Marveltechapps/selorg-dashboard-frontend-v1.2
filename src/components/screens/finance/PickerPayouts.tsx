import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PickerPayoutTable } from './PickerPayoutTable';
import { PickerPayoutDetailsDrawer } from './PickerPayoutDetailsDrawer';
import {
  PickerWithdrawalListItem,
  PickerWithdrawalDetails,
  PickerWithdrawalFilters,
  fetchPickerWithdrawals,
  fetchPickerWithdrawalDetails,
  fetchAllPickerTransactions,
  PickerTransactionRow,
} from './pickerWithdrawalsApi';

export function PickerPayouts() {
  type PopupWithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  type FinanceTab = PopupWithdrawalStatus | 'TRANSACTION_HISTORY';
  const [list, setList] = useState<PickerWithdrawalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PickerWithdrawalFilters>({
    page: 1,
    limit: 50,
    status: undefined,
  });
  const [activeTab, setActiveTab] = useState<FinanceTab>('PENDING');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<PickerWithdrawalDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [txRows, setTxRows] = useState<PickerTransactionRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilters, setTxFilters] = useState<{ search?: string; startDate?: string; endDate?: string; type?: string }>({});

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPickerWithdrawals({
        ...filters,
        status: activeTab === 'TRANSACTION_HISTORY' ? undefined : activeTab,
      });
      setList(result.data ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);
    } catch (e) {
      toast.error('Failed to load picker withdrawals');
      setList([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleViewDetails = async (item: PickerWithdrawalListItem) => {
    setSelectedWithdrawal(null);
    setDetailsOpen(true);
    try {
      const details = await fetchPickerWithdrawalDetails(item.id);
      setSelectedWithdrawal(details);
    } catch {
      setDetailsOpen(false);
    }
  };

  const handleApprove = (item: PickerWithdrawalListItem) => {
    handleViewDetails(item);
  };

  const handleReject = (item: PickerWithdrawalListItem) => {
    handleViewDetails(item);
  };

  const handleMarkPaid = (item: PickerWithdrawalListItem) => {
    handleViewDetails(item);
  };

  const handleRefresh = () => {
    loadList();
  };

  const statusTabs: Array<PopupWithdrawalStatus | 'TRANSACTION_HISTORY'> = ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'TRANSACTION_HISTORY'];

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetchAllPickerTransactions({
        ...txFilters,
        page: 1,
        limit: 100,
      });
      setTxRows(res.data || []);
    } catch {
      toast.error('Failed to load transactions');
      setTxRows([]);
    } finally {
      setTxLoading(false);
    }
  }, [txFilters]);

  useEffect(() => {
    if (activeTab === ('TRANSACTION_HISTORY' as any)) {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212121]">Picker Payouts</h1>
        <p className="text-[#757575] text-sm">
          Review and process picker wallet withdrawal requests
        </p>
      </div>

      <div className="flex gap-2 border-b border-[#E0E0E0] pb-0">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab as any);
              if (tab !== 'TRANSACTION_HISTORY') {
                setFilters((prev) => ({ ...prev, status: tab as PopupWithdrawalStatus, page: 1 }));
              }
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#14B8A6] text-[#14B8A6]'
                : 'border-transparent text-[#757575] hover:text-[#212121]'
            }`}
          >
            {tab === 'TRANSACTION_HISTORY' ? 'Transaction History' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {activeTab !== ('TRANSACTION_HISTORY' as any) ? (
      <PickerPayoutTable
        data={list}
        isLoading={isLoading}
        filters={{ ...filters, status: activeTab as PopupWithdrawalStatus }}
        onFilterChange={setFilters}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkPaid={handleMarkPaid}
        onViewDetails={handleViewDetails}
      />
      ) : (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="h-9 rounded border px-3 text-sm"
              placeholder="Search picker name/phone"
              value={txFilters.search || ''}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <input
              type="date"
              className="h-9 rounded border px-3 text-sm"
              value={txFilters.startDate || ''}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, startDate: e.target.value || undefined }))}
            />
            <input
              type="date"
              className="h-9 rounded border px-3 text-sm"
              value={txFilters.endDate || ''}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, endDate: e.target.value || undefined }))}
            />
            <select
              className="h-9 rounded border px-3 text-sm"
              value={txFilters.type || ''}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, type: e.target.value || undefined }))}
            >
              <option value="">All types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
            <button className="h-9 px-3 border rounded text-sm" onClick={loadTransactions}>
              Apply
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F7FA]">
                <tr>
                  <th className="px-3 py-2 text-left">Picker</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {txRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{row.pickerName} ({row.pickerPhone})</td>
                    <td className="px-3 py-2 capitalize">{row.type}</td>
                    <td className="px-3 py-2">₹{row.amount}</td>
                    <td className="px-3 py-2">{row.description || '—'}</td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                    <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!txLoading && txRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-[#757575]" colSpan={6}>
                      No transactions found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-[#757575]">
          <span>
            Page {filters.page ?? 1} of {totalPages} • {total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
              disabled={(filters.page ?? 1) === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setFilters((p) => ({ ...p, page: Math.min(totalPages, (p.page ?? 1) + 1) }))
              }
              disabled={(filters.page ?? 1) >= totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <PickerPayoutDetailsDrawer
        withdrawal={selectedWithdrawal}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedWithdrawal(null);
        }}
        onApprove={() => {}}
        onReject={() => {}}
        onMarkPaid={() => {}}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
