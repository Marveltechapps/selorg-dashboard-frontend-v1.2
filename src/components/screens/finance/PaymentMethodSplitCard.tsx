import React from 'react';
import { PaymentMethodSplitItem } from './financeApi';
import { CreditCard, Wallet, Banknote, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  data: PaymentMethodSplitItem[];
  loading: boolean;
  onMethodClick?: (method: string) => void;
}

export function PaymentMethodSplitCard({ data, loading, onMethodClick }: Props) {
  if (loading) {
    return <div className="bg-white border border-[#E0E0E0] rounded-xl h-[300px] animate-pulse"></div>;
  }

  const getIcon = (method: string) => {
    switch (method) {
      case 'cards': return <CreditCard size={14} />;
      case 'digital_wallets': return <Wallet size={14} />;
      case 'cod': return <Banknote size={14} />;
      default: return <HelpCircle size={14} />;
    }
  };

  const getColor = (method: string) => {
    switch (method) {
      case 'cards': return 'bg-[#14B8A6]'; // Teal
      case 'digital_wallets': return 'bg-[#3B82F6]'; // Blue
      case 'cod': return 'bg-[#F59E0B]'; // Orange
      default: return 'bg-gray-400';
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-6 h-full">
      <h3 className="font-bold text-[#212121] mb-6">Payment Method Split</h3>
      <div className="space-y-6">
        {data.map((item) => (
          <TooltipProvider key={item.method}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="cursor-pointer group" 
                  onClick={() => onMethodClick?.(item.method)}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2 text-gray-700 font-medium group-hover:text-black">
                      {getIcon(item.method)} 
                      {item.label}
                    </span>
                    <span className="font-bold text-[#212121]">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getColor(item.method)} transition-all duration-500`} 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="text-xs">
                  <p className="font-bold">{formatCurrency(item.amount)}</p>
                  <p className="text-gray-400">{item.txnCount.toLocaleString()} transactions</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
