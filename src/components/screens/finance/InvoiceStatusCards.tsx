import React from 'react';
import { Send, Clock, Download, AlertTriangle } from 'lucide-react';
import { InvoiceSummary, InvoiceStatus } from './invoicingApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  summary: InvoiceSummary | null;
  isLoading: boolean;
  activeStatus: InvoiceStatus | null;
  onStatusSelect: (status: InvoiceStatus) => void;
}

export function InvoiceStatusCards({ summary, isLoading, activeStatus, onStatusSelect }: Props) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const getCardClass = (status: InvoiceStatus, baseColor: string) => {
      const isActive = activeStatus === status;
      return `bg-white p-5 rounded-xl border shadow-sm cursor-pointer transition-all duration-200
              ${isActive ? `border-${baseColor}-500 ring-1 ring-${baseColor}-500 bg-${baseColor}-50/30` : 'border-[#E0E0E0] hover:border-gray-300'}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sent */}
        <div 
            className={`${getCardClass('sent', 'blue')} ${activeStatus === 'sent' ? '!border-blue-500 !bg-blue-50/50' : ''}`}
            onClick={() => onStatusSelect('sent')}
        >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Send size={18} className="text-[#3B82F6]" /> Sent
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">{summary.sentCount}</span>
                 <span className="text-xs text-[#757575] mb-1">this month</span>
             </div>
        </div>

        {/* Pending */}
        <div 
             className={`${getCardClass('pending', 'yellow')} ${activeStatus === 'pending' ? '!border-yellow-500 !bg-yellow-50/50' : ''}`}
             onClick={() => onStatusSelect('pending')}
        >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Clock size={18} className="text-[#F59E0B]" /> Pending
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">{summary.pendingCount}</span>
                 <span className="text-xs text-[#757575] mb-1">awaiting payment</span>
             </div>
        </div>

        {/* Overdue */}
        <div 
             className={`${getCardClass('overdue', 'red')} ${activeStatus === 'overdue' ? '!border-red-500 !bg-red-50/50' : ''}`}
             onClick={() => onStatusSelect('overdue')}
        >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-[#EF4444]" /> Overdue
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#EF4444]">{summary.overdueCount}</span>
                 <span className="text-xs text-[#757575] mb-1">needs attention</span>
             </div>
        </div>

        {/* Paid */}
        <div 
             className={`${getCardClass('paid', 'green')} ${activeStatus === 'paid' ? '!border-green-500 !bg-green-50/50' : ''}`}
             onClick={() => onStatusSelect('paid')}
        >
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Download size={18} className="text-[#10B981]" /> Paid
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">{summary.paidCount}</span>
                 <span className="text-xs text-[#757575] mb-1">settled</span>
             </div>
        </div>
    </div>
  );
}
