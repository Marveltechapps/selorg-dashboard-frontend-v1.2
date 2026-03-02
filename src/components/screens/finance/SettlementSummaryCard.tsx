import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { SettlementSummaryItem } from './reconciliationApi';
import { Progress } from "../../ui/progress";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { ScrollArea } from "../../ui/scroll-area";

interface Props {
  items: SettlementSummaryItem[];
  isLoading: boolean;
  onSelectGateway: (item: SettlementSummaryItem) => void;
}

export function SettlementSummaryCard({ items, isLoading, onSelectGateway }: Props) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-[#E0E0E0] bg-[#FAFAFA] flex-shrink-0">
        <h3 className="font-bold text-[#212121] flex items-center gap-2">
           Daily Settlement Summary
        </h3>
        <p className="text-xs text-[#757575] mt-1">Reconciliation status by payment gateway</p>
      </div>
      
      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
             <div className="p-5 space-y-6">
                 {[1, 2, 3].map(i => (
                     <div key={i} className="space-y-2">
                         <Skeleton className="h-5 w-1/3" />
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-2 w-full" />
                     </div>
                 ))}
             </div>
        ) : (
            <div className="divide-y divide-[#F0F0F0]">
                {items.map((item) => (
                    <div 
                        key={item.id} 
                        className="p-5 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                        onClick={() => onSelectGateway(item)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                {/* Placeholder Icons based on gateway name */}
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                                    item.gateway === 'Stripe' ? 'bg-[#635BFF]' : 
                                    item.gateway === 'PayPal' ? 'bg-[#003087]' : 
                                    item.gateway === 'Adyen' ? 'bg-[#0ABF53]' : 'bg-gray-500'
                                }`}>
                                    {item.gateway.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-[#212121]">{item.gateway}</h4>
                                    <span className="text-xs text-[#757575]">
                                        Last run: {new Date(item.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                            
                            {item.status === 'matched' && (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0 shadow-none">
                                    <CheckCircle2 size={12} className="mr-1" /> 100% Match
                                </Badge>
                            )}
                            {item.status === 'pending' && (
                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0 shadow-none">
                                    <Clock size={12} className="mr-1" /> In Progress
                                </Badge>
                            )}
                            {item.status === 'mismatch' && (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 shadow-none">
                                    <AlertCircle size={12} className="mr-1" /> Mismatch
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-3">
                             <div className="flex justify-between text-sm">
                                 <span className="text-[#757575]">Matched Volume</span>
                                 <span className="font-medium text-[#212121]">
                                     {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.matchedAmount)}
                                 </span>
                             </div>
                             
                             {item.mismatchAmount > 0 && (
                                 <div className="flex justify-between text-sm">
                                     <span className="text-red-600 font-medium">Unreconciled</span>
                                     <span className="font-bold text-red-600">
                                         {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.mismatchAmount)}
                                     </span>
                                 </div>
                             )}

                             {item.pendingAmount > 0 && (
                                 <div className="flex justify-between text-sm">
                                     <span className="text-yellow-600 font-medium">Pending</span>
                                     <span className="font-medium text-yellow-600">
                                         {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.pendingAmount)}
                                     </span>
                                 </div>
                             )}

                             <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#757575]">
                                    <span>Progress</span>
                                    <span>{item.matchPercent}%</span>
                                </div>
                                <Progress value={item.matchPercent} className={`h-1.5 ${
                                    item.status === 'mismatch' ? '[&>div]:bg-red-500' : 
                                    item.status === 'pending' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                                }`} />
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </ScrollArea>
    </div>
  );
}
