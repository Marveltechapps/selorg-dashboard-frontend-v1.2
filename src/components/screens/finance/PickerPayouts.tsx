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
} from './pickerWithdrawalsApi';

export function PickerPayouts() {
  const [list, setList] = useState<PickerWithdrawalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PickerWithdrawalFilters>({
    page: 1,
    limit: 50,
    status: undefined,
  });
  const [activeTab, setActiveTab] = useState<PopupWithdrawalStatus | 'all'>('PENDING');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<PickerWithdrawalDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPickerWithdrawals({
        ...filters,
        status: activeTab === 'all' ? undefined : activeTab,
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

  type PopupWithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212121]">Picker Payouts</h1>
        <p className="text-[#757575] text-sm">
          Review and process picker wallet withdrawal requests
        </p>
      </div>

      <div className="flex gap-2 border-b border-[#E0E0E0] pb-0">
        {(['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setFilters((prev) => ({ ...prev, status: tab, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#14B8A6] text-[#14B8A6]'
                : 'border-transparent text-[#757575] hover:text-[#212121]'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <PickerPayoutTable
        data={list}
        isLoading={isLoading}
        filters={{ ...filters, status: activeTab }}
        onFilterChange={setFilters}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkPaid={handleMarkPaid}
        onViewDetails={handleViewDetails}
      />

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-[#757575]">
          <span>
            Page {filters.page} of {totalPages} • {total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
              disabled={filters.page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setFilters((p) => ({ ...p, page: Math.min(totalPages, (p.page ?? 1) + 1) }))
              }
              disabled={filters.page >= totalPages}
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
