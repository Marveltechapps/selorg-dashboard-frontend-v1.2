import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMasterPickers,
  updateMasterPickerStatus,
  type MasterPickerRow,
} from '../masterDataApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PickerMasterDetailModal } from '../modals/PickerMasterDetailModal';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'SUSPENDED':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'DELETION_PENDING':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

export function PickersTab() {
  const [data, setData] = useState<MasterPickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailRow, setDetailRow] = useState<MasterPickerRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMasterPickers({
        search: search || undefined,
        status: statusFilter,
        page,
        limit: PAGE_SIZE,
      });
      setData(res.data);
      const tp = Math.max(1, Math.ceil(res.total / res.pageSize));
      setTotalPages(tp);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load pickers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSuspend = async (row: MasterPickerRow) => {
    const next = row.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setBusyId(row.id);
    try {
      await updateMasterPickerStatus(row.id, next);
      toast.success(next === 'SUSPENDED' ? 'Picker suspended' : 'Picker activated');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#e4e4e7] text-sm w-52"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="DELETION_PENDING">Deletion pending</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#18181b] border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f9fafb] text-[#71717a] font-medium border-b border-[#e4e4e7] sticky top-0">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Onboarding</th>
                <th className="px-6 py-3">Last seen</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {data.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-medium text-[#18181b]">{row.name}</td>
                  <td className="px-6 py-4">{row.phone}</td>
                  <td className="px-6 py-4">{row.locationName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{row.onboardingStep}</td>
                  <td className="px-6 py-4 text-xs text-[#71717a]">
                    {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setDetailRow(row);
                          setModalOpen(true);
                        }}
                        title="View"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={busyId === row.id || row.status === 'DELETION_PENDING'}
                        onClick={() => toggleSuspend(row)}
                        title={row.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                      >
                        {row.status === 'SUSPENDED' ? <UserCheck size={16} /> : <UserX size={16} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-between items-center px-6 py-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
          <button
            type="button"
            className="underline disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="underline disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <PickerMasterDetailModal open={modalOpen} onOpenChange={setModalOpen} row={detailRow} />
    </>
  );
}
