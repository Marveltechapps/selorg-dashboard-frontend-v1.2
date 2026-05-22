import React, { useCallback, useEffect, useState } from 'react';
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  advancePaymentWorkflowStep,
  cancelVendorPayment,
  fetchVendorPayment,
  PaymentWorkflowStep,
  VendorPayment,
  VendorPaymentInvoiceLine,
} from './payablesApi';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';

interface Props {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const STEP_ORDER: PaymentWorkflowStep[] = [
  'finance_verification',
  'approval',
  'payment_released',
  'settlement_confirmation',
];

function stepState(
  line: VendorPaymentInvoiceLine,
  step: PaymentWorkflowStep
): 'completed' | 'current' | 'upcoming' {
  const completed = new Set(
    line.workflowHistory.filter((h) => h.status === 'completed').map((h) => h.step)
  );
  if (completed.has(step)) return 'completed';
  if (line.currentStep === step && line.lineStatus === 'in_progress') return 'current';
  const currentIdx = STEP_ORDER.indexOf(line.currentStep);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return 'completed';
  return 'upcoming';
}

function InvoiceWorkflowCard({
  line,
  payment,
  onAdvance,
  isAdvancing,
}: {
  line: VendorPaymentInvoiceLine;
  payment: VendorPayment;
  onAdvance: (invoiceId: string, notes?: string) => Promise<void>;
  isAdvancing: string | null;
}) {
  const [notes, setNotes] = useState('');
  const busy = isAdvancing === line.invoiceId;

  return (
    <div className="rounded-xl border border-[#E0E0E0] bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-[#212121]">{line.invoiceNumber}</p>
          <p className="text-sm text-[#757575]">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: line.currency }).format(
              line.amount
            )}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            line.lineStatus === 'completed'
              ? 'bg-green-50 text-green-700 border-green-200'
              : line.lineStatus === 'rejected'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
          }
        >
          {line.lineStatus === 'in_progress' ? line.currentStepLabel : line.lineStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {STEP_ORDER.map((step) => {
          const state = stepState(line, step);
          const meta = payment.workflowSteps.find((s) => s.key === step);
          return (
            <div
              key={step}
              className={`rounded-lg border px-3 py-2 text-xs ${
                state === 'completed'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : state === 'current'
                    ? 'border-[#14B8A6] bg-teal-50 text-teal-900'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {state === 'completed' ? (
                  <CheckCircle2 size={14} />
                ) : state === 'current' ? (
                  <Circle size={14} className="fill-[#14B8A6] text-[#14B8A6]" />
                ) : (
                  <Circle size={14} />
                )}
                {meta?.label ?? step}
              </div>
            </div>
          );
        })}
      </div>

      {line.lineStatus === 'in_progress' && (
        <div className="space-y-2 border-t border-[#E0E0E0] pt-3">
          <Label className="text-xs text-[#757575]">Notes (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Complete: ${line.currentStepLabel}`}
            className="h-9 border-[#E0E0E0]"
          />
          <Button
            type="button"
            size="sm"
            className="bg-[#14B8A6] hover:bg-[#0D9488]"
            disabled={!!busy}
            onClick={() => onAdvance(line.invoiceId, notes.trim() || undefined)}
          >
            {busy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Complete {line.currentStepLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function VendorPaymentWorkflowModal({ paymentId, open, onClose, onUpdate }: Props) {
  const [payment, setPayment] = useState<VendorPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const data = await fetchVendorPayment(paymentId);
      setPayment(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load payment');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (open && paymentId) {
      load();
    } else {
      setPayment(null);
    }
  }, [open, paymentId, load]);

  const handleAdvance = async (invoiceId: string, notes?: string) => {
    if (!paymentId) return;
    setAdvancingId(invoiceId);
    try {
      const updated = await advancePaymentWorkflowStep(paymentId, invoiceId, notes);
      setPayment(updated);
      toast.success('Workflow step completed');
      onUpdate();
      if (updated.overallStatus === 'completed') {
        toast.success('All invoices settled — payment complete');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to advance step');
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCancel = async () => {
    if (!paymentId) return;
    setCancelling(true);
    try {
      await cancelVendorPayment(paymentId, 'Cancelled from finance dashboard');
      toast.success('Payment cancelled');
      onUpdate();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const inProgress = payment?.overallStatus === 'in_progress';

  return (
    <AdminModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Payment Workflow"
      subtitle={
        payment
          ? `${payment.paymentId} · ${payment.vendorName} · ${payment.overallStatus.replace('_', ' ')}`
          : 'Loading payment workflow...'
      }
      icon={<FileText className="h-5 w-5 text-[#14B8A6]" />}
      maxWidth="w-[50vw] max-w-[50vw]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {inProgress && (
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
              disabled={cancelling || loading}
            >
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Payment
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5">
        {loading && (
          <div className="flex justify-center py-12 text-[#757575]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && payment && (
          <>
            <div className="flex flex-wrap gap-4 rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] p-4 text-sm">
              <div>
                <p className="text-[#757575]">Total</p>
                <p className="font-bold text-[#212121]">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                    payment.totalAmount
                  )}
                </p>
              </div>
              <div>
                <p className="text-[#757575]">Payment date</p>
                <p className="font-medium text-[#212121]">
                  {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[#757575]">Method</p>
                <p className="font-medium text-[#212121] capitalize">{payment.method}</p>
              </div>
              {payment.attachmentUrl && (
                <div className="ml-auto">
                  <a
                    href={payment.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#14B8A6] hover:underline font-medium"
                  >
                    View attachment <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <p className="text-sm text-[#757575]">
              Complete each step per invoice. You can stop after any step and resume later — the
              next visit continues from the current step.
            </p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {payment.invoices.map((line) => (
                <InvoiceWorkflowCard
                  key={line.invoiceId}
                  line={line}
                  payment={payment}
                  onAdvance={handleAdvance}
                  isAdvancing={advancingId}
                />
              ))}
            </div>

            {payment.overallStatus === 'completed' && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
                <CheckCircle2 size={20} />
                <span className="font-medium">Payment workflow completed for all invoices.</span>
              </div>
            )}

            {payment.overallStatus === 'cancelled' && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
                <XCircle size={20} />
                <span className="font-medium">This payment was cancelled.</span>
              </div>
            )}
          </>
        )}
      </div>
    </AdminModal>
  );
}
