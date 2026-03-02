import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchRiders, updateRiderStatus, Rider } from '../masterDataApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiderDetailsModal } from '../modals/RiderDetailsModal';

const PAGE_SIZE = 20;

export function RidersTab() {
  const [data, setData] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailsRider, setDetailsRider] = useState<Rider | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRiders({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        availability: availabilityFilter !== 'all' ? availabilityFilter : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setData(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, availabilityFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleViewDetails = (r: Rider) => {
    setDetailsRider(r);
    setModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    setModalOpen(false);
    setDetailsRider(null);
    load();
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
          <input
            type="text"
            placeholder="Search riders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#e4e4e7] text-sm w-52"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[120px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="h-9 w-[120px] bg-white"><SelectValue placeholder="Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e11d48] border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f9fafb] text-[#71717a] font-medium border-b border-[#e4e4e7] sticky top-0">
              <tr>
                <th className="px-6 py-3">Rider ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Availability</th>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {data.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-[#71717a]">No riders found</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-[#fcfcfc]">
                    <td className="px-6 py-4 font-mono text-[#71717a]">{r.riderId}</td>
                    <td className="px-6 py-4 font-medium">{r.name}</td>
                    <td className="px-6 py-4 text-[#52525b]">{r.phone}</td>
                    <td className="px-6 py-4 text-[#52525b] capitalize">{r.vehicleType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : r.status === 'suspended' ? 'bg-rose-50 text-rose-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${r.availability === 'available' ? 'bg-emerald-50 text-emerald-700' : r.availability === 'busy' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {r.availability}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#52525b]">{r.cityName ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleViewDetails(r)} className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] rounded">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-[#e4e4e7] flex justify-between text-sm text-[#71717a]">
          <span>Showing {data.length} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 disabled:opacity-50">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
      <RiderDetailsModal open={modalOpen} onOpenChange={setModalOpen} rider={detailsRider} onStatusUpdate={handleStatusUpdate} />
    </>
  );
}
