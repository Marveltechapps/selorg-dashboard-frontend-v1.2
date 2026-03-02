import React from 'react';
import { CalendarClock, UserPlus, Users, Loader2 } from 'lucide-react';
import { ShiftSummary } from './shiftsApi';

interface Props {
  summary: ShiftSummary | null;
  loading: boolean;
  onFilter: (filter: 'all' | 'checked-in' | 'absent') => void;
  activeFilter: string;
}

export function ShiftSummaryCards({ summary, loading, onFilter, activeFilter }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
        ))}
      </div>
    );
  }

  const Card = ({ 
    title, 
    count, 
    icon: Icon, 
    color, 
    filterKey 
  }: { 
    title: string; 
    count: number; 
    icon: any; 
    color: string; 
    filterKey: string; 
  }) => {
    const isActive = activeFilter === filterKey;
    const colorStyles = {
      green: 'bg-green-100 text-green-700',
      blue: 'bg-blue-100 text-blue-700',
      red: 'bg-red-100 text-red-700',
    }[color] || 'bg-gray-100 text-gray-700';

    return (
      <div 
        onClick={() => onFilter(filterKey as any)}
        className={`bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
          isActive ? 'ring-2 ring-black border-transparent' : 'border-[#E0E0E0] hover:shadow-md'
        }`}
      >
        <div className={`p-3 rounded-lg ${colorStyles}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[#757575] text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-[#212121]">{count}</h3>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card 
        title="Checked In" 
        count={summary.checkedInCount} 
        icon={Users} 
        color="green" 
        filterKey="checked-in" 
      />
      <Card 
        title="Scheduled Today" 
        count={summary.scheduledTodayCount} 
        icon={CalendarClock} 
        color="blue" 
        filterKey="all" 
      />
      <Card 
        title="Absent / Late" 
        count={summary.absentOrLateCount} 
        icon={UserPlus} 
        color="red" 
        filterKey="absent" 
      />
    </div>
  );
}
