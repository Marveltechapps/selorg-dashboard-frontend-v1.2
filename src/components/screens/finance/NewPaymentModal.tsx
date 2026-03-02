import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Loader2, IndianRupee } from 'lucide-react';
import { createPayment, Vendor, VendorInvoice, fetchVendorInvoices } from './payablesApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: Vendor[];
  preselectedInvoice?: VendorInvoice | null;
}

export function NewPaymentModal({ open, onClose, onSuccess, vendors, preselectedInvoice }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<VendorInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Reset on open
  useEffect(() => {
    if (open) {
        if (preselectedInvoice) {
          // If invoice is preselected, skip to step 2
          setSelectedVendorId(preselectedInvoice.vendorId);
          setStep(2);
          setAvailableInvoices([preselectedInvoice]);
          setSelectedInvoiceIds(new Set([preselectedInvoice.id]));
          // Set payment date to today by default when scheduling
          setPaymentDate(new Date().toISOString().split('T')[0]);
        } else {
          setStep(1);
          setSelectedVendorId('');
          setAvailableInvoices([]);
          setSelectedInvoiceIds(new Set());
          setPaymentDate(new Date().toISOString().split('T')[0]);
        }
        setPaymentMethod('bank_transfer');
    }
  }, [open, preselectedInvoice]);

  const handleVendorSelect = async (vendorId: string) => {
      setSelectedVendorId(vendorId);
      setIsLoadingInvoices(true);
      try {
          // Fetch invoices for this vendor that are actionable (approved, overdue, scheduled)
          const result = await fetchVendorInvoices({ 
              vendorId, 
              page: 1, 
              pageSize: 50 
          });
          // Filter client-side for demo purposes
          const actionable = result.data.filter(i => ['approved', 'overdue'].includes(i.status));
          setAvailableInvoices(actionable);
          setStep(2);
      } catch (e) {
          toast.error("Failed to load vendor invoices");
      } finally {
          setIsLoadingInvoices(false);
      }
  };

  const toggleInvoice = (id: string) => {
      const next = new Set(selectedInvoiceIds);
      if (next.has(id)) {
          next.delete(id);
      } else {
          next.add(id);
      }
      setSelectedInvoiceIds(next);
  };

  const calculateTotal = () => {
      return availableInvoices
        .filter(i => selectedInvoiceIds.has(i.id))
        .reduce((sum, i) => sum + i.amount, 0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (selectedInvoiceIds.size === 0) {
        toast.error("Please select at least one invoice");
        return;
      }
      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }
      
      setIsSubmitting(true);
      try {
          const invoicesToPay = Array.from(selectedInvoiceIds).map(id => {
              const inv = availableInvoices.find(i => i.id === id);
              return { invoiceId: id, amount: inv ? inv.amount : 0 };
          });

          const result = await createPayment({
              vendorId: selectedVendorId,
              invoices: invoicesToPay,
              paymentDate: paymentDate,
              method: paymentMethod,
              reference: `PAY-${Date.now()}`
          });

          toast.success(`Payment scheduled successfully for ${paymentDate}`);
          onSuccess();
          onClose();
      } catch (e) {
          toast.error("Payment failed");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Payment</DialogTitle>
          <DialogDescription>
             {step === 1 ? "Select a vendor to start a payment." : "Select invoices to pay."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
            {step === 1 && (
                <div className="space-y-4">
                    <Label>Select Vendor</Label>
                    <Select value={selectedVendorId} onValueChange={handleVendorSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a vendor..." />
                        </SelectTrigger>
                        <SelectContent>
                            {vendors.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isLoadingInvoices && (
                        <div className="flex items-center justify-center py-8 text-gray-500">
                            <Loader2 className="animate-spin mr-2" /> Loading invoices...
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 max-h-[300px] overflow-y-auto">
                        {availableInvoices.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No outstanding invoices for this vendor.</p>
                        ) : (
                            <div className="space-y-3">
                                {availableInvoices.map(invoice => (
                                    <div key={invoice.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-colors">
                                        <Checkbox 
                                            id={invoice.id} 
                                            checked={selectedInvoiceIds.has(invoice.id)}
                                            onCheckedChange={() => toggleInvoice(invoice.id)}
                                        />
                                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                                            <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                            <div className="text-gray-500">Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                                            <div className="text-right font-medium">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label>Payment Date</Label>
                             <Input 
                               type="date" 
                               value={paymentDate}
                               onChange={(e) => setPaymentDate(e.target.value)}
                               min={new Date().toISOString().split('T')[0]}
                             />
                             {paymentDate && (
                               <p className="text-xs text-gray-500">Selected: {new Date(paymentDate).toLocaleDateString()}</p>
                             )}
                         </div>
                         <div className="space-y-2">
                             <Label>Payment Method</Label>
                             <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_transfer">Bank Transfer (ACH)</SelectItem>
                                    <SelectItem value="check">Check</SelectItem>
                                    <SelectItem value="card">Credit Card</SelectItem>
                                    <SelectItem value="wire">Wire Transfer</SelectItem>
                                </SelectContent>
                             </Select>
                         </div>
                    </div>

                    <div className="flex items-center justify-between bg-teal-50 p-4 rounded-lg border border-teal-100">
                        <span className="font-medium text-teal-900">Total Payment</span>
                        <span className="text-2xl font-bold text-teal-900">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculateTotal())}
                        </span>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter>
            {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            {step === 2 && (
                <Button 
                    onClick={(e) => handleSubmit(e)} 
                    className="bg-[#14B8A6] hover:bg-[#0D9488]"
                    disabled={isSubmitting || selectedInvoiceIds.size === 0}
                    type="button"
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Payment
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
