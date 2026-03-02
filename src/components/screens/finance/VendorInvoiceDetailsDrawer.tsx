import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { 
    FileText, 
    Download, 
    CheckCircle2, 
    XCircle,
    Loader2,
    Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { VendorInvoice, rejectInvoice, markInvoicePaid, approveInvoice } from './payablesApi';

interface Props {
  invoice: VendorInvoice | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function VendorInvoiceDetailsDrawer({ invoice, open, onClose, onUpdate }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!invoice) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approveInvoice(invoice.id);
      toast.success("Invoice approved successfully");
      onUpdate();
      onClose();
    } catch (e) {
      toast.error("Failed to approve invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsProcessing(true);
    try {
      await markInvoicePaid(invoice.id);
      toast.success("Invoice marked as paid");
      onUpdate();
      onClose();
    } catch (e) {
      toast.error("Failed to mark invoice as paid");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsProcessing(true);
    try {
      await rejectInvoice(invoice.id, rejectReason);
      toast.success("Invoice rejected");
      onUpdate();
      onClose();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (e) {
      toast.error("Failed to reject invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const csvContent = `Invoice Number,Vendor,Date,Due Date,Amount,Status\n${invoice.invoiceNumber},${invoice.vendorName},${invoice.invoiceDate},${invoice.dueDate},${invoice.amount},${invoice.status}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending_approval: "bg-[#FEF3C7] text-[#92400E]",
      approved: "bg-[#DCFCE7] text-[#166534]",
      scheduled: "bg-blue-100 text-blue-700",
      paid: "bg-gray-100 text-gray-700",
      overdue: "bg-[#FEE2E2] text-[#991B1B]",
      rejected: "bg-red-50 text-red-600"
    }[status] || "bg-gray-100 text-gray-700";

    return (
      <Badge className={styles}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
        <SheetContent className="w-[400px] sm:w-[600px] p-0 flex flex-col h-full bg-white overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-[#FAFAFA] flex-shrink-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <SheetTitle className="text-2xl font-bold text-gray-900 leading-tight font-mono">
                  {invoice.invoiceNumber}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <FileText size={14} /> Vendor Invoice
                </SheetDescription>
              </div>
              {getStatusBadge(invoice.status)}
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Vendor</p>
                  <p className="font-medium text-gray-900">{invoice.vendorName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
                  <p className="font-medium text-gray-900">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Due Date</p>
                  <p className="font-medium text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                  </p>
                </div>
              </div>

              {invoice.items && invoice.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Line Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2 text-right">Unit Price</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(item.unitPrice)}
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{invoice.notes}</p>
                </div>
              )}

              {invoice.attachmentUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Attachment</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(invoice.attachmentUrl, '_blank')}>
                    <Download className="mr-2 h-4 w-4" /> View Attachment
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 space-y-2">
            <Button variant="outline" className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download Invoice
            </Button>
            {invoice.status === 'pending_approval' && (
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-[#14B8A6] hover:bg-[#0D9488]" 
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={() => setShowRejectModal(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
            {(invoice.status === 'approved' || invoice.status === 'overdue') && (
              <Button 
                className="w-full bg-[#14B8A6] hover:bg-[#0D9488]" 
                onClick={handleMarkPaid}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Mark as Paid
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
