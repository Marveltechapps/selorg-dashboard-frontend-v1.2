import React, { useState, useEffect } from 'react';
import { Calendar, Plus, UserPlus } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import {
  fetchPickerRoster,
  fetchPickerUsers,
  assignPickerToShift,
  RosterEntry,
  PickerOption,
} from './warehouseApi';

export function ShiftRoster() {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ shiftId: string; shiftName: string; date: string } | null>(null);
  const [pickers, setPickers] = useState<PickerOption[]>([]);
  const [selectedPicker, setSelectedPicker] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadRoster();
  }, [startDate, endDate]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await fetchPickerRoster(startDate, endDate);
      setRoster(data);
    } catch {
      toast.error('Failed to load roster');
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  const openAssign = (entry: RosterEntry) => {
    setAssignTarget({ shiftId: entry.shiftId, shiftName: entry.shiftName, date: entry.date });
    setSelectedPicker('');
    setShowAssignModal(true);
    fetchPickerUsers().then(setPickers).catch(() => setPickers([]));
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedPicker) {
      toast.error('Select a picker');
      return;
    }
    setAssigning(true);
    try {
      await assignPickerToShift(assignTarget.shiftId, selectedPicker, assignTarget.date);
      toast.success('Picker assigned');
      setShowAssignModal(false);
      setAssignTarget(null);
      loadRoster();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Roster"
        subtitle="View and assign pickers to shifts by date"
        actions={[]}
      />

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#64748B]" />
            <label className="text-sm font-medium text-[#1E293B]">Date range</label>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
          />
          <span className="text-[#64748B]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
          />
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingState />
          </div>
        ) : roster.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No roster data"
              message="Select a date range and ensure shifts exist in Shift Master."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Shift</th>
                  <th className="px-6 py-3">Site</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Assigned Pickers</th>
                  <th className="px-6 py-3">Empty Slots</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {roster.map((r) => (
                  <tr key={`${r.date}-${r.shiftId}`} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{r.date}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{r.shiftName}</td>
                    <td className="px-6 py-4 text-[#64748B]">{r.site || '—'}</td>
                    <td className="px-6 py-4 text-[#64748B]">{r.timeRange || '—'}</td>
                    <td className="px-6 py-4">
                      {r.assignedPickers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.assignedPickers.map((p) => (
                            <span
                              key={p.pickerId}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          r.emptySlots > 0 ? 'text-amber-600 font-medium' : 'text-green-600'
                        }
                      >
                        {r.emptySlots}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.emptySlots > 0 && (
                        <button
                          onClick={() => openAssign(r)}
                          className="text-[#0891b2] hover:underline text-xs font-bold flex items-center gap-1 justify-end w-full"
                        >
                          <UserPlus size={14} />
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssignModal && assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">
                Assign Picker — {assignTarget.shiftName} ({assignTarget.date})
              </h3>
              <button
                onClick={() => { setShowAssignModal(false); setAssignTarget(null); }}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Picker</label>
                <select
                  value={selectedPicker}
                  onChange={(e) => setSelectedPicker(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select picker</option>
                  {pickers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
                {pickers.length === 0 && (
                  <p className="text-xs text-[#64748B] mt-1">No active pickers. Approve pickers in Admin.</p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(false); setAssignTarget(null); }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedPicker || assigning}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
