import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { campaignsApi } from '../merchApi';
import { allocationApi } from './allocationApi';

interface ClearancePromoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: any;
  onComplete?: () => void;
}

export function ClearancePromoModal({ open, onOpenChange, alert, onComplete }: ClearancePromoModalProps) {
  const [campaignName, setCampaignName] = useState('');
  const [discount, setDiscount] = useState('50');
  const [duration, setDuration] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (alert) {
      setCampaignName(`Clearance: ${alert.sku}`);
      setDiscount('50');
      setDuration('3');
    }
  }, [alert, open]);

  const handleLaunchCampaign = async () => {
    if (!campaignName || !discount || !duration || !alert) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const campaignData = {
        name: campaignName,
        tagline: `Clearance: ${alert.sku} - ${discount}% off`,
        status: 'Active',
        period: `${new Date().toLocaleDateString()} - ${new Date(Date.now() + parseInt(duration, 10) * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        target: alert.sku,
        scope: 'Local',
        type: 'Flash Sale',
        owner: { name: 'System', initial: 'S' },
        kpi: { label: 'Revenue Uplift', value: '0%', trend: 'neutral' },
        discount: parseInt(discount, 10),
        duration: parseInt(duration, 10),
        batch: alert.batch
      };
      const result = await campaignsApi.createCampaign(campaignData);
      if (result?.success ?? result?.data) {
        await allocationApi.dismissAlert(alert._id ?? alert.id ?? '');
        toast.success('Campaign launched', { description: `${campaignName} - ${discount}% off for ${duration} days` });
        if (onComplete) onComplete();
        onOpenChange(false);
      } else {
        toast.error('Failed to launch campaign');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gray-50/50">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Megaphone className="h-4 w-4 text-[#7C3AED]" /> Create Clearance Promo
          </DialogTitle>
          <DialogDescription className="text-[10px]">
             Clear expiring stock for <strong>{alert.sku}</strong> (Batch #{alert.batch})
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
             <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-gray-500">Campaign Name</Label>
                <Input 
                  value={campaignName} 
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="h-8 text-[11px]" 
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-500">Discount %</Label>
                    <Input 
                      type="number" 
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-8 text-[11px]" 
                    />
                 </div>
                 <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-500">Duration (Days)</Label>
                    <Input 
                      type="number" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="h-8 text-[11px]" 
                    />
                 </div>
             </div>
             <div className="p-2.5 bg-yellow-50 text-yellow-800 rounded-md text-[10px] border border-yellow-100 italic">
                <p><strong>Recommendation:</strong> Run for 3 days at 50% off to clear 400 units before expiry.</p>
             </div>
        </div>

        <DialogFooter className="p-3 bg-gray-50 border-t gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] h-7 text-[10px] font-bold" onClick={handleLaunchCampaign} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Launch Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
