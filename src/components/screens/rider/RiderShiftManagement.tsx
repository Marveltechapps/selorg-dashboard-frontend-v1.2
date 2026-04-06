import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, RefreshCw, Save, X, Edit, Trash2 } from 'lucide-react';
import { RiderShift, fetchRiderShifts, createRiderShift, updateRiderShift, deleteRiderShift } from './riderShiftApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  searchQuery: string;
}

type FormState = Partial<RiderShift>;

type StatusFilter = 'all' | 'draft' | 'published' | 'cancelled';

export function RiderShiftManagement({ searchQuery }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<RiderShift[]>([]);
  const [date, setDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [bookingsShift, setBookingsShift] = useState<RiderShift | null>(null);
  const [bookingsOpen, setBookingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRiderShifts({
        date,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      let items = data.items;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            (s.hubName ?? '').toLowerCase().includes(q)
        );
      }
      setShifts(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load rider shifts');
    } finally {
      setLoading(false);
    }
  }, [date, searchQuery, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing({
      status: 'draft',
      capacity: 1,
      basePay: 0,
      bonus: 0,
      currency: 'INR',
      isPeak: false,
      breakMinutes: 0,
      walkInBufferMinutes: 15,
    } as FormState);
  };

  const openEdit = (shift: RiderShift) => {
    setEditing(shift);
  };

  const resetForm = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.date || !editing.startTime || !editing.endTime || !editing.capacity) {
      toast.error('Date, start time, end time, and capacity are required');
      return;
    }

    setSaving(true);
    try {
      if (editing.id) {
        const updated = await updateRiderShift(editing.id, editing);
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Shift updated');
      } else {
        const created = await createRiderShift(editing);
        setShifts((prev) => [created, ...prev]);
        toast.success('Shift created');
      }
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shift: RiderShift) => {
    if (!window.confirm(`Cancel shift ${shift.id}?`)) return;
    try {
      await deleteRiderShift(shift.id);
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      toast.success('Shift cancelled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel shift');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Rider Shift Management</h1>
            <p className="text-sm text-[#6B7280]">
              Configure rider shifts, capacities, and peak-time incentives.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'draft' as const, label: 'Draft' },
            { key: 'published' as const, label: 'Published' },
            { key: 'cancelled' as const, label: 'Cancelled' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors ' +
              (statusFilter === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Shift ID</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Time</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Hub</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Capacity</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Break</th>
              <th className="px-4 py-3 text-left font-semibold text-[#6B7280]">Pay</th>
              <th className="px-4 py-3 text-right font-semibold text-[#6B7280]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                <td className="px-4 py-3 font-medium text-[#111827]">{shift.id}</td>
                <td className="px-4 py-3 text-[#374151]">
                  {new Date(shift.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  {shift.startTime} – {shift.endTime}
                  {shift.isPeak && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      PEAK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  {shift.hubName ?? '—'}
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  <button
                    className="underline text-left"
                    onClick={() => {
                      setBookingsShift(shift);
                      setBookingsOpen(true);
                    }}
                  >
                    {shift.bookedCount}/{shift.capacity}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ' +
                      (shift.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : shift.status === 'draft'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-rose-100 text-rose-700')
                    }
                  >
                    {shift.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  {shift.breakMinutes ?? 0}m
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  ₹{shift.basePay ?? 0}
                  {shift.bonus ? ` + ₹${shift.bonus}` : ''}
                </td>
                <td className="px-4 py-3 flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openEdit(shift)}
                    title="Edit Shift"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => void handleDelete(shift)}
                    title="Cancel Shift"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && shifts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">
                  No shifts found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">
                  {editing.id ? 'Edit Rider Shift' : 'Create Rider Shift'}
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Define shift timing, capacity and incentives.
                </p>
              </div>
              <button
                onClick={resetForm}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={editing.date ? editing.date.slice(0, 10) : ''}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...(prev || {}), date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hubName">Hub</Label>
                <Input
                  id="hubName"
                  value={editing.hubName ?? ''}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...(prev || {}), hubName: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="Chennai Hub"
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time (HH:MM)</Label>
                <Input
                  id="startTime"
                  value={editing.startTime ?? ''}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...(prev || {}), startTime: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="04:00"
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time (HH:MM)</Label>
                <Input
                  id="endTime"
                  value={editing.endTime ?? ''}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...(prev || {}), endTime: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="06:00"
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={editing.capacity ?? 1}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      capacity: Number(e.target.value) || 1,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={editing.status ?? 'draft'}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...(prev || {}), status: e.target.value as any }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <Label htmlFor="basePay">Base Pay (₹)</Label>
                <Input
                  id="basePay"
                  type="number"
                  min={0}
                  value={editing.basePay ?? 0}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      basePay: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bonus">Bonus (₹)</Label>
                <Input
                  id="bonus"
                  type="number"
                  min={0}
                  value={editing.bonus ?? 0}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      bonus: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="isPeak">Peak Time</Label>
                <select
                  id="isPeak"
                  value={editing.isPeak ? 'yes' : 'no'}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      isPeak: e.target.value === 'yes',
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <Label htmlFor="breakMinutes">Break Time (mins)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min={0}
                  value={editing.breakMinutes ?? 0}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      breakMinutes: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="walkInBufferMinutes">Walk-in Buffer (mins)</Label>
                <Input
                  id="walkInBufferMinutes"
                  type="number"
                  min={0}
                  value={editing.walkInBufferMinutes ?? 15}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...(prev || {}),
                      walkInBufferMinutes: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Shift
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {bookingsOpen && bookingsShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bookings for {bookingsShift.id}</h3>
              <button
                onClick={() => {
                  setBookingsOpen(false);
                  setBookingsShift(null);
                }}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                Booked slots: <strong>{bookingsShift.bookedCount}</strong>
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Rider details and assignment list will be shown here. (This view is a placeholder
                — hook up /rider/shift-assignments endpoint to load actual riders.)
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => { setBookingsOpen(false); setBookingsShift(null); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

