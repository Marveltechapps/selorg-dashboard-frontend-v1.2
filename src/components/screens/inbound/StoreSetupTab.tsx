import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import {
  fetchShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  DEFAULT_STORE_ZONE,
} from '../../../api/inventory-management/shelves.api';

type ShelfRow = {
  shelf_id: string;
  location_code: string;
  aisle: string;
  shelf_number: number;
  zone: string;
  section?: string;
  status: string;
  is_critical: boolean;
  is_misplaced: boolean;
};

const EMPTY_FORM = {
  location_code: '',
  section: '',
  status: 'normal' as const,
};

export function StoreSetupTab({
  storeId,
  onShelvesUpdated,
}: {
  storeId: string;
  onShelvesUpdated?: () => void;
}) {
  const [shelves, setShelves] = useState<ShelfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadShelves = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetchShelves({ storeId, zone: DEFAULT_STORE_ZONE });
      if (!isMountedRef.current) return;
      setShelves(Array.isArray(res?.shelves) ? res.shelves : []);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      setShelves([]);
      if (!silent) toast.error(error.message || 'Failed to load shelves');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadShelves();
    return () => {
      isMountedRef.current = false;
    };
  }, [storeId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const location_code = form.location_code.trim();
    if (!location_code) {
      toast.error('Location code is required (e.g. A-01-01)');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        storeId,
        zone: DEFAULT_STORE_ZONE,
        location_code,
        section: form.section.trim() || undefined,
        status: form.status,
      };
      if (editingId) {
        await updateShelf(editingId, payload);
        toast.success('Shelf updated');
      } else {
        await createShelf(payload);
        toast.success('Shelf added');
      }
      resetForm();
      await loadShelves(true);
      onShelvesUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save shelf');
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const handleEdit = (row: ShelfRow) => {
    setEditingId(row.shelf_id);
    setForm({
      location_code: row.location_code,
      section: row.section || '',
      status: (row.status as 'normal' | 'critical' | 'misplaced') || 'normal',
    });
  };

  const handleDelete = async (row: ShelfRow) => {
    if (!confirm(`Delete shelf ${row.location_code}?`)) return;
    setSaving(true);
    try {
      await deleteShelf(row.shelf_id);
      toast.success('Shelf deleted');
      if (editingId === row.shelf_id) resetForm();
      await loadShelves(true);
      onShelvesUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shelf');
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#212121] flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#1677FF]" />
            Store Setup
          </h3>
          <p className="text-sm text-[#616161] mt-1">
            Define shelf locations for this store. Putaway routing uses this floor map.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadShelves()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#1677FF] border border-[#91CAFF] rounded-lg hover:bg-[#F0F7FF] disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-[#E0E0E0] p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-[#616161] mb-1">Location code</label>
          <input
            value={form.location_code}
            onChange={(e) => setForm((f) => ({ ...f, location_code: e.target.value }))}
            placeholder="A-01-01"
            className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm"
            disabled={saving}
          />
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-[#616161] mb-1">Section label</label>
          <input
            value={form.section}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
            placeholder="Aisle A — Ambient"
            className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm"
            disabled={saving}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-[#616161] mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))
            }
            className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
            disabled={saving}
          >
            <option value="normal">Normal</option>
            <option value="critical">Critical</option>
            <option value="misplaced">Misplaced</option>
          </select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1677FF] text-white rounded-lg text-sm font-bold hover:bg-[#0958D9] disabled:opacity-50"
          >
            <Plus size={14} />
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAFA] border-b border-[#E0E0E0]">
            <tr>
              <th className="text-left p-3 font-bold text-[#616161]">Location</th>
              <th className="text-left p-3 font-bold text-[#616161]">Aisle</th>
              <th className="text-left p-3 font-bold text-[#616161]">Shelf #</th>
              <th className="text-left p-3 font-bold text-[#616161]">Section</th>
              <th className="text-left p-3 font-bold text-[#616161]">Status</th>
              <th className="text-right p-3 font-bold text-[#616161]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#9E9E9E]">
                  Loading shelves...
                </td>
              </tr>
            ) : shelves.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#9E9E9E]">
                  No shelves yet. Add locations above or import inventory with shelf columns.
                </td>
              </tr>
            ) : (
              shelves.map((row) => (
                <tr key={row.shelf_id} className="border-t border-[#F0F0F0] hover:bg-[#FAFAFA]">
                  <td className="p-3 font-mono font-bold text-[#212121]">{row.location_code}</td>
                  <td className="p-3">{row.aisle}</td>
                  <td className="p-3">{row.shelf_number}</td>
                  <td className="p-3 text-[#616161]">{row.section || '—'}</td>
                  <td className="p-3 capitalize">{row.status}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="p-2 rounded-lg hover:bg-[#F0F7FF] text-[#1677FF]"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={saving}
                        className="p-2 rounded-lg hover:bg-[#FEF2F2] text-[#EF4444] disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
