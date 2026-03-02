import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { ScrollArea } from "../../ui/scroll-area";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    User, 
    Calendar, 
    FileText, 
    AlertTriangle, 
    Link as LinkIcon,
    Building2,
    Briefcase,
    FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { ProcurementApprovalTask, ProcurementApprovalDecision } from './procurementApprovalsApi';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface Props {
  task: ProcurementApprovalTask | null;
  open: boolean;
  onClose: () => void;
  onDecision: (id: string, payload: ProcurementApprovalDecision) => Promise<void>;
}

export function ProcurementTaskDetailsDrawer({ task, open, onClose, onDecision }: Props) {
  const [note, setNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);

  if (!task) return null;

  const handleDecision = async (decision: 'approve' | 'reject') => {
      if (decision === 'reject' && !rejectionReason) {
          toast.error("Please select a reason for rejection.");
          return;
      }

      setIsProcessing(true);
      try {
          await onDecision(task.id, { 
              decision, 
              note,
              reason: decision === 'reject' ? rejectionReason : undefined
          });
          setNote("");
          setRejectionReason("");
          setActiveAction(null);
          onClose();
      } catch (e) {
          // Error handled by parent mostly
      } finally {
          setIsProcessing(false);
      }
  };

  const getTypeBadgeColor = (type: string) => {
      switch (type) {
          case 'vendor_onboarding': return 'bg-blue-100 text-blue-700';
          case 'purchase_order': return 'bg-orange-100 text-orange-700';
          case 'contract_renewal': return 'bg-purple-100 text-purple-700';
          case 'price_change': return 'bg-yellow-100 text-yellow-700';
          case 'payment_release': return 'bg-green-100 text-green-700';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const renderContentSpecifics = () => {
      if (task.type === 'vendor_onboarding') {
          return (
             <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6">
                 <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
                     <Building2 size={16} /> Vendor Profile Summary
                 </h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                         <span className="text-gray-500 block text-xs uppercase">Vendor Name</span>
                         <span className="font-medium text-gray-900">{task.description.split(': ')[1] || 'Unknown Vendor'}</span>
                     </div>
                     <div>
                         <span className="text-gray-500 block text-xs uppercase">Category</span>
                         <span className="font-medium text-gray-900">{task.details?.split('Category: ')[1] || 'General'}</span>
                     </div>
                     <div className="col-span-2">
                         <span className="text-gray-500 block text-xs uppercase">KYC Status</span>
                         <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">
                             <FileCheck size={12} className="mr-1" /> Documents Verified
                         </Badge>
                     </div>
                 </div>
                 <div className="mt-4 flex gap-2">
                     <Button variant="outline" size="sm" className="bg-white h-8 text-xs">
                         <User size={12} className="mr-2"/> Open Profile
                     </Button>
                     <Button variant="outline" size="sm" className="bg-white h-8 text-xs">
                         <FileText size={12} className="mr-2"/> View Checklist
                     </Button>
                 </div>
             </div>
          );
      }
      
      if (task.type === 'purchase_order') {
          return (
             <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 mb-6">
                 <h4 className="flex items-center gap-2 text-sm font-bold text-orange-900 mb-3">
                     <Briefcase size={16} /> Purchase Order Details
                 </h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                         <span className="text-gray-500 block text-xs uppercase">PO Number</span>
                         <span className="font-mono font-medium text-gray-900">{task.relatedIds?.poNumber || 'N/A'}</span>
                     </div>
                     <div>
                         <span className="text-gray-500 block text-xs uppercase">Total Value</span>
                         <span className="font-bold text-gray-900">₹{task.valueAmount?.toLocaleString()}</span>
                     </div>
                 </div>
                 <div className="mt-4">
                     <Button variant="outline" size="sm" className="bg-white h-8 text-xs w-full">
                         <LinkIcon size={12} className="mr-2"/> View Full Purchase Order
                     </Button>
                 </div>
             </div>
          );
      }
      
      return null;
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col h-full bg-white p-0 border-l shadow-xl">
        {/* Hidden Accessibility Components */}
        <VisuallyHidden>
            <SheetTitle>Task Details: {task.description}</SheetTitle>
            <SheetDescription>
                Details for task {task.id}, including status, requester information, and action buttons.
            </SheetDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="p-6 border-b bg-gray-50/50">
            <div className="flex justify-between items-start mb-4">
                <Badge className={`${getTypeBadgeColor(task.type)} border-0 px-3 py-1 text-xs uppercase`}>
                    {task.type.replace(/_/g, ' ')}
                </Badge>
                <div className="flex items-center gap-2">
                     {task.priority === 'high' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                            <AlertTriangle size={10} /> High Priority
                        </Badge>
                     )}
                     <span className="font-mono text-xs text-gray-400">ID: {task.id.slice(0, 8)}</span>
                </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">
                {task.description}
            </h2>
            {task.valueAmount && (
                <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-2xl font-bold text-[#212121]">
                        ${task.valueAmount.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-gray-500">{task.currency}</span>
                </div>
            )}
        </div>

        <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
                
                {/* Specific Content based on Type */}
                {renderContentSpecifics()}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <User size={14} /> Requester
                        </h4>
                        <p className="font-medium text-gray-900">{task.requesterName}</p>
                        <p className="text-xs text-gray-500">{task.requesterRole}</p>
                    </div>
                    <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <Calendar size={14} /> Submitted
                        </h4>
                        <p className="font-medium text-gray-900">{new Date(task.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                <Separator />

                {/* Details Text */}
                <div>
                     <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                        <FileText size={14} /> Description & Details
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 leading-relaxed">
                        {task.details || "No additional details provided."}
                    </div>
                </div>

                {/* Action Area (if pending) */}
                {task.status === 'pending' && (
                    <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
                        <h4 className="text-sm font-bold text-gray-900">Decision</h4>
                        
                        {activeAction === 'reject' && (
                             <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-medium text-gray-700">Reason for Rejection *</label>
                                <Select onValueChange={setRejectionReason}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select reason..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="budget_exceeded">Budget Exceeded</SelectItem>
                                        <SelectItem value="incomplete_docs">Incomplete Documentation</SelectItem>
                                        <SelectItem value="vendor_compliance">Vendor Compliance Issue</SelectItem>
                                        <SelectItem value="duplicate_request">Duplicate Request</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                        )}

                        <div className="space-y-3">
                             <label className="text-xs font-medium text-gray-700">
                                 {activeAction === 'reject' ? 'Additional Comments' : 'Approval Note (Optional)'}
                             </label>
                             <Textarea 
                                placeholder={activeAction === 'reject' ? "Please provide details for the rejection..." : "Add any notes for the record..."}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="bg-white resize-none min-h-[80px]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        {/* Footer Actions */}
        {task.status === 'pending' ? (
            <div className="p-6 border-t bg-white flex gap-3">
                {activeAction === 'reject' ? (
                    <>
                        <Button variant="ghost" onClick={() => setActiveAction(null)} disabled={isProcessing}>Cancel</Button>
                        <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDecision('reject')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Confirm Rejection
                        </Button>
                    </>
                ) : activeAction === 'approve' ? (
                    <>
                         <Button variant="ghost" onClick={() => setActiveAction(null)} disabled={isProcessing}>Cancel</Button>
                         <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleDecision('approve')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Confirm Approval
                        </Button>
                    </>
                ) : (
                    <>
                        <Button 
                            variant="outline" 
                            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => setActiveAction('reject')}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                        </Button>
                        <Button 
                            className="flex-[2] bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setActiveAction('approve')}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                    </>
                )}
            </div>
        ) : (
             <div className="p-6 border-t bg-gray-50 flex justify-center">
                 <Badge variant="outline" className={`text-sm px-3 py-1 ${task.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                     Task {task.status === 'approved' ? 'Approved' : 'Rejected'}
                 </Badge>
             </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
