import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from './types';
import { toast } from 'sonner';

interface PauseCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  alert: Alert;
}

export function PauseCampaignDialog({ isOpen, onClose, onResolve, alert }: PauseCampaignDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    toast.success("Campaign Paused", {
      description: "The campaign has been paused for the selected region."
    });
    onResolve();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pause Campaign?</DialogTitle>
          <DialogDescription>
            Are you sure you want to pause this campaign in <strong>{alert.region}</strong>? This will stop all active promotions immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
            <Label>Reason (Optional)</Label>
            <Textarea 
                placeholder="e.g. Stock shortage in region..." 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Pause Campaign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
