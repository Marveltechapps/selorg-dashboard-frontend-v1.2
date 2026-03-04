import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Pencil } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import {
  fetchPickerShifts,
  createPickerShift,
  updatePickerShift,
  PickerShift,
} from './warehouseApi';

export function ShiftMaster() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<PickerShift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<PickerShift | null>(null);
  const [form, setForm] = useState({
    name: '',
    site: '',
    startTime: '',
    endTime: '',
    capacity: '1',
    breakDuration: '0',
  });

  useEffect(() => {
    loadShifts();
  }, [filterSite, filterStatus]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const params: { site?: string; status?: string } = {};
      if (filterSite) params.site = filterSite;
      if (filterStatus) params.status = filterStatus;
      const data = await fetchPickerShifts(params);
      setShifts(data);
    } catch {
      toast.error('Failed to load shifts');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm({
      name: '',
      site: '',
      startTime: '',
      endTime: '',
      capacity: '1',
      breakDuration: '0',
    });
    setShowModal(true);
  };

  const openEdit = (s: PickerShift) => {
    setEditingShift(s);
    setForm({
      name: s.name,
      site: s.site ?? '',
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      capacity: String(s.capacity ?? 1),
      breakDuration: String(s.breakDuration ?? 0),
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        site: form.site || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        capacity: parseInt(form.capacity, 10) || 1,
        breakDuration: parseInt(form.breakDuration, 10) || 0,
      };
      if (editingShift) {
        await updatePickerShift(editingShift.id, payload);
        toast.success('Shift updated');
      } else {
        await createPickerShift(payload);
        toast.success('Shift created');
      }
      setShowModal(false);
      loadShifts();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save shift');
    }
  };

  const filteredShifts = shifts.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.site ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const c =
      status === 'ACTIVE'
        ? 'bg-[#D1FAE5] text-[#065F46]'
        : status === 'COMPLETED'
          ? 'bg-[#E0F2FE] text-[#0284C7]'
          : status === 'ABSENT'
            ? 'bg-[#FEE2E2] text-[#991B1B]'
            : 'bg-[#F1F5F9] text-[#64748B]';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Master"
        subtitle="Manage picker shift templates"
        actions={[
          <button
            key="create"
            onClick={openCreate}
            className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
          >
            <Plus size={16} />
            Create Shift
          </button>,
        ]}
      />

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by name or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
            />
          </div>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
          >
            <option value="">All sites</option>
            {[...new Set(shifts.map((s) => s.site).filter(Boolean))].map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
          >
            <option value="">All statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingState />
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="p-12">
            <EmptyState title="No shifts" message="Create a shift to see it here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Shift Name</th>
                  <th className="px-6 py-3">Site</th>
                  <th className="px-6 py-3">Time Range</th>
                  <th className="px-6 py-3">Capacity</th>
                  <th className="px-6 py-3">Break (min)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Assigned</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{s.name}</td>
                    <td className="px-6 py-4 text-[#64748B]">{s.site || '—'}</td>
                    <td className="px-6 py-4 text-[#64748B]">{s.timeRange || '—'}</td>
                    <td className="px-6 py-4 text-[#64748B]">{s.capacity ?? 1}</td>
                    <td className="px-6 py-4 text-[#64748B]">{s.breakDuration ?? 0}</td>
                    <td className="px-6 py-4">{statusBadge(s.status ?? 'SCHEDULED')}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{s.assignedCount ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-[#0891b2] hover:underline text-xs font-bold flex items-center gap-1 justify-end w-full"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">
                {editingShift ? 'Edit Shift' : 'Create Shift'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Shift"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Site</label>
                <input
                  type="text"
                  placeholder="e.g. Central Warehouse A"
                  value={form.site}
                  onChange={(e) => setForm({ ...form, site: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Break (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.breakDuration}
                    onChange={(e) => setForm({ ...form, breakDuration: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                {editingShift ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
