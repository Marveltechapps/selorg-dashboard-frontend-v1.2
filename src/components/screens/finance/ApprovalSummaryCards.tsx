import React from 'react';
import { RotateCcw, CheckSquare, CheckCircle2 } from 'lucide-react';
import { ApprovalSummary, TaskType } from './approvalsApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  summary: ApprovalSummary | null;
  isLoading: boolean;
  onFilter: (type: TaskType | 'all') => void;
  activeFilter: TaskType | 'all';
}

export function ApprovalSummaryCards({ summary, isLoading, onFilter, activeFilter }: Props) {
  if (isLoading || !summary) {
      return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
      );
  }

  const cards = [
    {
      label: 'Refund Requests',
      count: summary.refundRequestsCount,
      icon: <RotateCcw size={32} className="text-[#F97316]" />,
      bg: 'bg-orange-50',
      type: 'refund' as TaskType,
      borderColor: 'border-orange-500'
    },
    {
      label: 'Invoice Approvals',
      count: summary.invoiceApprovalsCount,
      icon: <CheckSquare size={32} className="text-blue-600" />,
      bg: 'bg-blue-50',
      type: 'invoice' as TaskType,
      borderColor: 'border-blue-500'
    },
    {
      label: 'Approved Today',
      count: summary.approvedTodayCount,
      icon: <CheckCircle2 size={32} className="text-green-600" />,
      bg: 'bg-green-50',
      type: 'all' as const,
      borderColor: 'border-green-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
            const isActive = activeFilter === card.type;
            const isClickable = card.label !== 'Approved Today'; // Special handling for approved today if needed

            return (
                <div 
                    key={card.label}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFilter(card.type);
                    }}
                    className={`
                        bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all
                        ${isActive ? `ring-2 ${card.borderColor} bg-gray-50` : 'border-[#E0E0E0] hover:shadow-md hover:border-gray-300'}
                    `}
                >
                    <div className={`w-16 h-16 rounded-full ${card.bg} flex items-center justify-center mb-4`}>
                        {card.icon}
                    </div>
                    <h3 className="text-3xl font-bold text-[#212121]">{card.count}</h3>
                    <p className="text-[#757575] text-sm mt-1">{card.label}</p>
                    
                    {isActive && (
                        <div className="mt-4 px-3 py-1 bg-gray-900 text-white text-xs rounded-full">
                            Active Filter
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
}
