import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LiveTransaction } from './financeApi';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, CheckCircle2, XCircle, Clock, ShieldCheck, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Props {
  transaction: LiveTransaction | null;
  onClose: () => void;
  onViewReconciliation?: (txn: LiveTransaction) => void;
  onViewCustomerHistory?: (txn: LiveTransaction) => void;
}

const STATUS_STYLES = {
  success: { icon: CheckCircle2, color: 'text-green-600', badge: 'bg-green-50 text-green-700 border-green-200' },
  failed: { icon: XCircle, color: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' },
  pending: { icon: Clock, color: 'text-yellow-600', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
} as const;

export function TransactionDetailsDrawer({
  transaction,
  onClose,
  onViewReconciliation,
  onViewCustomerHistory,
}: Props) {
  if (!transaction) return null;

  const status = STATUS_STYLES[transaction.status];
  const StatusIcon = status.icon;

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  return (
    <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col h-full gap-0 overflow-hidden w-[min(100vw-1rem,28rem)] sm:w-[30vw] sm:max-w-[32rem] sm:min-w-[22rem]"
      >
        <SheetHeader className="shrink-0 px-6 pt-6 pb-5 pr-14 border-b border-[#E0E0E0] space-y-2 text-left">
          <p className="text-xs font-semibold tracking-wider text-[#757575] uppercase">
            Transaction Details
          </p>
          <SheetTitle className="text-xl font-mono text-[#212121] flex items-center gap-2 leading-tight">
            {transaction.txnId}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              type="button"
              onClick={() => navigator.clipboard.writeText(transaction.txnId)}
            >
              <Copy size={14} />
            </Button>
          </SheetTitle>
          <SheetDescription className="text-sm text-[#757575] leading-relaxed">
            Processed via {transaction.gateway} on{' '}
            {new Date(transaction.createdAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-6">
            <div className="bg-[#F5F7FA] p-5 rounded-xl border border-[#E0E0E0] flex justify-between items-center gap-4">
              <div>
                <p className="text-sm text-[#757575] mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-[#212121]">
                  {formatAmount(transaction.amount, transaction.currency)}
                </p>
              </div>
              <div className={cn('flex flex-col items-end', status.color)}>
                <StatusIcon size={32} className="mb-1 shrink-0" />
                <Badge variant="outline" className={cn('uppercase text-xs font-semibold', status.badge)}>
                  {transaction.status}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#212121] mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-[#757575]" />
                Payment Method
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                <div className="space-y-1">
                  <p className="text-[#757575]">Method</p>
                  <p className="font-medium text-[#212121]">{transaction.methodDisplay}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#757575]">Card / Account</p>
                  <p className="font-medium font-mono text-[#212121] break-all">
                    {transaction.maskedDetails || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#757575]">Gateway</p>
                  <p className="font-medium text-[#212121] capitalize">{transaction.gateway}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#757575]">Risk Check</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                    <ShieldCheck size={12} />
                    Passed
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="bg-[#E0E0E0]" />

            <div>
              <h4 className="font-semibold text-[#212121] mb-4">Order Context</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                <div className="space-y-1">
                  <p className="text-[#757575]">Order ID</p>
                  {transaction.orderId ? (
                    <p className="font-medium font-mono text-blue-600 break-all">{transaction.orderId}</p>
                  ) : (
                    <p className="text-[#9E9E9E]">—</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[#757575]">Customer</p>
                  <p className="font-medium text-[#212121]">{transaction.customerName || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 px-6 py-5 border-t border-[#E0E0E0] bg-white space-y-3">
          <Button
            variant="outline"
            className="w-full justify-between h-11"
            onClick={() => onViewReconciliation?.(transaction)}
          >
            View in Reconciliation
            <ExternalLink size={16} />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between h-11"
            onClick={() => onViewCustomerHistory?.(transaction)}
          >
            View Customer History
            <ExternalLink size={16} />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
