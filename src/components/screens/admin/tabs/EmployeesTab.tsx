import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchStaff, deleteStaff, Staff } from '../storeWarehouseApi';
import { fetchStores } from '../storeWarehouseApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddEmployeeModal } from '../modals/AddEmployeeModal';

export function EmployeesTab() {
  const [data, setData] = useState<Staff[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStores({ limit: 200 }).then((r) => setStores(r.data.map((s) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const staff = await fetchStaff({ storeId: storeFilter !== 'all' ? storeFilter : undefined });
      setData(staff);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [storeFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? data.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.storeName?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const handleAdd = () => {
    setEditEmployee(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Staff) => {
    setEditEmployee(s);
    setModalOpen(true);
  };

  const handleDelete = async (s: Staff) => {
    if (!confirm(`Delete employee "${s.name}"?`)) return;
    try {
      await deleteStaff(s.id);
      toast.success('Employee deleted');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete');
    }
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditEmployee(null);
    load();
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#e4e4e7] text-sm w-52"
            />
          </div>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="Store" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button onClick={handleAdd} className="h-9 px-4 bg-[#18181b] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] flex items-center gap-2">
          <Plus size={14} /> Add Employee
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
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Shift</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-[#71717a]">No employees found</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fcfcfc]">
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-[#52525b] capitalize">{s.role}</td>
                    <td className="px-6 py-4 text-[#52525b]">{s.storeName ?? '—'}</td>
                    <td className="px-6 py-4 text-[#52525b]">{s.phone ?? '—'}</td>
                    <td className="px-6 py-4 text-[#52525b] capitalize">{s.shift?.replace('_', ' ') ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] rounded"><MoreHorizontal size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(s)}><Edit size={14} className="mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(s)} className="text-rose-600"><Trash2 size={14} className="mr-2" /> Delete</DropdownMenuItem>
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
      <AddEmployeeModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={handleSuccess} editEmployee={editEmployee} stores={stores} />
    </>
  );
}
