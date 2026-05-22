import React, { useState, useEffect } from 'react';
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Loader2, IndianRupee, Upload, FileText, X, Check } from 'lucide-react';
import { createPayment, Vendor, VendorInvoice, fetchVendorInvoices } from './payablesApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAYMENT_STEPS = [
  { id: 1 as const, label: 'Vendor' },
  { id: 2 as const, label: 'Invoices & Document' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (paymentId?: string) => void;
  vendors: Vendor[];
  onRefreshVendors?: () => void | Promise<void>;
  preselectedInvoice?: VendorInvoice | null;
}

export function NewPaymentModal({
  open,
  onClose,
  onSuccess,
  vendors,
  onRefreshVendors,
  preselectedInvoice,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<VendorInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      void onRefreshVendors?.();
      if (preselectedInvoice) {
        setSelectedVendorId(preselectedInvoice.vendorId);
        setStep(2);
        setAvailableInvoices([preselectedInvoice]);
        setSelectedInvoiceIds(new Set([preselectedInvoice.id]));
        setPaymentDate(new Date().toISOString().split('T')[0]);
      } else {
        setStep(1);
        setSelectedVendorId('');
        setAvailableInvoices([]);
        setSelectedInvoiceIds(new Set());
        setPaymentDate(new Date().toISOString().split('T')[0]);
      }
      setPaymentMethod('bank_transfer');
      setAttachmentFile(null);
    }
  }, [open, preselectedInvoice, onRefreshVendors]);

  const loadVendorInvoices = async (vendorId: string) => {
    setIsLoadingInvoices(true);
    try {
      const result = await fetchVendorInvoices({
        vendorId,
        page: 1,
        pageSize: 50,
      });
      const actionable = result.data.filter((i) => ['approved', 'overdue'].includes(i.status));
      setAvailableInvoices(actionable);
      return actionable;
    } catch {
      toast.error('Failed to load vendor invoices');
      return null;
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedInvoiceIds(new Set());
    void loadVendorInvoices(vendorId);
  };

  const handleContinueToInvoices = async () => {
    if (!selectedVendorId) {
      toast.error('Select a vendor first');
      return;
    }
    if (!isLoadingInvoices && availableInvoices.length === 0) {
      await loadVendorInvoices(selectedVendorId);
    }

    setStep(2);
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

  const calculateTotal = () =>
    availableInvoices
      .filter((i) => selectedInvoiceIds.has(i.id))
      .reduce((sum, i) => sum + i.amount, 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedInvoiceIds.size === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!attachmentFile) {
      toast.error('Please upload invoice PDF or supporting document');
      return;
    }

    setIsSubmitting(true);
    try {
      const invoicesToPay = Array.from(selectedInvoiceIds).map((id) => {
        const inv = availableInvoices.find((i) => i.id === id);
        return { invoiceId: id, amount: inv ? inv.amount : 0 };
      });

      const result = await createPayment({
        vendorId: selectedVendorId,
        invoices: invoicesToPay,
        paymentDate,
        method: paymentMethod,
        reference: `PAY-${Date.now()}`,
        file: attachmentFile,
      });

      toast.success('Payment created. Continue the workflow from Finance Verification.');
      onSuccess(result.paymentId);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const goToStep = (target: 1 | 2) => {
    if (target === 1) {
      if (preselectedInvoice) return;
      setStep(1);
      return;
    }
    void handleContinueToInvoices();
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="New Payment"
      subtitle={
        step === 1
          ? 'Select a vendor to start a payment.'
          : `Select invoices to pay${selectedVendor ? ` — ${selectedVendor.name}` : ''}.`
      }
      icon={<IndianRupee className="h-5 w-5 text-[#14B8A6]" />}
      maxWidth="w-[clamp(560px,50vw,960px)] min-w-0"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#757575]">
            Step {step} of {PAYMENT_STEPS.length}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting || !!preselectedInvoice}
              >
                Back
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {step === 1 && (
              <Button
                type="button"
                onClick={() => void handleContinueToInvoices()}
                className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
                disabled={!selectedVendorId}
              >
                {isLoadingInvoices ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Continue
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                onClick={(e) => handleSubmit(e)}
                className="bg-[#14B8A6] hover:bg-[#0D9488]"
                disabled={isSubmitting || selectedInvoiceIds.size === 0 || !attachmentFile}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Start Workflow
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="px-6 py-5">
        {/* Step tabs */}
        <nav className="mb-8 border-b border-[#E0E0E0]" aria-label="New payment steps">
          <ol className="grid grid-cols-2">
            {PAYMENT_STEPS.map((s) => {
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              const isStep1Locked = s.id === 1 && !!preselectedInvoice;
              const isStep2Disabled = s.id === 2 && !selectedVendorId;
              const canClick = !isStep1Locked && !isStep2Disabled;

              return (
                <li key={s.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => goToStep(s.id)}
                    disabled={!canClick}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'flex w-full items-center justify-center gap-3 px-4 py-4 transition-colors',
                      'border-b-[3px] -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:ring-offset-2',
                      isActive
                        ? 'border-[#14B8A6] bg-teal-50/40 text-[#0F766E]'
                        : 'border-transparent text-[#757575]',
                      canClick && !isActive && 'hover:border-[#B2DFDB] hover:bg-[#F5F7FA] hover:text-[#14B8A6]',
                      !canClick && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold leading-none',
                        isActive && 'border-[#14B8A6] bg-[#14B8A6] text-white shadow-md',
                        isCompleted && 'border-[#14B8A6] bg-[#14B8A6] text-white',
                        !isActive && !isCompleted && 'border-[#BDBDBD] bg-white text-[#616161]',
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5 shrink-0 stroke-[3]" /> : s.id}
                    </div>
                    <span
                      className={cn(
                        'text-left text-sm font-semibold leading-snug',
                        isActive ? 'text-[#0F766E]' : isCompleted ? 'text-[#212121]' : 'text-[#757575]',
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {step === 1 && (
          <div className="space-y-3">
            <Label htmlFor="vendor-select" className="text-sm font-medium text-[#212121]">
              Select Vendor
            </Label>
            <Select
              value={selectedVendorId}
              onValueChange={handleVendorSelect}
              disabled={vendors.length === 0 || isLoadingInvoices}
            >
              <SelectTrigger id="vendor-select" className="h-11 border-[#E0E0E0]">
                <SelectValue
                  placeholder={vendors.length === 0 ? 'No vendors available' : 'Choose a vendor...'}
                />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vendors.length === 0 && (
              <p className="text-xs text-amber-600">
                No vendors loaded. Return to Vendor Payments, refresh data, and retry.
              </p>
            )}
            {isLoadingInvoices && (
              <div className="flex items-center justify-center py-10 text-[#757575]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading invoices...
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {isLoadingInvoices && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] py-8 text-sm text-[#757575]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading invoices...
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] p-3">
              {!isLoadingInvoices && availableInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#757575]">
                  No outstanding invoices for this vendor.
                </p>
              ) : !isLoadingInvoices ? (
                <div className="space-y-2">
                  {availableInvoices.map((invoice) => (
                    <label
                      key={invoice.id}
                      htmlFor={invoice.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-white p-3 transition-colors hover:border-[#E0E0E0]"
                    >
                      <Checkbox
                        id={invoice.id}
                        checked={selectedInvoiceIds.has(invoice.id)}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                      <div className="grid flex-1 grid-cols-3 gap-2 text-sm">
                        <div className="font-medium text-[#212121]">{invoice.invoiceNumber}</div>
                        <div className="text-[#757575]">
                          Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-right font-medium text-[#212121]">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: invoice.currency,
                          }).format(invoice.amount)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-date" className="text-sm font-medium text-[#212121]">
                  Payment Date
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  className="h-11 border-[#E0E0E0]"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#212121]">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-11 border-[#E0E0E0]">
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

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#212121]">
                Invoice document <span className="text-red-500">*</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.csv"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              {attachmentFile ? (
                <div className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-[#212121]">
                    <FileText size={18} className="text-[#14B8A6]" />
                    <span className="truncate max-w-[280px]">{attachmentFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setAttachmentFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E0E0E0] bg-[#F5F7FA] px-6 py-8 text-sm text-[#757575] hover:border-[#14B8A6] hover:bg-teal-50/50 transition-colors"
                >
                  <Upload size={24} className="text-[#14B8A6]" />
                  <span>Upload PDF or supporting file (max 15MB)</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-5 py-4">
              <span className="font-medium text-teal-900">Total Payment</span>
              <span className="text-2xl font-bold text-teal-900">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  calculateTotal(),
                )}
              </span>
            </div>

            <p className="text-xs text-[#757575]">
              After submit, each invoice starts at Finance Verification. You can pause and resume
              the workflow anytime.
            </p>
          </div>
        )}
      </div>
    </AdminModal>
  );
}
