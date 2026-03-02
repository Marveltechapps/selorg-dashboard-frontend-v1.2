import React from 'react';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { LedgerSummary } from './accountingApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  summary: LedgerSummary | null;
  isLoading: boolean;
  onFilter: (type: 'all' | 'receivables' | 'payables') => void;
}

export function LedgerSummaryCards({ summary, isLoading, onFilter }: Props) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div 
         className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#14B8A6] transition-colors"
         onClick={() => onFilter('all')}
       >
         <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
             <BookOpen size={18} className="text-[#14B8A6]" /> General Ledger
         </h3>
         <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-[#212121]">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: "compact" }).format(summary.generalLedgerBalance)}
             </span>
             <span className="text-xs text-[#757575] mb-1">Current Balance</span>
         </div>
      </div>

       <div 
         className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#10B981] transition-colors"
         onClick={() => onFilter('receivables')}
       >
         <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
             <TrendingUp size={18} className="text-[#10B981]" /> Receivables
         </h3>
         <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-[#212121]">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: "compact" }).format(summary.receivablesBalance)}
             </span>
             <span className="text-xs text-[#757575] mb-1">Outstanding</span>
         </div>
      </div>

       <div 
         className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#EF4444] transition-colors"
         onClick={() => onFilter('payables')}
       >
         <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
             <TrendingDown size={18} className="text-[#EF4444]" /> Payables
         </h3>
         <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-[#212121]">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: "compact" }).format(summary.payablesBalance)}
             </span>
             <span className="text-xs text-[#757575] mb-1">Due</span>
         </div>
      </div>
    </div>
  );
}
