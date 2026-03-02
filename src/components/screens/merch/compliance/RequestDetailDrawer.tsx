import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ApprovalRequest } from './types';
import { CheckCircle2, XCircle, ArrowRight, User, Globe, AlertTriangle } from 'lucide-react';

interface RequestDetailDrawerProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onApprove: (req: ApprovalRequest) => void;
  onReject: (req: ApprovalRequest) => void;
}

export function RequestDetailDrawer({ request, onClose, onApprove, onReject }: RequestDetailDrawerProps) {
  if (!request) return null;

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="shrink-0 space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="uppercase tracking-wider">
                 {request.type}
             </Badge>
             {request.riskLevel === 'High' && (
                 <Badge variant="destructive" className="flex gap-1 items-center">
                     <AlertTriangle size={12} /> High Risk
                 </Badge>
             )}
          </div>
          <SheetTitle className="text-2xl">{request.title}</SheetTitle>
          <SheetDescription className="text-base text-gray-700">
            {request.description || "No description provided."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-6">
                {/* Context Section */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Request Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        {request.type === 'Price Change' && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">SKU</span>
                                    <span className="font-medium">{request.details.sku}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                     <div className="text-center">
                                         <div className="text-xs text-gray-500 uppercase">Current</div>
                                         <div className="text-lg font-semibold text-gray-700">₹{request.details.currentPrice?.toFixed(2)}</div>
                                     </div>
                                     <ArrowRight className="text-gray-400" />
                                     <div className="text-center">
                                         <div className="text-xs text-gray-500 uppercase">Proposed</div>
                                         <div className="text-lg font-bold text-green-700">₹{request.details.proposedPrice?.toFixed(2)}</div>
                                     </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                    <span className="text-gray-500 text-sm">Margin Impact</span>
                                    <span className="font-medium text-green-600">{request.details.marginImpact}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Competitor Avg</span>
                                    <span className="font-medium">{request.details.competitorPrices}</span>
                                </div>
                            </>
                        )}
                        {request.type === 'New Campaign' && (
                             <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Campaign</span>
                                    <span className="font-medium">{request.details.campaignName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Mechanic</span>
                                    <span className="font-medium">{request.details.discountMechanics}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Expected Uplift</span>
                                    <span className="font-medium text-green-600">{request.details.expectedUplift}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-gray-500 text-sm">Markets</span>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {request.details.affectedRegions?.map(r => (
                                            <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                         {/* Fallback for other types */}
                         {!['Price Change', 'New Campaign'].includes(request.type) && (
                             <div className="text-sm text-gray-600 italic">
                                 See attachment for full policy override details.
                                 {request.details.marginImpact && <div className="mt-2 not-italic">Margin Impact: <span className="font-semibold text-red-600">{request.details.marginImpact}</span></div>}
                             </div>
                         )}
                    </div>
                </div>

                <Separator />

                {/* Workflow Info */}
                <div className="space-y-3">
                     <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Approval Workflow</h4>
                     <div className="space-y-4">
                         <div className="flex items-start gap-3">
                             <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                 <User size={16} />
                             </div>
                             <div>
                                 <div className="text-sm font-medium">{request.requestedBy}</div>
                                 <div className="text-xs text-gray-500">Requester • {new Date(request.requestedAt).toLocaleString()}</div>
                             </div>
                         </div>
                         {request.approvers.map((approver, i) => (
                             <div key={i} className="flex items-start gap-3 relative">
                                 {/* Connector line */}
                                 {i < request.approvers.length && <div className="absolute top-[-20px] left-[15px] h-[26px] w-0.5 bg-gray-200" />}
                                 
                                 <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 z-10 ${
                                     request.status === 'Pending' && i === request.currentStep - 1 ? 'border-orange-200 bg-orange-50 text-orange-600' :
                                     request.status === 'Approved' ? 'border-green-200 bg-green-50 text-green-600' :
                                     'border-gray-200 bg-gray-50 text-gray-400'
                                 }`}>
                                     <span className="text-xs font-bold">{i+1}</span>
                                 </div>
                                 <div>
                                     <div className="text-sm font-medium">{approver}</div>
                                      <div className="text-xs text-gray-500">
                                          {request.status === 'Pending' && i === request.currentStep - 1 ? 'Pending Review...' : 'Waiting'}
                                      </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>

                <Separator />

                {/* Comments */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notes</h4>
                    <Textarea placeholder="Add a comment..." className="resize-none" />
                    <div className="flex justify-end">
                        <Button size="sm" variant="ghost">Post Note</Button>
                    </div>
                </div>
            </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 pt-4 border-t gap-3 sm:justify-between">
            {request.status === 'Pending' ? (
                <>
                     <Button 
                        variant="outline" 
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => onReject(request)}
                    >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onApprove(request)}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Request
                    </Button>
                </>
            ) : (
                 <div className="w-full p-2 text-center bg-gray-50 rounded border text-gray-500 text-sm">
                     This request is <strong>{request.status}</strong>.
                 </div>
            )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
