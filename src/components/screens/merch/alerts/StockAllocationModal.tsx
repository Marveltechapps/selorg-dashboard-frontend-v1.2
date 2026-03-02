import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from './types';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

interface StockAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  alert: Alert;
}

export function StockAllocationModal({ isOpen, onClose, onResolve, alert }: StockAllocationModalProps) {
  const [quantity, setQuantity] = useState('500');
  const [source, setSource] = useState('central');

  const handleConfirm = () => {
    if (!quantity || parseInt(quantity) <= 0) {
        toast.error("Invalid Quantity", { description: "Please enter a valid number of units to transfer." });
        return;
    }

    toast.success("Transfer Order Created", {
      description: `${quantity} units requested from ${source === 'central' ? 'Central Warehouse' : source === 'north' ? 'North Hub' : 'East Hub'}. Order #${Math.floor(100000 + Math.random() * 900000)}`
    });
    onResolve();
    onClose();
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
                <div className="text-xs text-gray-400">West End Hub</div>
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
          <Button onClick={handleConfirm}>Confirm Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
