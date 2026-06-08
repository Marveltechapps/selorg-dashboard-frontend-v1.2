import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, RefreshCw, Save, Edit, Trash2, Search, X, SlidersHorizontal } from 'lucide-react';
import {
  RiderShift,
  RiderShiftListSummary,
  RiderShiftHubOption,
  fetchRiderShifts,
  fetchRiderShiftFilterOptions,
  createRiderShift,
  updateRiderShift,
  deleteRiderShift,
  fetchShiftAssignments,
  assignRiderToShift,
  unassignRiderFromShift,
  type ShiftAssignment,
  type ShiftAssignmentsResponse,
  type RiderShiftStatusFilter,
  type RiderShiftPeakFilter,
  type RiderShiftAvailabilityFilter,
  type RiderShiftSortBy,
} from './riderShiftApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRiderPermissions } from '@/components/rider/useRiderPermissions';

interface Props {
  searchQuery: string;
}

type FormState = Partial<RiderShift>;

const defaultSummary: RiderShiftListSummary = {
  all: 0,
  draft: 0,
  published: 0,
  cancelled: 0,
  peak: 0,
};

export function RiderShiftManagement({ searchQuery }: Props) {
  const { can } = useRiderPermissions();
  const canManageShifts = can('shift.manage');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<RiderShift[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [summary, setSummary] = useState<RiderShiftListSummary>(defaultSummary);
  const [hubOptions, setHubOptions] = useState<RiderShiftHubOption[]>([]);

  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<RiderShiftStatusFilter>('all');
  const [hubFilter, setHubFilter] = useState<string>('all');
  const [peakFilter, setPeakFilter] = useState<RiderShiftPeakFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<RiderShiftAvailabilityFilter>('all');
  const [sortBy, setSortBy] = useState<RiderShiftSortBy>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [editing, setEditing] = useState<FormState | null>(null);
  const [bookingsShift, setBookingsShift] = useState<RiderShift | null>(null);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsData, setBookingsData] = useState<ShiftAssignmentsResponse | null>(null);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const combinedSearch = useMemo(() => {
    const parts = [searchQuery.trim(), debouncedSearch.trim()].filter(Boolean);
    return parts.join(' ').trim();
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(localSearch), 350);
    return () => window.clearTimeout(t);
  }, [localSearch]);

  useEffect(() => {
    void fetchRiderShiftFilterOptions()
      .then((opts) => setHubOptions(opts.hubs))
      .catch(() => setHubOptions([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const selectedHub = hubOptions.find((h) => h.hubId === hubFilter || h.hubName === hubFilter);
      const data = await fetchRiderShifts({
        ...(date ? { date } : {}),
        ...(dateFrom && !date ? { dateFrom } : {}),
        ...(dateTo && !date ? { dateTo } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(hubFilter !== 'all'
          ? {
              hubId: selectedHub?.hubId || undefined,
              hubName: selectedHub?.hubName || hubFilter,
            }
          : {}),
        ...(peakFilter !== 'all' ? { peakFilter } : {}),
        ...(availabilityFilter !== 'all' ? { availability: availabilityFilter } : {}),
        ...(combinedSearch ? { search: combinedSearch } : {}),
        sortBy,
        sortOrder,
        limit: 100,
      });
      setShifts(data.items);
      setListTotal(data.total);
      setSummary(data.summary ?? defaultSummary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load rider shifts');
    } finally {
      setLoading(false);
    }
  }, [
    date,
    dateFrom,
    dateTo,
    statusFilter,
    hubFilter,
    hubOptions,
    peakFilter,
    availabilityFilter,
    combinedSearch,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadBookings = useCallback(async (shift: RiderShift) => {
    setBookingsLoading(true);
    try {
      const data = await fetchShiftAssignments(shift.id);
      setBookingsData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load shift bookings');
      setBookingsData(null);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const handleAssignRider = async () => {
    if (!canManageShifts) {
      toast.error('You do not have permission to manage shift assignments');
      return;
    }
    if (!bookingsShift || !assignRiderId.trim()) {
      toast.error('Enter a rider ID to assign');
      return;
    }
    setAssignSaving(true);
    try {
      const data = await assignRiderToShift(bookingsShift.id, assignRiderId.trim());
      setBookingsData(data);
      setAssignRiderId('');
      toast.success('Rider assigned to shift');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign rider');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassignRider = async (assignment: ShiftAssignment) => {
    if (!canManageShifts) {
      toast.error('You do not have permission to manage shift assignments');
      return;
    }
    if (!bookingsShift) return;
    try {
      const data = await unassignRiderFromShift(bookingsShift.id, assignment.riderId);
      setBookingsData(data);
      toast.success(`Removed ${assignment.riderName} from shift`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to unassign rider');
    }
  };

  const hasActiveFilters =
    !!date ||
    !!dateFrom ||
    !!dateTo ||
    statusFilter !== 'all' ||
    hubFilter !== 'all' ||
    peakFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    !!localSearch ||
    sortBy !== 'date' ||
    sortOrder !== 'asc';

  const clearFilters = () => {
    setLocalSearch('');
    setDebouncedSearch('');
    setDate('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setHubFilter('all');
    setPeakFilter('all');
    setAvailabilityFilter('all');
    setSortBy('date');
    setSortOrder('asc');
  };

  const openCreate = () => {
    setEditing({
      status: 'published',
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

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search shift ID, hub, time, status…"
              className="pl-9"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Single date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">From</Label>
            <Input
              type="date"
              value={dateFrom}
              disabled={!!date}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">To</Label>
            <Input
              type="date"
              value={dateTo}
              disabled={!!date}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Hub</Label>
            <Select value={hubFilter} onValueChange={setHubFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All hubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hubs</SelectItem>
                {hubOptions.map((h) => (
                  <SelectItem key={`${h.hubId}-${h.hubName}`} value={h.hubId || h.hubName}>
                    {h.hubName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Peak</Label>
            <Select value={peakFilter} onValueChange={(v) => setPeakFilter(v as RiderShiftPeakFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="peak">Peak only</SelectItem>
                <SelectItem value="non-peak">Non-peak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Capacity</Label>
            <Select
              value={availabilityFilter}
              onValueChange={(v) => setAvailabilityFilter(v as RiderShiftAvailabilityFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="available">Has open slots</SelectItem>
                <SelectItem value="full">Fully booked</SelectItem>
                <SelectItem value="empty">No bookings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-[#6B7280] mb-1 block">Sort</Label>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as RiderShiftSortBy)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="startTime">Start time</SelectItem>
                  <SelectItem value="capacity">Capacity</SelectItem>
                  <SelectItem value="booked">Bookings</SelectItem>
                  <SelectItem value="hub">Hub</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-[#6B7280] flex items-center gap-1.5 pb-0.5">
            <SlidersHorizontal className="w-4 h-4" />
            Showing {shifts.length} of {listTotal} shifts
            {combinedSearch ? ` matching “${combinedSearch}”` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all' as const, label: 'All', count: summary.all },
              { key: 'draft' as const, label: 'Draft', count: summary.draft },
              { key: 'published' as const, label: 'Published', count: summary.published },
              { key: 'cancelled' as const, label: 'Cancelled', count: summary.cancelled },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-2 ' +
                (statusFilter === key
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]')
              }
            >
              {label}
              <span
                className={
                  'text-xs px-1.5 py-0.5 rounded-full ' +
                  (statusFilter === key ? 'bg-white/20' : 'bg-[#F3F4F6]')
                }
              >
                {count}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPeakFilter(peakFilter === 'peak' ? 'all' : 'peak');
            }}
            className={
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-2 ' +
              (peakFilter === 'peak'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]')
            }
          >
            Peak
            <span
              className={
                'text-xs px-1.5 py-0.5 rounded-full ' +
                (peakFilter === 'peak' ? 'bg-white/20' : 'bg-[#F3F4F6]')
              }
            >
              {summary.peak}
            </span>
          </button>
        </div>
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
                      setBookingsData(null);
                      void loadBookings(shift);
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
                <td colSpan={9} className="px-4 py-8 text-center text-[#6B7280]">
                  No shifts found for the selected filters.
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="block mx-auto mt-2 text-emerald-600 underline text-sm"
                      onClick={clearFilters}
                    >
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#111827]">
              {editing?.id ? 'Edit Rider Shift' : 'Create Rider Shift'}
            </DialogTitle>
            <DialogDescription>
              Define shift timing, capacity and incentives.
            </DialogDescription>
          </DialogHeader>

          {editing && (
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
          )}

          <DialogFooter className="gap-3 pt-2 sm:justify-end">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !editing}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bookingsOpen && !!bookingsShift}
        onOpenChange={(open) => {
          setBookingsOpen(open);
          if (!open) {
            setBookingsShift(null);
            setBookingsData(null);
            setAssignRiderId('');
          }
        }}
      >
        <DialogContent className="max-w-2xl gap-4 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bookings for {bookingsShift?.id}</DialogTitle>
            <DialogDescription>
              {bookingsShift?.hubName} · {bookingsShift?.date} · {bookingsShift?.startTime}–{bookingsShift?.endTime}
            </DialogDescription>
          </DialogHeader>
          {bookingsShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Booked</p>
                  <p className="font-bold">{bookingsData?.summary.total ?? bookingsShift.bookedCount}/{bookingsShift.capacity}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Available slots</p>
                  <p className="font-bold">{bookingsData?.summary.available ?? Math.max(0, bookingsShift.capacity - bookingsShift.bookedCount)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Started</p>
                  <p className="font-bold">{bookingsData?.summary.started ?? 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Completed</p>
                  <p className="font-bold">{bookingsData?.summary.completed ?? 0}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Rider ID (e.g. RIDER-1001)"
                  value={assignRiderId}
                  onChange={(e) => setAssignRiderId(e.target.value)}
                />
                <Button
                  onClick={() => void handleAssignRider()}
                  disabled={!canManageShifts || assignSaving || bookingsLoading}
                  title={canManageShifts ? undefined : 'You do not have permission to manage shift assignments'}
                >
                  Assign
                </Button>
              </div>

              {bookingsLoading ? (
                <p className="text-sm text-gray-500 py-4 text-center">Loading assignments…</p>
              ) : (bookingsData?.assignments.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-lg">
                  No riders booked for this shift yet.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Rider</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsData?.assignments.map((a) => (
                        <tr key={a.id} className="border-t">
                          <td className="px-3 py-2">
                            <p className="font-medium">{a.riderName}</p>
                            <p className="text-xs text-gray-500">{a.riderId}</p>
                          </td>
                          <td className="px-3 py-2 capitalize">{a.status.replace('_', ' ')}</td>
                          <td className="px-3 py-2 text-right">
                            {a.status === 'selected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-600"
                                disabled={!canManageShifts}
                                onClick={() => void handleUnassignRider(a)}
                              >
                                Remove
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBookingsOpen(false);
                setBookingsShift(null);
                setBookingsData(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

