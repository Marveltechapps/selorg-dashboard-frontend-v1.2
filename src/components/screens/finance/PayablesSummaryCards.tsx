import React from 'react';
import { Wallet, FileText } from 'lucide-react';
import { VendorPayablesSummary } from './payablesApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  summary: VendorPayablesSummary | null;
  isLoading: boolean;
  onFilterClick: (filter: string) => void;
}

export function PayablesSummaryCards({ summary, isLoading, onFilterClick }: Props) {
  if (isLoading || !summary) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-10 w-24" />
                </div>
            ))}
        </div>
    );
  }

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => onFilterClick('outstanding')}
            className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#14B8A6] transition-colors"
          >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Wallet size={18} className="text-[#14B8A6]" /> Outstanding Payables
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.outstandingPayablesAmount)}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">{summary.outstandingHorizonText}</span>
             </div>
          </div>
          
          <div 
             onClick={() => onFilterClick('pending_approval')}
             className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#F59E0B] transition-colors"
          >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <FileText size={18} className="text-[#F59E0B]" /> Pending Approval
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">{summary.pendingApprovalCount}</span>
                 <span className="text-xs text-[#757575] mb-1">invoices</span>
             </div>
          </div>
          
          <div 
             onClick={() => onFilterClick('overdue')}
             className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#EF4444] transition-colors"
          >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Wallet size={18} className="text-[#EF4444]" /> Overdue
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#EF4444]">
                     {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.overdueAmount)}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">{summary.overdueVendorsCount} vendors</span>
             </div>
          </div>
      </div>
  );
}
