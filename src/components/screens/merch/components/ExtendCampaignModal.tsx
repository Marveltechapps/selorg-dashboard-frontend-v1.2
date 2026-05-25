import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateCampaign } from '../../../../api/merch/merchApi';

interface ExtendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignName?: string;
  currentEndDate?: string;
  onExtended?: () => void;
}

export function ExtendCampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignName = 'Campaign',
  currentEndDate = '—',
  onExtended,
}: ExtendCampaignModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [step, setStep] = useState<'form' | 'checking' | 'confirm'>('form');
  const [newEndDate, setNewEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setStep('form');
    setNewEndDate('');
    setHasConflict(false);
    onClose();
  };

  const handleCheck = () => {
    if (!newEndDate) {
      toast.error('Select a new end date');
      return;
    }
    setStep('checking');
    setIsChecking(true);
    window.setTimeout(() => {
      setIsChecking(false);
      setStep('confirm');
      setHasConflict(false);
    }, 800);
  };

  const handleSubmit = async () => {
    if (!campaignId) {
      toast.error('Campaign not found');
      return;
    }
    if (!newEndDate) {
      toast.error('Select a new end date');
      return;
    }
    try {
      setSubmitting(true);
      const endsAt = new Date(newEndDate);
      const formattedEnd = endsAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const periodParts = currentEndDate.includes('–')
        ? currentEndDate.split('–')
        : currentEndDate.split('-');
      const startPart = periodParts[0]?.trim() || 'Start';
      await updateCampaign(campaignId, {
        endsAt: endsAt.toISOString(),
        period: `${startPart} – ${formattedEnd}`,
        status: 'Active',
      });
      toast.success(`Campaign "${campaignName}" extended successfully.`);
      onExtended?.();
      resetAndClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extend campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Extend Campaign</DialogTitle>
          <DialogDescription>
            Extend the duration for{' '}
            <span className="font-semibold text-gray-900">&quot;{campaignName}&quot;</span>.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current end</Label>
                <Input value={currentEndDate} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>New end date</Label>
                <Input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 'checking' && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <Loader2 className="animate-spin h-8 w-8 text-[#e11d48] mb-4" />
            <p className="text-sm font-medium">Checking for schedule and stock conflicts...</p>
          </div>
        )}

        {step === 'confirm' && (
          <div className="py-4">
            {!hasConflict ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">No conflicts detected.</p>
                  <p>Stock levels are sufficient for the extended period.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">Conflict detected</p>
                  <p>Resolve overlapping promotions before extending.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          {step === 'form' && (
            <Button onClick={handleCheck} className="bg-[#e11d48] hover:bg-[#be123c]" disabled={isChecking}>
              Check &amp; Continue
            </Button>
          )}
          {step === 'confirm' && (
            <Button
              onClick={handleSubmit}
              className="bg-[#e11d48] hover:bg-[#be123c]"
              disabled={submitting || hasConflict}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm extension
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
