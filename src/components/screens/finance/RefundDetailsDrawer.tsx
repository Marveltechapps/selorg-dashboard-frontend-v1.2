import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { ScrollArea } from "../../ui/scroll-area";
import { Package, CreditCard, User, FileText, CheckCircle2, XCircle, Clock, CircleDot } from "lucide-react";
import { RefundRequest, markRefundCompleted } from './refundsApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  refund: RefundRequest | null;
  open: boolean;
  onClose: () => void;
  onApprove: (refund: RefundRequest) => void;
  onReject: (refund: RefundRequest) => void;
  onRefresh?: () => void;
}

const REFUND_METHOD_LABELS: Record<string, string> = {
  original_payment: 'Original Payment Method',
  wallet: 'Customer Wallet',
  bank_transfer: 'Bank Transfer',
  manual: 'Manual Processing',
};

export function RefundDetailsDrawer({ refund, open, onClose, onApprove, onReject, onRefresh }: Props) {
  const [markingComplete, setMarkingComplete] = useState(false);

  const handleMarkCompleted = async () => {
    if (!refund) return;
    setMarkingComplete(true);
    try {
      await markRefundCompleted(refund.id);
      toast.success('Refund marked as completed');
      onRefresh?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark refund as completed');
    } finally {
      setMarkingComplete(false);
    }
  };

  if (!refund) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Request Details</span>
                <Badge variant="outline" className={`ml-auto capitalize ${
                    refund.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    refund.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    refund.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : ''
                }`}>
                    {refund.status}
                </Badge>
            </div>
            <SheetTitle className="text-xl font-bold text-gray-900">
                Refund for Order #{refund.orderId}
            </SheetTitle>
            <SheetDescription className="hidden">
                Detailed view of refund request for order #{refund.orderId}
            </SheetDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)' }}>
            <div className="p-6 space-y-8">
                {/* Customer Info */}
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                        <User size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">{refund.customerName}</h4>
                        <p className="text-sm text-gray-500">{refund.customerEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">Customer ID: {refund.customerId}</p>
                    </div>
                </div>

                <Separator />

                {/* Refund Request Info */}
                <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                        <FileText size={18} /> Request Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3 text-sm">
                         <div className="flex justify-between">
                             <span className="text-gray-500">Reason</span>
                             <span className="font-medium capitalize">{refund.reasonCode.replace('_', ' ')}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Requested</span>
                             <span className="font-medium">{new Date(refund.requestedAt).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Channel</span>
                             <span className="font-medium capitalize">{refund.channel.replace('_', ' ')}</span>
                         </div>
                         <Separator className="bg-gray-200" />
                         <div>
                             <span className="text-gray-500 block mb-1">Customer Note</span>
                             <p className="text-gray-900 italic">"{refund.reasonText}"</p>
                         </div>
                    </div>
                </div>

                {/* Financials */}
                 <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                        <CreditCard size={18} /> Financials
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                        <div className="p-4 flex justify-between items-center bg-gray-50 border-b">
                            <span className="text-sm text-gray-600">Refund Amount</span>
                            <span className="text-xl font-bold text-gray-900">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: refund.currency }).format(refund.amount)}
                            </span>
                        </div>
                        <div className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Original Payment ID</span>
                                <span className="font-mono text-gray-700">{refund.paymentId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Refund Method</span>
                                <span className="text-gray-700">{REFUND_METHOD_LABELS[(refund as any).refundMethod] || (refund as any).refundMethod || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Timeline (P1-25) */}
                <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Clock size={18} /> Status Timeline
                    </h4>
                    {(() => {
                        const refundTimeline = (refund as any).timeline;
                        const stages = ['requested', 'reviewed', refund.status === 'rejected' ? 'rejected' : 'approved', 'processing', 'settled'];
                        if (refundTimeline && refundTimeline.length > 0) {
                            const tlMap: Record<string, any> = {};
                            refundTimeline.forEach((t: any) => { tlMap[t.status || t.stage] = t; });
                            return (
                                <div className="relative pl-6">
                                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                                    {stages.map((stage, idx) => {
                                        const entry = tlMap[stage];
                                        const isCompleted = !!entry?.timestamp;
                                        const completedCount = stages.filter(s => tlMap[s]?.timestamp).length;
                                        const isCurrent = idx === completedCount && !isCompleted;
                                        return (
                                            <div key={stage} className="relative flex items-start gap-3 pb-4">
                                                <div className={cn(
                                                    "w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white",
                                                    isCompleted ? (stage === 'rejected' ? "border-red-500 bg-red-500" : "border-green-500 bg-green-500") :
                                                    isCurrent ? "border-blue-500 bg-blue-50" : "border-gray-300"
                                                )}>
                                                    {isCompleted ? (
                                                        stage === 'rejected' ? <XCircle size={14} className="text-white" /> : <CheckCircle2 size={14} className="text-white" />
                                                    ) : isCurrent ? (
                                                        <CircleDot size={14} className="text-blue-500" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-medium capitalize",
                                                        isCompleted ? (stage === 'rejected' ? "text-red-700" : "text-green-700") : isCurrent ? "text-blue-700" : "text-gray-400"
                                                    )}>{stage}</p>
                                                    {entry?.timestamp && <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>}
                                                    {entry?.actor && <p className="text-xs text-gray-400">by {entry.actor}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }
                        return (
                            <div className="text-sm text-gray-500 italic">No timeline data available</div>
                        );
                    })()}
                </div>

                {/* Order context */}
                <div className="space-y-4">
                     <h4 className="font-semibold flex items-center gap-2">
                        <Package size={18} /> Order Context
                    </h4>
                    <div className="text-sm text-gray-500">
                        <p>Order ID: <span className="font-mono text-gray-700">{refund.orderId}</span></p>
                    </div>
                </div>
            </div>
        </ScrollArea>

        {refund.status === 'pending' && (
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <Button 
                    variant="outline" 
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                    onClick={() => onReject(refund)}
                >
                    <XCircle size={16} className="mr-2" /> Reject
                </Button>
                <Button 
                    className="flex-1 bg-[#14B8A6] hover:bg-[#0D9488]" 
                    onClick={() => onApprove(refund)}
                >
                    <CheckCircle2 size={16} className="mr-2" /> Approve
                </Button>
            </div>
        )}
        {refund.status === 'approved' && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
                <Button 
                    className="w-full bg-[#14B8A6] hover:bg-[#0D9488]" 
                    onClick={handleMarkCompleted}
                    disabled={markingComplete}
                >
                    <CheckCircle2 size={16} className="mr-2" /> {markingComplete ? 'Processing...' : 'Mark Completed'}
                </Button>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
