import React from 'react';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ShiftContextBarProps {
  shiftName?: string;
  pickersActive?: number;
  pickersTotal?: number;
  expectedPeakTime?: string;
  loading?: boolean;
  className?: string;
}

function getShiftLabel(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Morning Shift';
  if (hour >= 14 && hour < 22) return 'Evening Shift';
  return 'Night Shift';
}

export function ShiftContextBar({
  shiftName,
  pickersActive = 0,
  pickersTotal = 0,
  expectedPeakTime,
  loading,
  className,
}: ShiftContextBarProps) {
  const shift = shiftName || getShiftLabel();

  if (loading) {
    return (
      <div className={cn('darkstore-card px-4 py-3 flex gap-6', className)}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'darkstore-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 text-slate-700">
        <Clock size={16} className="text-blue-600" />
        <span className="font-semibold">{shift}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-600">
        <Users size={16} className="text-violet-600" />
        <span>
          <span className="font-semibold text-slate-800">{pickersActive}</span>
          <span className="text-slate-400">/{pickersTotal}</span> pickers on floor
        </span>
      </div>
      {expectedPeakTime && (
        <div className="flex items-center gap-2 text-slate-600">
          <TrendingUp size={16} className="text-amber-600" />
          <span>Peak expected at <span className="font-semibold text-slate-800">{expectedPeakTime}</span></span>
        </div>
      )}
    </div>
  );
}
