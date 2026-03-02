import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LiveTransaction } from './financeApi';
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, CheckCircle2, XCircle, Clock, ShieldCheck, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props {
  transaction: LiveTransaction | null;
  onClose: () => void;
}

export function TransactionDetailsDrawer({ transaction, onClose }: Props) {
  if (!transaction) return null;

  const StatusIcon = {
    success: CheckCircle2,
    failed: XCircle,
    pending: Clock
  }[transaction.status];

  const statusColor = {
    success: "text-green-600",
    failed: "text-red-600",
    pending: "text-yellow-600"
  }[transaction.status];

  return (
    <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
             TRANSACTION DETAILS
          </div>
          <SheetTitle className="text-2xl font-mono flex items-center gap-2">
            {transaction.txnId} 
            <Button variant="ghost" size="icon" className="h-6 w-6"><Copy size={14} /></Button>
          </SheetTitle>
          <SheetDescription>
            Processed via {transaction.gateway} on {new Date(transaction.createdAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
           {/* Amount & Status */}
           <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                 <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                 <p className="text-3xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}
                 </p>
              </div>
              <div className={`flex flex-col items-end ${statusColor}`}>
                 <StatusIcon size={32} className="mb-1" />
                 <span className="font-bold uppercase tracking-wider text-sm">{transaction.status}</span>
              </div>
           </div>

           {/* Payment Details */}
           <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                 <CreditCard size={18} /> Payment Method
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="space-y-1">
                    <p className="text-gray-500">Method</p>
                    <p className="font-medium">{transaction.methodDisplay}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-gray-500">Card / Account</p>
                    <p className="font-medium font-mono">{transaction.maskedDetails}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-gray-500">Gateway</p>
                    <p className="font-medium">{transaction.gateway}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-gray-500">Risk Check</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                       <ShieldCheck size={12} /> Passed
                    </Badge>
                 </div>
              </div>
           </div>
           
           <Separator />

           {/* Order Context */}
           <div>
              <h4 className="font-semibold text-gray-900 mb-4">Order Context</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="space-y-1">
                    <p className="text-gray-500">Order ID</p>
                    <p className="font-medium font-mono text-blue-600 underline cursor-pointer">{transaction.orderId}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{transaction.customerName}</p>
                 </div>
              </div>
           </div>

           <Separator />

           {/* Actions */}
           <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full justify-between">
                 View in Reconciliation
                 <ExternalLink size={16} />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                 View Customer History
                 <ExternalLink size={16} />
              </Button>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
