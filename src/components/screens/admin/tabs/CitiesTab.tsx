import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCities,
  createCity,
  updateCity,
  deleteCity,
  City,
} from '../masterDataApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddCityModal } from '../modals/AddCityModal';

const PAGE_SIZE = 20;

export function CitiesTab() {
  const [data, setData] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCity, setEditCity] = useState<City | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCities({ search: search || undefined, page, limit: PAGE_SIZE });
      setData(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => {
    setEditCity(null);
    setModalOpen(true);
  };

  const handleEdit = (c: City) => {
    setEditCity(c);
    setModalOpen(true);
  };

  const handleDelete = async (c: City) => {
    if (!confirm(`Deactivate city "${c.name}"?`)) return;
    try {
      await deleteCity(c.id);
      toast.success('City deactivated');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to deactivate');
    }
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditCity(null);
    load();
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
          <input
            type="text"
            placeholder="Search cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#e4e4e7] text-sm w-52"
          />
        </div>
        <button onClick={handleAdd} className="h-9 px-4 bg-[#18181b] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] flex items-center gap-2">
          <Plus size={14} /> Add City
        </button>
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
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#71717a]">No cities found</td></tr>
              ) : (
                data.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fcfcfc]">
                    <td className="px-6 py-4 font-mono">{c.code}</td>
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-[#52525b]">{c.state ?? '—'}</td>
                    <td className="px-6 py-4 text-[#52525b]">{c.country ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${c.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {c.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] rounded"><MoreHorizontal size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(c)}><Edit size={14} className="mr-2" /> Edit</DropdownMenuItem>
                          {c.isActive !== false && (
                            <DropdownMenuItem onClick={() => handleDelete(c)} className="text-rose-600"><Trash2 size={14} className="mr-2" /> Deactivate</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      <AddCityModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={handleSuccess} editCity={editCity} />
    </>
  );
}
