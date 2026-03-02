import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, CheckSquare, X } from 'lucide-react';

interface AlertsFilterBarProps {
  filters: {
    type: string;
    severity: string;
    status: string;
    search: string;
  };
  setFilters: (filters: any) => void;
  onBulkAction: (action: string) => void;
  selectedCount: number;
}

export function AlertsFilterBar({ filters, setFilters, onBulkAction, selectedCount }: AlertsFilterBarProps) {
  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-4 border border-gray-200 rounded-lg shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filters.type} onValueChange={(val) => handleChange('type', val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold uppercase tracking-wider">
                <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Pricing">Pricing</SelectItem>
                <SelectItem value="Stock">Stock</SelectItem>
                <SelectItem value="Campaign">Campaign</SelectItem>
                <SelectItem value="System">System</SelectItem>
            </SelectContent>
        </Select>

        <Select value={filters.severity} onValueChange={(val) => handleChange('severity', val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold uppercase tracking-wider">
                <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
            </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(val) => handleChange('status', val)}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase tracking-wider">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="active">Active Alerts</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Snoozed">Snoozed</SelectItem>
                <SelectItem value="Dismissed">Dismissed</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
            </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" className="ml-auto h-9 w-9">
            <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {selectedCount > 0 && (
          <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 text-blue-800 rounded border border-blue-100 animate-in fade-in slide-in-from-top-1">
              <CheckSquare className="h-4 w-4" />
              <span className="text-sm font-semibold">{selectedCount} selected</span>
              <div className="h-4 w-px bg-blue-200 mx-2" />
              <Button size="sm" variant="ghost" className="h-7 text-blue-800 hover:bg-blue-100 hover:text-blue-900" onClick={() => onBulkAction('resolve')}>
                  Mark Resolved
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-blue-800 hover:bg-blue-100 hover:text-blue-900" onClick={() => onBulkAction('snooze')}>
                  Snooze
              </Button>
               <Button size="sm" variant="ghost" className="h-7 text-blue-800 hover:bg-blue-100 hover:text-blue-900 ml-auto" onClick={() => onBulkAction('clear')}>
                  <X className="h-4 w-4" />
              </Button>
          </div>
      )}
    </div>
  );
}
