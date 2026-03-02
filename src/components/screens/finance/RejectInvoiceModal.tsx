import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Loader2 } from 'lucide-react';
import { rejectInvoice, VendorInvoice } from './payablesApi';
import { toast } from 'sonner';

interface Props {
  invoice: VendorInvoice | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectInvoiceModal({ invoice, open, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  if (!invoice) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsLoading(true);
    try {
      await rejectInvoice(invoice.id, reason);
      toast.success("Invoice rejected");
      onSuccess();
      onClose();
      setReason('');
    } catch (e) {
      toast.error("Failed to reject invoice");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Invoice</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please provide a reason for rejecting invoice {invoice.invoiceNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-500">Vendor:</span>
              <span className="font-medium text-gray-900">{invoice.vendorName}</span>
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium text-gray-900">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={isLoading || !reason.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
