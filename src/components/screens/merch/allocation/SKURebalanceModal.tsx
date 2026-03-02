import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { allocationApi } from './allocationApi';

interface SKURebalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: any;
  onComplete?: () => void;
}

export function SKURebalanceModal({ open, onOpenChange, sku, onComplete }: SKURebalanceModalProps) {
  const [step, setStep] = useState('strategy');
  const [selectedStrategy, setSelectedStrategy] = useState('sales');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('strategy');
      setSelectedStrategy('sales');
    }
  }, [open]);

  const handleConfirmRebalance = async () => {
    if (!sku?.locations?.length) {
      toast.error('No locations to rebalance');
      return;
    }
    setSubmitting(true);
    try {
      const totalStock = sku.locations.reduce((s: number, l: any) => s + (l.onHand ?? 0), 0);
      const perLoc = Math.floor(totalStock / sku.locations.length);
      const updates = sku.locations.map((loc: any, i: number) => {
        const newTarget = i === sku.locations.length - 1 ? totalStock - perLoc * (sku.locations.length - 1) : perLoc;
        return {
          allocationId: loc.allocationId ?? loc.id,
          allocated: newTarget,
          target: newTarget,
        };
      }).filter((u: any) => u.allocationId);
      if (updates.length > 0) {
        await allocationApi.rebalance(updates);
      }
      toast.success('Rebalance confirmed', { description: `Rebalancing ${sku.name} across locations` });
      if (onComplete) onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rebalance');
    } finally {
      setSubmitting(false);
    }
  };

  if (!sku) return null;

  const totalStock = sku.locations?.reduce((s: number, l: any) => s + (l.onHand ?? 0), 0) ?? 0;
  const perLoc = sku.locations?.length ? Math.floor(totalStock / sku.locations.length) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Rebalance: {sku.name}
          </DialogTitle>
          <DialogDescription>
            Redistribute stock across locations.
          </DialogDescription>
        </DialogHeader>

        {step === 'strategy' ? (
          <div className="py-4 space-y-4">
            <Label>Select Rebalancing Strategy</Label>
            <RadioGroup value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="sales" id="s1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="s1" className="cursor-pointer font-bold">Proportional to Sales</Label>
                  <p className="text-sm text-gray-500">Based on last 4 weeks performance.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="margin" id="s2" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="s2" className="cursor-pointer font-bold">Prioritize High Margin</Label>
                  <p className="text-sm text-gray-500">Send stock to most profitable stores.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="equal" id="s3" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="s3" className="cursor-pointer font-bold">Equal Split</Label>
                  <p className="text-sm text-gray-500">Distribute evenly across active locations.</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="p-3 bg-blue-50 text-blue-800 rounded border border-blue-100 text-sm">
              Proposed plan distributes <strong>{totalStock} units</strong> across {sku.locations?.length ?? 0} locations (~{perLoc} each).
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sku.locations ?? []).map((loc: any, i: number) => {
                  const current = loc.onHand ?? loc.allocated ?? 0;
                  const newVal = i === (sku.locations?.length ?? 0) - 1 ? totalStock - perLoc * ((sku.locations?.length ?? 0) - 1) : perLoc;
                  const diff = newVal - current;
                  return (
                    <TableRow key={loc.id}>
                      <TableCell>{loc.name}</TableCell>
                      <TableCell className="text-right">{current}</TableCell>
                      <TableCell className="text-right font-bold">{newVal}</TableCell>
                      <TableCell className={`text-right ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          {step === 'strategy' ? (
            <Button onClick={() => setStep('preview')}>Preview Plan</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('strategy')} disabled={submitting}>Back</Button>
              <Button className="bg-[#7C3AED]" onClick={handleConfirmRebalance} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Rebalance
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
