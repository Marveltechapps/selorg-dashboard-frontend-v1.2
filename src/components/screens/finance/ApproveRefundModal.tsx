import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import { Textarea } from "../../ui/textarea";
import { Loader2, IndianRupee } from 'lucide-react';
import { approveRefund, RefundRequest } from './refundsApi';
import { toast } from 'sonner';

interface Props {
  refund: RefundRequest | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveRefundModal({ refund, open, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (refund) {
        setAmount(refund.amount.toString());
        setNotes('');
        setConfirmed(false);
    }
  }, [refund, open]);

  if (!refund) return null;

  const handleSubmit = async () => {
      setIsLoading(true);
      try {
          await approveRefund(refund.id, notes, parseFloat(amount));
          toast.success("Refund approved successfully");
          onSuccess();
          onClose();
      } catch (e) {
          toast.error("Failed to approve refund");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Refund</DialogTitle>
          <DialogDescription>
            Confirm refund details for Order #{refund.orderId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium text-gray-900 text-right">{refund.customerName}</span>
                    <span className="text-gray-500">Original Request:</span>
                    <span className="font-medium text-gray-900 text-right">
                         {new Intl.NumberFormat('en-IN', { style: 'currency', currency: refund.currency }).format(refund.amount)}
                    </span>
                    <span className="text-gray-500">Reason:</span>
                    <span className="font-medium text-gray-900 text-right capitalize">{refund.reasonCode.replace('_', ' ')}</span>
                </div>
             </div>

             <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount ({refund.currency})</Label>
                <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                        id="refund-amount" 
                        type="number" 
                        className="pl-9"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        max={refund.amount}
                        min={0}
                        step={0.01}
                    />
                </div>
                {parseFloat(amount) < refund.amount && (
                    <p className="text-xs text-orange-600 font-medium">This is a partial refund.</p>
                )}
             </div>

             <div className="space-y-2">
                 <Label htmlFor="notes">Internal Notes (Optional)</Label>
                 <Textarea 
                    id="notes" 
                    placeholder="Add approval notes..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                 />
             </div>

             <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="confirm" checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} />
                <label
                    htmlFor="confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    I confirm this refund complies with company policy.
                </label>
             </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                className="bg-[#14B8A6] hover:bg-[#0D9488]" 
                disabled={isLoading || !confirmed || !amount}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve Refund
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
