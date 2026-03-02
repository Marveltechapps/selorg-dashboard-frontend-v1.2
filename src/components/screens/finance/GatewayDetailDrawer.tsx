import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { ArrowRight, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { SettlementSummaryItem } from './reconciliationApi';
import { Progress } from "../../ui/progress";

interface Props {
  gateway: SettlementSummaryItem | null;
  open: boolean;
  onClose: () => void;
  onViewExceptions: () => void;
}

export function GatewayDetailDrawer({ gateway, open, onClose, onViewExceptions }: Props) {
  if (!gateway) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100 bg-[#FAFAFA]">
             <div className="flex items-center gap-3 mb-2">
                <div className={`h-8 w-8 rounded flex items-center justify-center text-white font-bold text-xs ${
                    gateway.gateway === 'Stripe' ? 'bg-[#635BFF]' : 
                    gateway.gateway === 'PayPal' ? 'bg-[#003087]' : 
                    gateway.gateway === 'Adyen' ? 'bg-[#0ABF53]' : 'bg-gray-500'
                }`}>
                    {gateway.gateway.substring(0, 2).toUpperCase()}
                </div>
                 <h2 className="text-xl font-bold text-gray-900">{gateway.gateway} Settlement</h2>
             </div>
             <SheetTitle className="hidden">
                 Details for {gateway.gateway}
             </SheetTitle>
             <SheetDescription className="text-sm text-gray-500">
                 Settlement Report • {new Date().toLocaleDateString()}
             </SheetDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}>
             <div className="p-6 space-y-8">
                 {/* Big Stats */}
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                         <p className="text-xs text-gray-500 uppercase font-medium">Total Processed</p>
                         <p className="text-xl font-bold text-gray-900 mt-1">
                             {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gateway.matchedAmount + gateway.pendingAmount + gateway.mismatchAmount)}
                         </p>
                     </div>
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                         <p className="text-xs text-gray-500 uppercase font-medium">Reconciliation Rate</p>
                         <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xl font-bold ${gateway.matchPercent < 95 ? 'text-orange-600' : 'text-green-600'}`}>
                                {gateway.matchPercent}%
                            </span>
                            <Progress value={gateway.matchPercent} className="h-2 w-16" />
                         </div>
                     </div>
                 </div>

                 <Separator />

                 {/* Breakdown */}
                 <div className="space-y-4">
                     <h3 className="font-semibold text-gray-900">Reconciliation Breakdown</h3>
                     
                     <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 rounded hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3">
                                 <CheckCircle2 size={18} className="text-green-600" />
                                 <span className="text-sm font-medium text-gray-700">Matched Transactions</span>
                             </div>
                             <span className="font-mono font-medium">
                                 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gateway.matchedAmount)}
                             </span>
                         </div>

                         <div className="flex items-center justify-between p-3 rounded hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3">
                                 <Clock size={18} className="text-yellow-600" />
                                 <span className="text-sm font-medium text-gray-700">Pending Settlement</span>
                             </div>
                             <span className="font-mono font-medium">
                                 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gateway.pendingAmount)}
                             </span>
                         </div>

                         <div className="flex items-center justify-between p-3 rounded bg-red-50 border border-red-100">
                             <div className="flex items-center gap-3">
                                 <AlertCircle size={18} className="text-red-600" />
                                 <span className="text-sm font-medium text-red-700">Unmatched / Exceptions</span>
                             </div>
                             <span className="font-mono font-bold text-red-700">
                                 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gateway.mismatchAmount)}
                             </span>
                         </div>
                     </div>
                 </div>

                 {gateway.mismatchAmount > 0 && (
                     <div className="bg-white p-5 rounded border border-gray-200 shadow-sm text-center space-y-3">
                         <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                             <AlertCircle size={20} />
                         </div>
                         <h4 className="font-bold text-gray-900">Action Required</h4>
                         <p className="text-sm text-gray-500 max-w-xs mx-auto">
                             There are unmatched transactions that require your attention to close the books for today.
                         </p>
                         <Button 
                            variant="outline" 
                            className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                                onClose();
                                onViewExceptions();
                            }}
                         >
                             View Unmatched Transactions <ArrowRight size={16} className="ml-2" />
                         </Button>
                     </div>
                 )}
             </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
