import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Loader2 } from 'lucide-react';
import { rejectRefund, RefundRequest } from './refundsApi';
import { toast } from 'sonner';

interface Props {
  refund: RefundRequest | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectRefundModal({ refund, open, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [explanation, setExplanation] = useState('');

  if (!refund) return null;

  const handleSubmit = async () => {
      if (!reasonCode) return;
      setIsLoading(true);
      try {
          const fullReason = `[${reasonCode}] ${explanation}`;
          await rejectRefund(refund.id, fullReason);
          toast.success("Refund rejected");
          onSuccess();
          onClose();
          // Reset
          setReasonCode('');
          setExplanation('');
      } catch (e) {
          toast.error("Failed to reject refund");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reject Refund Request</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The customer will be notified.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="policy_window">Outside Policy Window (14 days)</SelectItem>
                        <SelectItem value="not_eligible">Item Not Eligible for Return</SelectItem>
                        <SelectItem value="insufficient_evidence">Insufficient Evidence of Damage</SelectItem>
                        <SelectItem value="customer_abuse">Suspected Policy Abuse</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                 <Label>Explanation for Customer</Label>
                 <Textarea 
                    placeholder="Please explain why the refund is being rejected..." 
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="min-h-[100px]"
                 />
                 <p className="text-xs text-gray-500">This text will be included in the email to the customer.</p>
             </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                variant="destructive"
                disabled={isLoading || !reasonCode || !explanation}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Rejection
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
