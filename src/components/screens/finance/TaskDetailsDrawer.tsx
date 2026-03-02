import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "../../ui/sheet";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { ScrollArea } from "../../ui/scroll-area";
import { Textarea } from "../../ui/textarea";
import { Loader2, CheckCircle2, XCircle, User, Calendar, FileText, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ApprovalTask, ApprovalDecisionPayload } from './approvalsApi';

interface Props {
  task: ApprovalTask | null;
  open: boolean;
  onClose: () => void;
  onDecision: (id: string, payload: ApprovalDecisionPayload) => Promise<void>;
}

export function TaskDetailsDrawer({ task, open, onClose, onDecision }: Props) {
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!task) return null;

  const handleDecision = async (decision: 'approve' | 'reject') => {
      if (decision === 'reject' && !note.trim()) {
          toast.error("Please provide a reason for rejection.");
          return;
      }

      setIsProcessing(true);
      try {
          await onDecision(task.id, { decision, note });
          toast.success(`Task ${decision}d successfully`);
          onClose();
          setNote("");
      } catch (e) {
          toast.error("Failed to submit decision");
      } finally {
          setIsProcessing(false);
      }
  };

  const getTypeBadgeColor = (type: string) => {
      switch (type) {
          case 'refund': return 'bg-red-100 text-red-700 hover:bg-red-100';
          case 'invoice': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
          case 'large_payment': return 'bg-purple-100 text-purple-700 hover:bg-purple-100';
          default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
      }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col h-full bg-white p-0 border-l shadow-xl">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50/50">
            <div className="flex justify-between items-start mb-4">
                <Badge className={`${getTypeBadgeColor(task.type)} border-0 px-3 py-1 text-xs uppercase`}>
                    {task.type.replace('_', ' ')}
                </Badge>
                <span className="font-mono text-xs text-gray-400">ID: {task.id.slice(0, 8)}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">
                {task.description}
            </h2>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#212121]">
                    ₹{task.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-medium text-gray-500">{task.currency}</span>
            </div>
        </div>

        <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
                {/* Context */}
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
                            <Calendar size={14} /> Created At
                        </h4>
                        <p className="font-medium text-gray-900">{new Date(task.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                <Separator />

                {/* Details */}
                <div>
                     <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                        <FileText size={14} /> Details
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 leading-relaxed">
                        {task.details || "No additional details provided."}
                    </div>
                </div>

                {/* Linked Entities */}
                {task.relatedIds && Object.keys(task.relatedIds).length > 0 && (
                    <div>
                         <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-3">
                            <LinkIcon size={14} /> Linked Entities
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(task.relatedIds).map(([key, val]) => (
                                <div key={key} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded bg-white text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer">
                                    <span className="capitalize text-gray-500">{key.replace('Id', '')}:</span>
                                    <span className="font-mono">{val}</span>
                                    <LinkIcon size={10} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* High-value notice based on task amount */}
                {task.amount > 1000 && (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-bold text-yellow-800">High Value Transaction</p>
                            <p className="text-xs text-yellow-700 mt-1">This amount exceeds the standard auto-approval threshold of ₹1,000. Please review carefully.</p>
                        </div>
                    </div>
                )}
                
                {/* Decision Note Input */}
                <div>
                     <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Approval/Rejection Note <span className="font-normal normal-case text-gray-400">(Optional for approval)</span>
                    </h4>
                    <Textarea 
                        placeholder="Add a note or reason..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="resize-none"
                    />
                </div>
            </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-white flex gap-4">
             <Button 
                variant="outline" 
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => handleDecision('reject')}
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Reject
            </Button>
            <Button 
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleDecision('approve')}
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve Request
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
