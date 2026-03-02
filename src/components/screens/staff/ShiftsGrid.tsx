import React from 'react';
import { Shift } from './shiftsApi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { User, Zap, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ShiftsGridProps {
  shifts: Shift[];
  loading: boolean;
  onShiftClick: (shift: Shift) => void;
}

const TIME_SLOTS = [
  { label: '08:00 - 12:00', start: 8, end: 12 },
  { label: '12:00 - 16:00', start: 12, end: 16 },
  { label: '16:00 - 20:00', start: 16, end: 20 },
  { label: '20:00 - 00:00', start: 20, end: 24 },
];

export function ShiftsGrid({ shifts, loading, onShiftClick }: ShiftsGridProps) {
  // Group shifts by Rider
  const shiftsByRider = React.useMemo(() => {
    const map = new Map<string, { name: string; shifts: Shift[] }>();
    shifts.forEach(shift => {
      if (!map.has(shift.riderId)) {
        map.set(shift.riderId, { name: shift.riderName, shifts: [] });
      }
      map.get(shift.riderId)!.shifts.push(shift);
    });
    return Array.from(map.values());
  }, [shifts]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-gray-400">Loading shifts...</div>;
  }

  if (shifts.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 border rounded-lg bg-gray-50">
        <Clock size={48} className="mb-4 opacity-20" />
        <p>No shifts scheduled for this date.</p>
        <p className="text-sm">Use "Create Shift" to add the first one.</p>
      </div>
    );
  }

  const getShiftForSlot = (riderShifts: Shift[], slotStart: number, slotEnd: number) => {
    return riderShifts.find(s => {
      const start = parseInt(s.startTime.split(':')[0]);
      // Simple overlap check
      return start >= slotStart && start < slotEnd;
    });
  };

  const getStatusColor = (status: Shift['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      case 'late': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const getOverallStatus = (riderShifts: Shift[]) => {
    if (riderShifts.some(s => s.status === 'active')) return { text: 'On Shift', color: 'text-green-600' };
    if (riderShifts.some(s => s.status === 'absent')) return { text: 'No Show', color: 'text-red-600' };
    if (riderShifts.some(s => s.status === 'late')) return { text: 'Late', color: 'text-orange-600' };
    if (riderShifts.every(s => s.status === 'completed')) return { text: 'Completed', color: 'text-gray-500' };
    return { text: 'Upcoming', color: 'text-blue-600' };
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-12 gap-px bg-[#E0E0E0] border-b border-[#E0E0E0]">
        <div className="col-span-3 bg-[#F5F7FA] p-3 text-sm font-medium text-[#757575]">Rider</div>
        {TIME_SLOTS.map((slot, i) => (
          <div key={i} className="col-span-2 bg-[#F5F7FA] p-3 text-sm font-medium text-[#757575] text-center">
            {slot.label}
          </div>
        ))}
        <div className="col-span-1 bg-[#F5F7FA] p-3 text-sm font-medium text-[#757575] text-right">Status</div>
      </div>

      <div className="divide-y divide-[#E0E0E0]">
        {shiftsByRider.map((rider) => {
          const status = getOverallStatus(rider.shifts);
          return (
            <div key={rider.name} className="grid grid-cols-12 gap-px bg-white items-stretch min-h-[60px]">
              <div className="col-span-3 p-3 flex items-center gap-3 font-medium text-[#212121]">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <User size={16} />
                </div>
                {rider.name}
              </div>
              
              {TIME_SLOTS.map((slot, i) => {
                const shift = getShiftForSlot(rider.shifts, slot.start, slot.end);
                return (
                  <div key={i} className="col-span-2 p-2 flex items-center justify-center border-l border-transparent">
                    {shift ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onShiftClick(shift)}
                              className={cn(
                                "w-full py-1.5 px-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1",
                                getStatusColor(shift.status)
                              )}
                            >
                              {shift.isPeakHour && <Zap size={10} className="fill-current" />}
                              {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                              {shift.overtimeMinutes ? <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current" /> : null}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{shift.startTime} - {shift.endTime}</p>
                            <p className="text-xs text-gray-500">{shift.hub}</p>
                            {shift.isPeakHour && <p className="text-xs text-orange-500 font-bold mt-1">Peak Hour</p>}
                            {shift.overtimeMinutes ? <p className="text-xs text-purple-500 mt-1">Overtime: {shift.overtimeMinutes}m</p> : null}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-200 text-xs">-</span>
                    )}
                  </div>
                );
              })}

              <div className={cn("col-span-1 p-3 flex items-center justify-end text-sm font-bold", status.color)}>
                {status.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
