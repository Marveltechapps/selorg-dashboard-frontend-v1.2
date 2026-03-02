import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { allocationApi } from './allocationApi';

interface AllocateStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: any;
  onComplete?: () => void;
}

export function AllocateStockModal({ open, onOpenChange, alert, onComplete }: AllocateStockModalProps) {
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({ 'central': true });
  const [quantities, setQuantities] = useState<Record<string, number>>({ 'central': 50 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedSources({ 'central': true });
      setQuantities({ 'central': 50 });
    }
  }, [open]);

  const handleConfirmTransfer = async () => {
    const totalQty = Object.keys(selectedSources).reduce((acc, key) =>
      selectedSources[key] ? acc + (quantities[key] || 0) : acc, 0
    );

    if (totalQty === 0) {
      toast.error('Please select at least one source and enter a quantity');
      return;
    }

    if (!alert) return;

    setSubmitting(true);
    try {
      await allocationApi.createTransferOrder({
        skuId: alert.skuId ?? alert.sku,
        skuName: alert.sku,
        fromLocation: 'Central Warehouse',
        toLocation: alert.location,
        quantity: totalQty,
      });
      await allocationApi.dismissAlert(alert._id ?? alert.id ?? '');
      toast.success('Transfer confirmed', {
        description: `Transferring ${totalQty} units of ${alert.sku} to ${alert.location}`,
      });
      if (onComplete) onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create transfer');
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
            <Truck className="h-4 w-4 text-[#7C3AED]" /> Allocate Stock
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Replenish <strong>{alert.sku}</strong> for <strong>{alert.location}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="bg-red-50 p-2 rounded-md border border-red-100 text-[10px] flex justify-between items-center">
            <span className="text-red-800 font-medium">Current Stock: <strong>—</strong></span>
            <span className="text-red-800 font-medium">Safety Target: <strong>—</strong></span>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-gray-500">Select Source Location(s)</Label>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 h-7">
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead className="text-[9px] uppercase font-black">Source</TableHead>
                    <TableHead className="text-right text-[9px] uppercase font-black">Avail.</TableHead>
                    <TableHead className="text-right w-[80px] text-[9px] uppercase font-black">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="h-8">
                    <TableCell className="py-1 px-2">
                      <Checkbox
                        checked={!!selectedSources['central']}
                        onCheckedChange={(c) => setSelectedSources({ ...selectedSources, 'central': !!c })}
                        className="h-3 w-3"
                      />
                    </TableCell>
                    <TableCell className="font-bold text-[10px] py-1 px-2">Central Warehouse</TableCell>
                    <TableCell className="text-right text-gray-400 text-[10px] py-1 px-2">—</TableCell>
                    <TableCell className="py-1 px-2">
                      <Input
                        className="h-6 w-16 text-right px-1 text-[10px]"
                        value={quantities['central']}
                        onChange={(e) => setQuantities({ ...quantities, 'central': parseInt(e.target.value, 10) || 0 })}
                        disabled={!selectedSources['central']}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow className="h-8">
                    <TableCell className="py-1 px-2">
                      <Checkbox
                        checked={!!selectedSources['south']}
                        onCheckedChange={(c) => setSelectedSources({ ...selectedSources, 'south': !!c })}
                        className="h-3 w-3"
                      />
                    </TableCell>
                    <TableCell className="font-bold text-[10px] py-1 px-2">South Hub</TableCell>
                    <TableCell className="text-right text-gray-400 text-[10px] py-1 px-2">—</TableCell>
                    <TableCell className="py-1 px-2">
                      <Input
                        className="h-6 w-16 text-right px-1 text-[10px]"
                        value={quantities['south'] ?? ''}
                        onChange={(e) => setQuantities({ ...quantities, 'south': parseInt(e.target.value, 10) || 0 })}
                        disabled={!selectedSources['south']}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 border-t">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total to Transfer:</span>
            <span className="text-sm font-black text-[#7C3AED]">
              {Object.keys(selectedSources).reduce((acc, key) => selectedSources[key] ? acc + (quantities[key] || 0) : acc, 0)} units
            </span>
          </div>
        </div>

        <DialogFooter className="p-3 bg-gray-50 border-t gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] h-7 text-[10px] font-bold" onClick={handleConfirmTransfer} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
