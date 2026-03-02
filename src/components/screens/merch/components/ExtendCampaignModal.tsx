import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExtendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName?: string;
}

export function ExtendCampaignModal({ isOpen, onClose, campaignName = "Summer Essentials" }: ExtendCampaignModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [step, setStep] = useState<'form' | 'checking' | 'confirm'>('form');

  const handleCheck = () => {
    setStep('checking');
    setTimeout(() => {
        // Simulate check
        setStep('confirm');
        setHasConflict(false); 
    }, 1500);
  };

  const handleSubmit = () => {
    toast.success(`Campaign "${campaignName}" extended successfully.`);
    onClose();
    setStep('form');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Extend Campaign</DialogTitle>
          <DialogDescription>
            Extend the duration for <span className="font-semibold text-gray-900">"{campaignName}"</span>.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Current End Date</Label>
                    <Input value="Aug 31, 2024" disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                    <Label>New End Date</Label>
                    <Input type="date" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Adjust Budget (Optional)</Label>
                <Input type="number" placeholder="Additional Budget" />
            </div>
            </div>
        )}

        {step === 'checking' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
                <Loader2 className="animate-spin h-8 w-8 text-[#7C3AED] mb-4" />
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
                            <p className="font-bold">Conflict Detected</p>
                            <p>Overlap with "Back to School" campaign on 3 SKUs.</p>
                        </div>
                    </div>
                )}
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === 'form' && (
            <Button onClick={handleCheck} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                Check & Continue
            </Button>
          )}
          {step === 'confirm' && (
            <Button onClick={handleSubmit} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                Submit for Approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
