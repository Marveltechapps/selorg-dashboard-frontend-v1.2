import React from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RefundsSummary } from './refundsApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  summary: RefundsSummary | null;
  isLoading: boolean;
  onFilterClick: (type: 'pending' | 'chargebacks' | 'processed') => void;
}

export function RefundsSummaryCards({ summary, isLoading, onFilterClick }: Props) {
  if (isLoading || !summary) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
                     <Skeleton className="h-12 w-12 rounded-lg" />
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                     </div>
                </div>
            ))}
        </div>
    );
  }

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => onFilterClick('pending')}
            className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4 cursor-pointer hover:border-red-300 transition-colors"
          >
              <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                  <RotateCcw size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">Refund Requests</p>
                  <h3 className="text-2xl font-bold text-[#212121]">{summary.refundRequestsCount}</h3>
                  <p className="text-xs text-red-600 font-medium">Open requests</p>
              </div>
          </div>
          
           <div 
             onClick={() => onFilterClick('chargebacks')}
             className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4 cursor-pointer hover:border-orange-300 transition-colors"
           >
              <div className="p-3 bg-orange-100 text-orange-700 rounded-lg">
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">Active Chargebacks</p>
                  <h3 className="text-2xl font-bold text-[#212121]">{summary.activeChargebacksCount}</h3>
                  <p className="text-xs text-orange-600 font-medium">Action required</p>
              </div>
          </div>
          
           <div 
              onClick={() => onFilterClick('processed')}
              className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4 cursor-pointer hover:border-green-300 transition-colors"
           >
              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <CheckCircle2 size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">Processed Today</p>
                  <h3 className="text-2xl font-bold text-[#212121]">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.processedTodayAmount)}
                  </h3>
              </div>
          </div>
      </div>
  );
}
