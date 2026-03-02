import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchVehicleTypes, deleteVehicleType, VehicleType } from '../masterDataApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddVehicleTypeModal } from '../modals/AddVehicleTypeModal';

export function VehicleTypesTab() {
  const [data, setData] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<VehicleType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVehicleTypes();
      setData(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (v: VehicleType) => {
    setEditItem(v);
    setModalOpen(true);
  };

  const handleDelete = async (v: VehicleType) => {
    if (!confirm(`Deactivate vehicle type "${v.name}"?`)) return;
    try {
      await deleteVehicleType(v.id);
      toast.success('Vehicle type deactivated');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to deactivate');
    }
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditItem(null);
    load();
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-end">
        <button onClick={handleAdd} className="h-9 px-4 bg-[#18181b] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] flex items-center gap-2">
          <Plus size={14} /> Add Vehicle Type
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
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#71717a]">No vehicle types found</td></tr>
              ) : (
                data.map((v) => (
                  <tr key={v.id} className="hover:bg-[#fcfcfc]">
                    <td className="px-6 py-4 font-mono">{v.code}</td>
                    <td className="px-6 py-4 font-medium">{v.name}</td>
                    <td className="px-6 py-4 text-[#52525b]">{v.description ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${v.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {v.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] rounded"><MoreHorizontal size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(v)}><Edit size={14} className="mr-2" /> Edit</DropdownMenuItem>
                          {v.isActive !== false && (
                            <DropdownMenuItem onClick={() => handleDelete(v)} className="text-rose-600"><Trash2 size={14} className="mr-2" /> Deactivate</DropdownMenuItem>
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
      <AddVehicleTypeModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={handleSuccess} editItem={editItem} />
    </>
  );
}
