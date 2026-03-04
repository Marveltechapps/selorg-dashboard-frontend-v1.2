import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../ui/sheet';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { ScrollArea } from '../../ui/scroll-area';
import { User, CreditCard, Clock, CheckCircle2, XCircle, CircleDot } from 'lucide-react';
import {
  PickerWithdrawalDetails,
  updatePickerWithdrawal,
} from './pickerWithdrawalsApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  withdrawal: PickerWithdrawalDetails | null;
  open: boolean;
  onClose: () => void;
  onApprove: (w: PickerWithdrawalDetails) => void;
  onReject: (w: PickerWithdrawalDetails) => void;
  onMarkPaid: (w: PickerWithdrawalDetails) => void;
  onRefresh?: () => void;
}

export function PickerPayoutDetailsDrawer({
  withdrawal,
  open,
  onClose,
  onApprove,
  onReject,
  onMarkPaid,
  onRefresh,
}: Props) {
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'mark_paid' | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async () => {
    if (!withdrawal) return;
    setActionLoading('approve');
    try {
      await updatePickerWithdrawal(withdrawal.id, 'approve');
      toast.success('Withdrawal approved');
      onRefresh?.();
      onClose();
      onApprove(withdrawal);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!withdrawal || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setActionLoading('reject');
    try {
      await updatePickerWithdrawal(withdrawal.id, 'reject', rejectReason);
      toast.success('Withdrawal rejected');
      onRefresh?.();
      onClose();
      setShowRejectReason(false);
      setRejectReason('');
      onReject(withdrawal);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!withdrawal) return;
    setActionLoading('mark_paid');
    try {
      await updatePickerWithdrawal(withdrawal.id, 'mark_paid');
      toast.success('Withdrawal marked as paid');
      onRefresh?.();
      onClose();
      onMarkPaid(withdrawal);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to mark as paid');
    } finally {
      setActionLoading(null);
    }
  };

  if (!withdrawal) return null;

  const STATUS_BADGE_CLASS: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Withdrawal Request
            </span>
            <Badge
              variant="outline"
              className={cn(
                'ml-auto capitalize',
                STATUS_BADGE_CLASS[withdrawal.status] || 'bg-gray-50 text-gray-700'
              )}
            >
              {withdrawal.status}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-bold text-gray-900">
            ₹{withdrawal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </SheetTitle>
          <SheetDescription className="hidden">
            Withdrawal request details for {withdrawal.pickerName}
          </SheetDescription>
        </div>

        <ScrollArea
          className="flex-1 overflow-y-auto"
          style={{ height: 'calc(100vh - 220px)', maxHeight: 'calc(100vh - 220px)' }}
        >
          <div className="p-6 space-y-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                <User size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{withdrawal.pickerName}</h4>
                {withdrawal.pickerPhone && (
                  <p className="text-sm text-gray-500">{withdrawal.pickerPhone}</p>
                )}
                {withdrawal.pickerEmail && (
                  <p className="text-xs text-gray-400">{withdrawal.pickerEmail}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Picker ID: {withdrawal.pickerId}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard size={18} /> Bank Details
              </h4>
              {withdrawal.bankDetails ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Holder</span>
                    <span className="font-medium">{withdrawal.bankDetails.accountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-mono font-medium">{withdrawal.bankDetails.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IFSC</span>
                    <span className="font-mono">{withdrawal.bankDetails.ifscCode}</span>
                  </div>
                  {withdrawal.bankDetails.bankName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-medium">{withdrawal.bankDetails.bankName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No bank details available</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock size={18} /> Status Timeline
              </h4>
              {withdrawal.timeline && withdrawal.timeline.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                  {['requested', 'approved', 'paid', 'rejected'].map((stage, idx) => {
                    const entry = withdrawal.timeline.find((t) => t.stage === stage);
                    const isCompleted = !!entry?.timestamp;
                    const isRejected = stage === 'rejected' && withdrawal.status === 'REJECTED';
                    const isCurrent =
                      stage === 'requested' ||
                      (stage === 'approved' && withdrawal.status === 'APPROVED') ||
                      (stage === 'paid' && withdrawal.status === 'PAID');
                    return (
                      <div key={stage} className="relative flex items-start gap-3 pb-4">
                        <div
                          className={cn(
                            'w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white',
                            isCompleted
                              ? isRejected
                                ? 'border-red-500 bg-red-500'
                                : 'border-green-500 bg-green-500'
                              : isCurrent
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300'
                          )}
                        >
                          {isCompleted ? (
                            isRejected ? (
                              <XCircle size={14} className="text-white" />
                            ) : (
                              <CheckCircle2 size={14} className="text-white" />
                            )
                          ) : isCurrent ? (
                            <CircleDot size={14} className="text-blue-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm font-medium capitalize',
                              isCompleted
                                ? isRejected
                                  ? 'text-red-700'
                                  : 'text-green-700'
                                : isCurrent
                                  ? 'text-blue-700'
                                  : 'text-gray-400'
                            )}
                          >
                            {stage}
                          </p>
                          {entry?.timestamp && (
                            <p className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          )}
                          {stage === 'rejected' && withdrawal.rejectedReason && (
                            <p className="text-xs text-red-600 mt-1">{withdrawal.rejectedReason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No timeline data</p>
              )}
            </div>

            {withdrawal.walletLedger && withdrawal.walletLedger.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Wallet Ledger (Recent)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {withdrawal.walletLedger.slice(0, 10).map((t) => (
                        <tr key={t.id}>
                          <td className="px-4 py-2 capitalize">{t.type}</td>
                          <td
                            className={cn(
                              'px-4 py-2 text-right font-medium',
                              t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {t.type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          {showRejectReason ? (
            <>
              <textarea
                className="w-full p-3 border rounded-lg text-sm"
                placeholder="Enter rejection reason (required)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectReason(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={actionLoading === 'reject' || !rejectReason.trim()}
                >
                  {actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {withdrawal.status === 'PENDING' && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowRejectReason(true)}
                  >
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button
                    className="flex-1 bg-[#14B8A6] hover:bg-[#0D9488]"
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Approve
                  </Button>
                </div>
              )}
              {withdrawal.status === 'APPROVED' && (
                <Button
                  className="w-full bg-[#14B8A6] hover:bg-[#0D9488]"
                  onClick={handleMarkPaid}
                  disabled={actionLoading === 'mark_paid'}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Mark Paid
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
