import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Button } from "../../ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Granularity } from './financeAnalyticsApi';

interface Props {
  dateRange: string;
  setDateRange: (val: string) => void;
  granularity: Granularity;
  setGranularity: (val: Granularity) => void;
}

export function AnalyticsToolbar({ dateRange, setDateRange, granularity, setGranularity }: Props) {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg border border-[#E0E0E0] mb-6">
        <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Range:</span>
            <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px] h-9 bg-white">
                    <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                    <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                    <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View By:</span>
             <div className="flex bg-white rounded-md border p-1">
                 <button 
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${granularity === 'month' ? 'bg-[#212121] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setGranularity('month')}
                 >
                     Month
                 </button>
                 <button 
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${granularity === 'quarter' ? 'bg-[#212121] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setGranularity('quarter')}
                 >
                     Quarter
                 </button>
             </div>
        </div>
    </div>
  );
}
