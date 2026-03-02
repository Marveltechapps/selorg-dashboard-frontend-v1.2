import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { allocationApi } from './allocationApi';

interface TransferOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: any;
  onComplete?: () => void;
}

const SOURCE_OPTIONS = [
  { value: 'Central Warehouse', label: 'Central Warehouse' },
  { value: 'South Hub', label: 'South Hub' },
];

export function TransferOrderModal({ open, onOpenChange, sku, onComplete }: TransferOrderModalProps) {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFromLocation('');
      setToLocation('');
      setQuantity('');
      setRequiredDate('');
    }
  }, [open]);

  const handleCreateOrder = async () => {
    if (!fromLocation || !toLocation || !quantity || !sku) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await allocationApi.createTransferOrder({
        skuId: sku.id,
        skuName: sku.name,
        fromLocation,
        toLocation,
        quantity: parseInt(quantity, 10),
        requiredDate: requiredDate || undefined,
      });
      toast.success('Transfer order created', {
        description: `${quantity} units of ${sku.name} from ${fromLocation} to ${toLocation}`,
      });
      if (onComplete) onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create transfer order');
    } finally {
      setSubmitting(false);
    }
  };

  const destOptions = (sku?.locations ?? []).map((loc: any) => ({ value: loc.name, label: loc.name }));

  if (!sku) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Create Transfer Order
          </DialogTitle>
          <DialogDescription>
            Move stock for <strong>{sku.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dest." />
                </SelectTrigger>
                <SelectContent>
                  {destOptions.length > 0 ? destOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  )) : SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Required Date (ETA)</Label>
            <Input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button className="bg-[#212121] hover:bg-black text-white" onClick={handleCreateOrder} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
