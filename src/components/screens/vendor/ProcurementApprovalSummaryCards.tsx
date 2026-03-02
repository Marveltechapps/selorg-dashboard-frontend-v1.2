import React from 'react';
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { ProcurementApprovalSummary } from './procurementApprovalsApi';

interface Props {
  summary: ProcurementApprovalSummary | null;
  isLoading: boolean;
  onFilter: (status: 'pending' | 'approved' | 'rejected') => void;
  activeFilter: 'pending' | 'approved' | 'rejected';
}

export function ProcurementApprovalSummaryCards({ summary, isLoading, onFilter, activeFilter }: Props) {
  // Use default values if summary is not loaded yet
  const displaySummary = summary || {
    pendingRequestsCount: 0,
    approvedTodayCount: 0,
    rejectedTodayCount: 0
  };

  const cards = [
    {
      label: 'Pending Requests',
      count: displaySummary.pendingRequestsCount,
      icon: <ClipboardList size={32} className="text-[#4F46E5]" />,
      bg: 'bg-indigo-50',
      status: 'pending' as const,
      borderColor: 'border-indigo-500',
      textColor: 'text-[#4F46E5]'
    },
    {
      label: 'Approved Today',
      count: displaySummary.approvedTodayCount,
      icon: <CheckCircle2 size={32} className="text-[#10B981]" />,
      bg: 'bg-emerald-50',
      status: 'approved' as const,
      borderColor: 'border-emerald-500',
      textColor: 'text-[#10B981]'
    },
    {
      label: 'Rejected Today',
      count: displaySummary.rejectedTodayCount,
      icon: <XCircle size={32} className="text-[#EF4444]" />,
      bg: 'bg-red-50',
      status: 'rejected' as const,
      borderColor: 'border-red-500',
      textColor: 'text-[#EF4444]'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
            const isActive = activeFilter === card.status;
            
            return (
                <div 
                    key={card.label}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only call onFilter if not already active to prevent unnecessary reloads
                        if (!isActive) {
                            onFilter(card.status);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isActive) {
                                onFilter(card.status);
                            }
                        }
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
                        <div className={`mt-4 px-3 py-1 ${card.bg} ${card.textColor} text-xs font-bold rounded-full`}>
                            Viewing {card.label}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
}
