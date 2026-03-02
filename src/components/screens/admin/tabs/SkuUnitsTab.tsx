import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSkuUnits, deleteSkuUnit, SkuUnit } from '../masterDataApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddSkuUnitModal } from '../modals/AddSkuUnitModal';

interface SkuUnitsTabProps {
  openAddModal?: boolean;
  onAddModalClose?: () => void;
}

export function SkuUnitsTab({ openAddModal, onAddModalClose }: SkuUnitsTabProps = {}) {
  const [data, setData] = useState<SkuUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<SkuUnit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSkuUnits();
      setData(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load SKU units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (openAddModal) {
      setModalOpen(true);
      setEditItem(null);
      onAddModalClose?.();
    }
  }, [openAddModal]);

  const handleAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (s: SkuUnit) => {
    setEditItem(s);
    setModalOpen(true);
  };

  const handleDelete = async (s: SkuUnit) => {
    if (!confirm(`Deactivate SKU unit "${s.name}"?`)) return;
    try {
      await deleteSkuUnit(s.id);
      toast.success('SKU unit deactivated');
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
          <Plus size={14} /> Add SKU Unit
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
                <th className="px-6 py-3">Base Unit</th>
                <th className="px-6 py-3">Conversion</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#71717a]">No SKU units found</td></tr>
              ) : (
                data.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fcfcfc]">
                    <td className="px-6 py-4 font-mono">{s.code}</td>
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-[#52525b]">{s.baseUnit ?? '—'}</td>
                    <td className="px-6 py-4 text-[#52525b]">{s.conversionFactor ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${s.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {s.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] rounded"><MoreHorizontal size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(s)}><Edit size={14} className="mr-2" /> Edit</DropdownMenuItem>
                          {s.isActive !== false && (
                            <DropdownMenuItem onClick={() => handleDelete(s)} className="text-rose-600"><Trash2 size={14} className="mr-2" /> Deactivate</DropdownMenuItem>
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
      <AddSkuUnitModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditItem(null);
          onAddModalClose?.();
        }}
        onSuccess={handleSuccess}
        editItem={editItem}
      />
    </>
  );
}
