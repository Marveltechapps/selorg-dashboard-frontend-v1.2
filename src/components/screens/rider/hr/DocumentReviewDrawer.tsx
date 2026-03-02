import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiderDocument, Rider } from "./types";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Download, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { approveDocument, rejectDocument } from "./hrApi";

interface DocumentReviewDrawerProps {
  document: RiderDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (docId?: string, newStatus?: 'approved' | 'rejected') => void;
  riderDetails: Rider | null;
}

export function DocumentReviewDrawer({
  document,
  isOpen,
  onClose,
  onStatusUpdate,
  riderDetails,
}: DocumentReviewDrawerProps) {
  const [action, setAction] = useState<"view" | "approve" | "reject">("view");
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!document) return;
    setIsSubmitting(true);
    try {
      await approveDocument(document.id, notes);
      toast.success("Document approved successfully");
      onStatusUpdate(document.id, 'approved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!document) return;
    if (!rejectReason) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectDocument(document.id, rejectReason);
      toast.success("Document rejected");
      onStatusUpdate(document.id, 'rejected');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAction("view");
    setNotes("");
    setRejectReason("");
  };

  // Reset when drawer opens/closes or doc changes
  React.useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, document]);

  if (!document) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Review Document</SheetTitle>
          <SheetDescription>
            Review the submitted document for {document.riderName}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Rider Info */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
            <h4 className="font-semibold text-sm text-gray-900">Rider Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Name</span>
                <span className="font-medium">{document.riderName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Rider ID</span>
                <span className="font-medium">{document.riderId}</span>
              </div>
              {riderDetails && (
                <>
                  <div>
                    <span className="text-gray-500 block">Phone</span>
                    <span className="font-medium">{riderDetails.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Status</span>
                    <span className="capitalize font-medium">{riderDetails.status}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Document Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">Document Details</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                document.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                document.status === 'approved' ? 'bg-green-100 text-green-800' :
                document.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {document.status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Type</span>
                <span className="font-medium">{document.documentType}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Submitted At</span>
                <span className="font-medium">{format(new Date(document.submittedAt), "PPP p")}</span>
              </div>
              {document.expiresAt && (
                <div>
                  <span className="text-gray-500 block">Expires At</span>
                  <span className={`font-medium ${new Date(document.expiresAt) < new Date() ? 'text-red-600' : ''}`}>
                    {format(new Date(document.expiresAt), "PPP")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Document Preview Placeholder */}
          <div className="border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 min-h-[200px]">
            {/* In a real app, this would be an image or PDF viewer */}
             <img 
               src={document.fileUrl} 
               alt="Document Preview" 
               className="max-h-[300px] object-contain rounded shadow-sm mb-4"
             />
             <Button variant="outline" size="sm" className="gap-2">
               <Download size={14} /> Download File
             </Button>
          </div>

          {/* Action Area */}
          <div className="pt-4 border-t border-gray-200">
            {action === "view" && document.status === "pending" && (
               <div className="grid grid-cols-2 gap-4">
                 <Button 
                   className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                   onClick={() => setAction("approve")}
                 >
                   <CheckCircle2 size={16} /> Approve
                 </Button>
                 <Button 
                   variant="destructive"
                   className="w-full gap-2"
                   onClick={() => setAction("reject")}
                 >
                   <XCircle size={16} /> Reject
                 </Button>
               </div>
            )}

            {action === "approve" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Approval Notes (Optional)</Label>
                  <Textarea 
                    placeholder="Any notes regarding this approval..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAction("view")}>Cancel</Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Approving..." : "Confirm Approval"}
                  </Button>
                </div>
              </div>
            )}

            {action === "reject" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label className="text-red-600">Rejection Reason (Required)</Label>
                  <Select onValueChange={setRejectReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Image blurry or unreadable">Image blurry or unreadable</SelectItem>
                      <SelectItem value="Document expired">Document expired</SelectItem>
                      <SelectItem value="Name mismatch">Name mismatch</SelectItem>
                      <SelectItem value="Incorrect document type">Incorrect document type</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {rejectReason === "Other" && (
                     <Textarea 
                       placeholder="Please specify the reason..." 
                       className="mt-2"
                       onChange={(e) => setRejectReason(e.target.value)} 
                     />
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAction("view")}>Cancel</Button>
                  <Button 
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectReason}
                  >
                    {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                </div>
              </div>
            )}

            {(document.status === "rejected" || document.status === "approved") && action === "view" && (
               <div className="bg-gray-100 p-4 rounded text-sm text-gray-600">
                 <p className="font-semibold mb-1">
                   {document.status === "approved" ? "Approved by" : "Rejected by"}: {document.reviewer || "System"}
                 </p>
                 <p className="text-xs text-gray-500">
                   {document.reviewedAt ? format(new Date(document.reviewedAt), "PPP p") : ""}
                 </p>
                 {document.rejectionReason && (
                   <p className="mt-2 text-red-600 flex items-start gap-2">
                     <AlertTriangle size={14} className="mt-0.5" /> 
                     Reason: {document.rejectionReason}
                   </p>
                 )}
               </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
