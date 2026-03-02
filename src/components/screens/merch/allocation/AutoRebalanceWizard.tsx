import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { allocationApi } from './allocationApi';

interface AutoRebalanceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const STEPS = [
  { id: 'scope', label: 'Scope' },
  { id: 'objective', label: 'Objective' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'preview', label: 'Preview' },
];

export function AutoRebalanceWizard({ open, onOpenChange, onComplete }: AutoRebalanceWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
        if (step === 2) {
            // Simulate calculation delay before preview
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                setStep(step + 1);
            }, 1000);
        } else {
            setStep(step + 1);
        }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Scope
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
                <Label className="text-base font-semibold">Which SKUs to rebalance?</Label>
                <RadioGroup defaultValue="high-priority">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="r1" />
                        <Label htmlFor="r1">All SKUs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high-priority" id="r2" />
                        <Label htmlFor="r2">High Priority SKUs only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="category" id="r3" />
                        <Label htmlFor="r3">Specific Categories</Label>
                    </div>
                </RadioGroup>
            </div>
            
            <div className="space-y-3">
                <Label className="text-base font-semibold">Geographic Scope</Label>
                <Select defaultValue="region">
                    <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="region">Current Region (North America)</SelectItem>
                        <SelectItem value="zone">Specific Zones</SelectItem>
                        <SelectItem value="hubs">Specific Hubs</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        );
      
      case 1: // Objective
        return (
          <div className="space-y-6 py-4">
             <div className="space-y-3">
                <Label className="text-base font-semibold">Optimization Goal</Label>
                <RadioGroup defaultValue="minimize-stockouts">
                    <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="minimize-stockouts" id="o1" className="mt-1" />
                        <div>
                            <Label htmlFor="o1" className="font-bold cursor-pointer">Minimize Stockouts</Label>
                            <p className="text-sm text-gray-500">Prioritize moving stock to locations projected to run out soon.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="balance-forecast" id="o2" className="mt-1" />
                        <div>
                            <Label htmlFor="o2" className="font-bold cursor-pointer">Balance Stock vs Forecast</Label>
                            <p className="text-sm text-gray-500">Align inventory days of cover across all locations.</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="promo-priority" id="o3" className="mt-1" />
                        <div>
                            <Label htmlFor="o3" className="font-bold cursor-pointer">Prioritize Promo Locations</Label>
                            <p className="text-sm text-gray-500">Ensure locations with active campaigns are fully stocked.</p>
                        </div>
                    </div>
                </RadioGroup>
             </div>
             
             <div className="flex items-center space-x-2 border-t pt-4">
                <Checkbox id="cross-region" />
                <label
                    htmlFor="cross-region"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Allow cross-region transfers (Global mode only)
                </label>
             </div>
          </div>
        );

      case 2: // Constraints
        return (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Max Transfers per SKU</Label>
                    <Select defaultValue="5">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="unlimited">Unlimited</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Min Transfer Quantity</Label>
                    <Select defaultValue="10">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 unit</SelectItem>
                            <SelectItem value="10">10 units</SelectItem>
                            <SelectItem value="50">50 units</SelectItem>
                            <SelectItem value="100">100 units</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                <p className="font-bold mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Chilled items will not be moved after 6 PM local time.</li>
                    <li>Transfers costing &gt; ₹500 in logistics will require approval.</li>
                </ul>
            </div>
          </div>
        );

      case 3: // Preview
        return (
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                    <p className="text-xs text-green-800 uppercase font-bold">Stockouts Prevented</p>
                    <p className="text-2xl font-bold text-green-700">14</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Transfers</p>
                    <p className="text-2xl font-bold text-gray-700">43</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold">Cost Estimate</p>
                    <p className="text-2xl font-bold text-gray-700">₹240</p>
                </div>
             </div>

             <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">ETA</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Cola Can 330ml</TableCell>
                            <TableCell>Central Warehouse</TableCell>
                            <TableCell>North Hub</TableCell>
                            <TableCell className="text-right">500</TableCell>
                            <TableCell className="text-right">4h</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Chips Party Pack</TableCell>
                            <TableCell>South Hub</TableCell>
                            <TableCell>Westside Hub</TableCell>
                            <TableCell className="text-right">120</TableCell>
                            <TableCell className="text-right">2h</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-medium">Milk (Full Cream)</TableCell>
                            <TableCell>Main Dairy Depot</TableCell>
                            <TableCell>City Center</TableCell>
                            <TableCell className="text-right">50</TableCell>
                            <TableCell className="text-right">1h</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
             </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto Rebalance Stock</DialogTitle>
          <DialogDescription>Automatically redistribute inventory to optimize availability.</DialogDescription>
        </DialogHeader>

        {/* Steps */}
        <div className="flex justify-between px-8 py-4 relative">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 -translate-y-1/2" />
             {STEPS.map((s, i) => {
                const isActive = i === step;
                const isCompleted = i < step;
                return (
                    <div key={s.id} className="flex flex-col items-center gap-2 bg-white px-2 z-10">
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors border-2",
                            isActive ? "border-black bg-black text-white" : 
                            isCompleted ? "border-black bg-white text-black" : 
                            "border-gray-200 bg-white text-gray-400"
                        )}>
                            {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                        </div>
                        <span className={cn(
                            "text-xs font-medium",
                            isActive ? "text-black" : "text-gray-400"
                        )}>{s.label}</span>
                    </div>
                );
             })}
        </div>

        {loading ? (
             <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Calculating optimal distribution...</p>
             </div>
        ) : (
            <ScrollArea className="h-[350px] pr-4">
                {renderStepContent()}
            </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 0 || loading}>
            Back
          </Button>
          {step === STEPS.length - 1 ? (
             <Button 
               className="bg-black hover:bg-gray-800" 
               onClick={async () => {
                 try {
                   setLoading(true);
                   await allocationApi.autoRebalance();
                   toast.success('Auto rebalance executed', { description: 'Rebalancing stock across selected locations' });
                   onComplete?.();
                   onOpenChange(false);
                 } catch (err) {
                   toast.error(err instanceof Error ? err.message : 'Failed to run auto rebalance');
                 } finally {
                   setLoading(false);
                 }
               }} 
               disabled={loading}
             >
               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
               Confirm & Execute
             </Button>
          ) : (
             <Button className="bg-black hover:bg-gray-800 gap-2" onClick={handleNext} disabled={loading}>
                Next Step <ArrowRight size={16} />
             </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}