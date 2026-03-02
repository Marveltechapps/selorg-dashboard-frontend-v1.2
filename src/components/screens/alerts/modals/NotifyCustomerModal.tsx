import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface NotifyCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => Promise<void>;
  defaultMessage?: string;
}

export function NotifyCustomerModal({ isOpen, onClose, onConfirm, defaultMessage }: NotifyCustomerModalProps) {
  const [message, setMessage] = useState(defaultMessage || "We apologize for the delay with your order. Our team is resolving the issue.");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    await onConfirm(message);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notify Customer</DialogTitle>
          <DialogDescription>Send an SMS update to the customer regarding this alert.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            rows={4}
            placeholder="Enter message..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
