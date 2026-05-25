import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from './types';
import { alertsApi } from './alertsApi';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';

interface StockAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  alert: Alert;
}

const SOURCE_LABELS: Record<string, string> = {
  central: 'Central Warehouse',
  north: 'North Hub',
  east: 'East Hub',
};

export function StockAllocationModal({ isOpen, onClose, onResolve, alert }: StockAllocationModalProps) {
  const [quantity, setQuantity] = useState('500');
  const [source, setSource] = useState('central');
  const [submitting, setSubmitting] = useState(false);
  const destStore = alert.linkedEntities?.store ?? 'West End Hub';

  const handleConfirm = async () => {
    if (!quantity || parseInt(quantity, 10) <= 0) {
      toast.error('Invalid Quantity', { description: 'Please enter a valid number of units to transfer.' });
      return;
    }
    const alertId = alert.id || (alert as { _id?: string })._id;
    if (!alertId) return;
    setSubmitting(true);
    try {
      const resp = await alertsApi.allocateStock(String(alertId), {
        source: SOURCE_LABELS[source] ?? source,
        quantity: parseInt(quantity, 10),
        toLocation: destStore,
      });
      const ref =
        resp?.data?.transferOrder?.referenceNumber ??
        resp?.data?.transferOrder?.transferId ??
        '';
      toast.success('Transfer Order Created', {
        description: `${quantity} units from ${SOURCE_LABELS[source]} to ${destStore}${ref ? `. Ref: ${ref}` : ''}`,
      });
      onResolve();
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      toast.error(msg || 'Failed to create transfer order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Allocate Stock</DialogTitle>
          <DialogDescription>
            Initiate an emergency stock transfer to prevent campaign stalling.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4 items-center">
            <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xs text-gray-500 uppercase">Current Stock</div>
                <div className="text-xl font-bold text-red-600">42</div>
                <div className="text-xs text-gray-400">{destStore}</div>
            </div>
             <div className="flex justify-center text-gray-300">
                <ArrowRight />
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xs text-gray-500 uppercase">Target</div>
                <div className="text-xl font-bold text-green-600">500</div>
                <div className="text-xs text-gray-400">Safety Threshold</div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Source Warehouse</Label>
                <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="central">Central Warehouse (2,500 available)</SelectItem>
                        <SelectItem value="north">North Hub (Overstocked)</SelectItem>
                        <SelectItem value="east">East Hub (Standard)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Transfer Quantity</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <p className="text-xs text-gray-500">Estimated arrival: 4 hours</p>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
