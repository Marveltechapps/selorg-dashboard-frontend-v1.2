import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Plus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShiftSummaryCards } from './ShiftSummaryCards';
import { ShiftsGrid } from './ShiftsGrid';
import { CreateShiftModal } from './CreateShiftModal';
import { ShiftDetailsDrawer } from './ShiftDetailsDrawer';
import {
  fetchShifts,
  fetchShiftSummary,
  Shift,
  ShiftSummary,
  StaffShiftListFilter,
} from './shiftsApi';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StaffShiftsPageProps {
  searchQuery?: string;
}

export function StaffShiftsPage({ searchQuery = '' }: StaffShiftsPageProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState<StaffShiftListFilter>('checked-in');
  
  // Data State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsData, summaryData] = await Promise.all([
        fetchShifts(selectedDate, activeFilter),
        fetchShiftSummary(selectedDate),
      ]);
      setShifts(shiftsData);
      setSummary(summaryData);
    } catch (error) {
      toast.error('Failed to load shift data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Status filter is applied server-side; search is client-side on the loaded slice
  const filteredShifts = React.useMemo(() => {
    if (!searchQuery.trim()) return shifts;
    const query = searchQuery.toLowerCase();
    return shifts.filter(
      (s) =>
        s.id.toLowerCase().includes(query) ||
        s.riderId.toLowerCase().includes(query) ||
        s.riderName.toLowerCase().includes(query) ||
        (s.hub && s.hub.toLowerCase().includes(query))
    );
  }, [shifts, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Staff & Shift Management</h1>
          <p className="text-[#757575] text-sm">Shift planning, attendance tracking, and peak hour deployment</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)} 
             className="w-auto"
          />
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button 
            className="bg-[#F97316] hover:bg-[#EA580C] text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <ShiftSummaryCards 
        summary={summary} 
        loading={loading} 
        onFilter={setActiveFilter} 
        activeFilter={activeFilter}
      />

      {/* Main Content */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
            <h3 className="font-bold text-[#212121]">Today's Shifts</h3>
            <span className="text-xs text-[#757575]">
              {format(new Date(selectedDate), 'EEEE, MMM do yyyy')}
            </span>
        </div>
        
        <ShiftsGrid
          shifts={filteredShifts}
          loading={loading}
          onShiftClick={setSelectedShift}
          listFilter={activeFilter}
        />
      </div>

      {/* Modals & Drawers */}
      <CreateShiftModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData}
        selectedDate={selectedDate}
      />

      <ShiftDetailsDrawer 
        shift={selectedShift} 
        onClose={() => setSelectedShift(null)} 
        onUpdate={loadData} 
      />
    </div>
  );
}
