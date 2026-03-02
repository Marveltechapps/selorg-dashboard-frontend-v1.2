import React from 'react';
import { FinanceSummary } from './financeApi';
import { ArrowUpRight, ArrowDownLeft, IndianRupee, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  data: FinanceSummary | null;
  loading: boolean;
}

export function FinanceSummaryCards({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white h-32 rounded-xl border border-gray-100 shadow-sm animate-pulse" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Received */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">Total Received (Today)</span>
                <div className="text-teal-500 p-1.5 bg-teal-50 rounded-lg">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.totalReceivedToday)}</span>
              </div>
              <div className="text-xs font-medium mt-2 flex items-center gap-1 text-green-600">
                <TrendingUp size={12} />
                <span>+{data.totalReceivedChangePercent}% vs yesterday</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Yesterday: {formatCurrency(data.totalReceivedToday / (1 + data.totalReceivedChangePercent / 100))}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Pending Settlements */}
      <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">Pending Settlements</span>
          <div className="text-blue-500 p-1.5 bg-blue-50 rounded-lg">
            <IndianRupee size={18} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.pendingSettlementsAmount)}</span>
          <span className="text-sm text-[#757575] mb-1">{data.pendingSettlementsGateways} Gateways</span>
        </div>
        <div className="text-xs font-medium mt-2 flex items-center gap-1 text-blue-600">
          <span>Processing</span>
        </div>
      </div>

      {/* Vendor Payouts */}
      <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">Vendor Payouts</span>
          <div className="text-orange-500 p-1.5 bg-orange-50 rounded-lg">
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.vendorPayoutsAmount)}</span>
        </div>
        <div className="text-xs font-medium mt-2 flex items-center gap-1 text-orange-600">
          <span>{data.vendorPayoutsStatusText}</span>
        </div>
      </div>

      {/* Failed Payments */}
      <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">Failed Payments</span>
          <div className="text-red-500 p-1.5 bg-red-50 rounded-lg">
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-[#212121]">{data.failedPaymentsRatePercent}%</span>
          <span className="text-sm text-[#757575] mb-1">{data.failedPaymentsCount} txns</span>
        </div>
        <div className={cn("text-xs font-medium mt-2 flex items-center gap-1", 
          data.failedPaymentsRatePercent > data.failedPaymentsThresholdPercent ? "text-red-600" : "text-green-600"
        )}>
          {data.failedPaymentsRatePercent > data.failedPaymentsThresholdPercent ? (
            <>
              <TrendingDown size={12} />
              <span>Above Threshold</span>
            </>
          ) : (
             <span>Within Limits</span>
          )}
        </div>
      </div>
    </div>
  );
}
