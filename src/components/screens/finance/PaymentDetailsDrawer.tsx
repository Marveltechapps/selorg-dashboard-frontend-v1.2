import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ExternalLink, Copy, CheckCircle2, XCircle, Clock, CreditCard, User, RotateCcw, ArrowRight, AlertCircle } from "lucide-react";
import { Separator } from "../../ui/separator";
import { ScrollArea } from "../../ui/scroll-area";
import { CustomerPayment } from './customerPaymentsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from 'sonner';
import { CustomerProfileModal } from './CustomerProfileModal';

interface Props {
  payment: CustomerPayment | null;
  onClose: () => void;
  open: boolean;
  onRetry?: (payment: CustomerPayment) => void;
}

export function PaymentDetailsDrawer({ payment, onClose, open, onRetry }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  
  if (!payment) return null;

  const StatusIcon = {
    captured: CheckCircle2,
    authorized: Clock,
    pending: Clock,
    declined: XCircle,
    refunded: RotateCcw,
    chargeback: AlertCircle
  }[payment.status] || Clock;

  const statusColor = {
    captured: "text-green-600 bg-green-50 border-green-200",
    authorized: "text-blue-600 bg-blue-50 border-blue-200",
    pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
    declined: "text-red-600 bg-red-50 border-red-200",
    refunded: "text-purple-600 bg-purple-50 border-purple-200",
    chargeback: "text-orange-600 bg-orange-50 border-orange-200"
  }[payment.status] || "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 mb-2 uppercase">
             Payment Details
          </div>
          <SheetTitle className="text-xl font-mono flex items-center gap-2 text-gray-900">
            {payment.id} 
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                <Copy size={12} />
            </Button>
          </SheetTitle>
          <SheetDescription className="mt-1">
            Processed via {payment.gatewayRef.substring(0, 8)}... on {new Date(payment.createdAt).toLocaleString()}
          </SheetDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="p-6 space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-xl border flex justify-between items-center ${statusColor}`}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">Status</p>
                        <p className="text-lg font-bold capitalize">{payment.status}</p>
                    </div>
                    <StatusIcon size={32} strokeWidth={1.5} />
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="customer">Customer</TabsTrigger>
                        <TabsTrigger value="technical">Technical</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-0">
                        {/* Amount */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-sm text-gray-500 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount)}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                                <p className="text-lg font-mono font-medium text-blue-600 underline cursor-pointer">{payment.orderId}</p>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2 text-sm">
                                <Clock size={16} /> Status Timeline
                            </h4>
                            <div className="relative border-l border-gray-200 ml-2 space-y-6 pb-2">
                                <div className="ml-6 relative">
                                    <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-gray-300 border-2 border-white ring-1 ring-gray-200"></div>
                                    <p className="text-xs text-gray-500 mb-0.5">{new Date(payment.createdAt).toLocaleString()}</p>
                                    <p className="text-sm font-medium text-gray-900">Payment Created</p>
                                </div>
                                {payment.status !== 'pending' && (
                                    <div className="ml-6 relative">
                                        <div className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ring-1 ring-gray-200 ${payment.status === 'declined' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                        <p className="text-xs text-gray-500 mb-0.5">{new Date(payment.lastUpdatedAt).toLocaleString()}</p>
                                        <p className="text-sm font-medium text-gray-900 capitalize">Payment {payment.status}</p>
                                        {payment.failureReason && (
                                            <p className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-100">
                                                Reason: {payment.failureReason}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="customer" className="space-y-6 mt-0">
                         <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                                    <User size={16} /> Customer Profile
                                </h4>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                                    <p className="font-medium text-gray-900">{payment.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                                    <p className="font-medium text-gray-900">{payment.customerEmail}</p>
                                </div>
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setProfileOpen(true);
                                  }}
                                >
                                    View Full Profile
                                </Button>
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full justify-between"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const event = new CustomEvent('navigateToTab', { detail: { tab: 'reconciliation' } });
                                    window.dispatchEvent(event);
                                    toast.success("Opening Reconciliation");
                                    onClose();
                                  }}
                                >
                                  View in Reconciliation <ExternalLink size={14} />
                                </Button>
                                {payment.retryEligible && onRetry && (
                                  <Button 
                                    type="button"
                                    size="sm" 
                                    className="w-full bg-[#14B8A6] hover:bg-[#0D9488]"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onRetry(payment);
                                      onClose();
                                    }}
                                  >
                                    Retry Payment
                                  </Button>
                                )}
                            </div>
                         </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-6 mt-0">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                                    <CreditCard size={16} /> Payment Method Details
                                </h4>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Type</p>
                                        <Badge variant="outline" className="capitalize">{payment.methodType.replace('_', ' ')}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Display</p>
                                        <p className="font-medium text-gray-900">{payment.paymentMethodDisplay}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Gateway Reference</p>
                                    <p className="font-mono text-sm bg-gray-100 p-2 rounded text-gray-700 break-all">
                                        {payment.gatewayRef}
                                    </p>
                                </div>
                            </div>
                         </div>
                    </TabsContent>
                </Tabs>
            </div>
        </ScrollArea>

        <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3">
             <Button 
               type="button"
               variant="outline" 
               className="w-full justify-between bg-white hover:bg-gray-50"
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 const event = new CustomEvent('navigateToTab', { detail: { tab: 'reconciliation' } });
                 window.dispatchEvent(event);
                 toast.success("Opening Reconciliation");
               }}
             >
                View in Reconciliation <ExternalLink size={14} />
             </Button>
             {payment.retryEligible && onRetry && (
                 <Button 
                   type="button"
                   className="w-full bg-[#14B8A6] hover:bg-[#0D9488]"
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     onRetry(payment);
                     onClose();
                   }}
                 >
                    Retry Payment
                 </Button>
             )}
        </div>
      </SheetContent>
      
      <CustomerProfileModal 
        payment={payment}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </Sheet>
  );
}
