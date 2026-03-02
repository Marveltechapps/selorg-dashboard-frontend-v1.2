import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Checkbox } from "../../ui/checkbox";
import { CustomerPayment } from './customerPaymentsApi';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "../../ui/alert";

interface Props {
  payment: CustomerPayment | null;
  onClose: () => void;
  onConfirm: (id: string, amount: number) => Promise<void>;
  open: boolean;
}

export function RetryPaymentModal({ payment, onClose, onConfirm, open }: Props) {
  const [amount, setAmount] = useState<string>(payment ? payment.amount.toString() : '');
  const [method, setMethod] = useState<'same' | 'link'>('same');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when payment changes
  React.useEffect(() => {
    if (payment) {
        setAmount(payment.amount.toString());
        setMethod('same');
        setConfirmed(false);
        setError(null);
        setIsLoading(false);
    }
  }, [payment]);

  if (!payment) return null;

  const handleConfirm = async () => {
    if (!confirmed) return;
    setIsLoading(true);
    setError(null);
    try {
        await onConfirm(payment.id, parseFloat(amount));
        onClose();
    } catch (e) {
        setError("Failed to retry payment. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Retry Payment</DialogTitle>
          <DialogDescription>
            Attempt to capture payment again for Order #{payment.orderId}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <Input 
                    id="amount" 
                    type="number" 
                    className="pl-7" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                />
            </div>
          </div>
          
          <div className="grid gap-3">
             <Label>Payment Method</Label>
             <RadioGroup value={method} onValueChange={(v: 'same' | 'link') => setMethod(v)}>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <RadioGroupItem value="same" id="r1" />
                    <Label htmlFor="r1" className="cursor-pointer flex-1">
                        Use {payment.paymentMethodDisplay}
                        <span className="block text-xs text-gray-500 font-normal">Charge the saved payment method</span>
                    </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <RadioGroupItem value="link" id="r2" />
                    <Label htmlFor="r2" className="cursor-pointer flex-1">
                        Send Payment Link
                        <span className="block text-xs text-gray-500 font-normal">Email customer a secure checkout link</span>
                    </Label>
                </div>
             </RadioGroup>
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox id="terms" checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} />
            <Label htmlFor="terms" className="text-sm font-normal text-gray-600 leading-tight cursor-pointer">
              I confirm that the customer has agreed to this retry attempt or that this is within our retry policy guidelines.
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!confirmed || isLoading}
            className="bg-[#14B8A6] hover:bg-[#0D9488]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {method === 'same' ? 'Retry Charge' : 'Send Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
