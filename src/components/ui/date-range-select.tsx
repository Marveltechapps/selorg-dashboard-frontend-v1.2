import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from './utils';

export type ReportDateRange = 'today' | '7d' | '30d' | 'custom';

export const REPORT_DATE_RANGE_OPTIONS: { value: ReportDateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export function getReportDateRangeLabel(value: ReportDateRange): string {
  return REPORT_DATE_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

interface DateRangeSelectProps {
  value: ReportDateRange;
  onValueChange: (value: ReportDateRange) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function DateRangeSelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: DateRangeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as ReportDateRange)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-9 w-[168px] bg-white border-[#E0E0E0] text-sm font-medium text-[#212121] shadow-sm',
          triggerClassName
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-[#757575]" aria-hidden />
          <SelectValue placeholder="Date range" />
        </span>
      </SelectTrigger>
      <SelectContent align="end" className={className}>
        {REPORT_DATE_RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
