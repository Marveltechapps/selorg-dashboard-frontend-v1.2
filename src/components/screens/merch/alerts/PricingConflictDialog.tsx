import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert } from './types';
import { toast } from 'sonner';

interface PricingConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  alert: Alert;
}

export function PricingConflictDialog({ isOpen, onClose, onResolve, alert }: PricingConflictDialogProps) {
  const [resolutionType, setResolutionType] = useState('adjust');
  const [marginAdjustment, setMarginAdjustment] = useState(10); // Dummy value for slider

  const handleConfirm = () => {
    toast.success("Pricing conflict resolved", {
      description: "Campaign parameters have been updated successfully."
    });
    onResolve();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Resolve Pricing Conflict</DialogTitle>
          <DialogDescription className="text-sm">
            Two campaigns are applying discounts to the same SKU simultaneously.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="border p-3 rounded bg-white shadow-sm">
              <div className="font-bold text-sm text-gray-900">Campaign A</div>
              <div className="text-[11px] text-gray-500 font-medium">Summer Sale</div>
              <div className="text-sm font-black text-red-600 mt-1.5">-20% Discount</div>
              <div className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Priority: High</div>
            </div>
            <div className="border p-3 rounded bg-white shadow-sm">
              <div className="font-bold text-sm text-gray-900">Campaign B</div>
              <div className="text-[11px] text-gray-500 font-medium">Dairy Promo</div>
              <div className="text-sm font-black text-red-600 mt-1.5">-15% Discount</div>
              <div className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Priority: Medium</div>
            </div>
            <div className="col-span-2 text-center text-xs font-black text-red-700 bg-red-50 p-2.5 rounded border border-red-100 uppercase tracking-tight">
              Combined Impact: -35% (Below -30% margin threshold)
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Resolution Strategy</Label>
            <RadioGroup value={resolutionType} onValueChange={setResolutionType} className="space-y-2">
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <RadioGroupItem value="keep_a" id="keep_a" />
                <Label htmlFor="keep_a" className="cursor-pointer flex-1">
                  <span className="font-bold text-sm">Keep only Campaign A</span>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">Disables Campaign B for this SKU. Margin: <span className="text-green-600">+15%</span></p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <RadioGroupItem value="keep_b" id="keep_b" />
                <Label htmlFor="keep_b" className="cursor-pointer flex-1">
                  <span className="font-bold text-sm">Keep only Campaign B</span>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">Disables Campaign A for this SKU. Margin: <span className="text-green-600">+20%</span></p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <RadioGroupItem value="adjust" id="adjust" />
                <Label htmlFor="adjust" className="cursor-pointer flex-1">
                  <span className="font-bold text-sm">Adjust Discount Values</span>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">Manually set a combined cap for both.</p>
                </Label>
              </div>
            </RadioGroup>

            {resolutionType === 'adjust' && (
              <div className="space-y-4 p-5 border rounded-xl bg-gray-50/50 mt-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-gray-600">Max Combined Discount</Label>
                  <span className="text-lg font-black text-primary">{marginAdjustment}%</span>
                </div>
                <Slider
                  value={[marginAdjustment]}
                  onValueChange={(vals) => setMarginAdjustment(vals[0])}
                  max={35}
                  min={5}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-gray-400">Min: 5%</span>
                  <span className="text-blue-600">Projected Margin: {40 - marginAdjustment}%</span>
                  <span className="text-gray-400">Max: 35%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-gray-50/50">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs font-bold">Cancel</Button>
          <Button onClick={handleConfirm} className="h-9 text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9]">Apply Resolution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
