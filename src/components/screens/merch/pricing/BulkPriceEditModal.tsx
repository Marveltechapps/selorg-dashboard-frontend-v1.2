import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Check, AlertCircle } from "lucide-react";
import { pricingApi } from './pricingApi';
import { toast } from "sonner";

interface BulkPriceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount?: number;
  allSkus?: any[];
  onBulkUpdate?: (updatedSkus: any[]) => void;
}

export function BulkPriceEditModal({ open, onOpenChange, selectedCount = 0, allSkus = [], onBulkUpdate }: BulkPriceEditModalProps) {
  const [step, setStep] = useState(1);
  const [actionType, setActionType] = useState('flat');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustType, setAdjustType] = useState('increase');
  const [adjustUnit, setAdjustUnit] = useState('percent');
  const [targetMargin, setTargetMargin] = useState('');
  const [comment, setComment] = useState('');
  
  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const applyBulkUpdate = () => {
    if (!allSkus || allSkus.length === 0) {
      toast.error("No SKUs available to update");
      return;
    }
    
    const skusToUpdate = selectedCount > 0 ? allSkus.slice(0, selectedCount) : allSkus;
    const updatedSkus = skusToUpdate.map((sku: any) => {
      let newPrice = sku.sell;
      let newMargin = sku.margin;
      
      if (actionType === 'flat' && adjustValue) {
        const value = parseFloat(adjustValue);
        if (isNaN(value) || value <= 0) {
          return sku; // Skip invalid values
        }
        if (adjustUnit === 'percent') {
          const change = (sku.sell * value) / 100;
          newPrice = adjustType === 'increase' ? sku.sell + change : sku.sell - change;
        } else {
          newPrice = adjustType === 'increase' ? sku.sell + value : sku.sell - value;
        }
        const cost = sku.cost || (sku.sell * (1 - sku.margin / 100));
        newMargin = ((newPrice - cost) / newPrice) * 100;
      } else if (actionType === 'margin' && targetMargin) {
        const target = parseFloat(targetMargin);
        if (isNaN(target) || target <= 0 || target >= 100) {
          return sku; // Skip invalid values
        }
        const cost = sku.cost || (sku.sell * (1 - sku.margin / 100));
        newPrice = cost / (1 - target / 100);
        newMargin = target;
      }
      
      return {
        ...sku,
        sell: parseFloat(newPrice.toFixed(2)),
        margin: parseFloat(newMargin.toFixed(1)),
        marginStatus: newMargin < 10 ? 'critical' : (newMargin < 15 ? 'warning' : 'healthy')
      };
    });
    
    // Update the remaining SKUs that weren't changed
    const unchangedSkus = allSkus.filter((sku: any) => !skusToUpdate.find((u: any) => u.id === sku.id));
    const finalSkus = [...updatedSkus, ...unchangedSkus];
    
    if (onBulkUpdate) {
      onBulkUpdate(finalSkus);
    }
    
    toast.success(`Bulk price update applied to ${updatedSkus.length} SKUs`);
    setStep(3);
  };
  
  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setActionType('flat');
      setAdjustValue('');
      setAdjustType('increase');
      setAdjustUnit('percent');
      setTargetMargin('');
      setComment('');
    }
  }, [open]);

  // Step 1 is effectively done if triggered with selection, but we can show "Select Criteria" if count is 0.
  // Assuming this is triggered from "Bulk Edit" button on the table.
  
  const renderStep1 = () => (
    <div className="space-y-6">
       <div className="bg-slate-50 p-4 rounded-lg border">
          <p className="font-medium">Targeting {selectedCount > 0 ? `${selectedCount} selected SKUs` : "All SKUs in current view"}</p>
       </div>
       
       <div className="space-y-4">
          <h3 className="font-medium">Choose Action</h3>
          <RadioGroup value={actionType} onValueChange={setActionType}>
             <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="flat" id="bulk-flat" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="bulk-flat" className="font-medium">Adjust Price</Label>
                    <p className="text-sm text-muted-foreground">Increase or decrease by amount or percentage</p>
                    {actionType === 'flat' && (
                        <div className="flex gap-2 mt-2 items-center">
                            <Select value={adjustType} onValueChange={setAdjustType}>
                                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="increase">Increase by</SelectItem>
                                    <SelectItem value="decrease">Decrease by</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input 
                              className="w-[80px]" 
                              placeholder="0.00" 
                              value={adjustValue}
                              onChange={(e) => setAdjustValue(e.target.value)}
                              type="number"
                            />
                            <Select value={adjustUnit} onValueChange={setAdjustUnit}>
                                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="amount">₹</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
             </div>
             
             <div className="flex items-start space-x-3 space-y-0 mt-4">
                <RadioGroupItem value="margin" id="bulk-margin" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="bulk-margin" className="font-medium">Set Target Margin</Label>
                    <p className="text-sm text-muted-foreground">Adjust prices to achieve a minimum margin</p>
                     {actionType === 'margin' && (
                        <div className="flex gap-2 mt-2 items-center">
                            <span className="text-sm">Minimum Margin:</span>
                            <Input 
                              className="w-[80px]" 
                              placeholder="20" 
                              value={targetMargin}
                              onChange={(e) => setTargetMargin(e.target.value)}
                              type="number"
                            />
                            <span className="text-sm">%</span>
                        </div>
                    )}
                </div>
             </div>

             <div className="flex items-start space-x-3 space-y-0 mt-4">
                <RadioGroupItem value="competitor" id="bulk-comp" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="bulk-comp" className="font-medium">Align to Competitor</Label>
                    <p className="text-sm text-muted-foreground">Match or beat competitor average</p>
                     {actionType === 'competitor' && (
                        <div className="flex gap-2 mt-2 items-center">
                             <Select defaultValue="match">
                                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="match">Match Average</SelectItem>
                                    <SelectItem value="beat">Beat by</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input className="w-[80px]" placeholder="5" />
                            <span className="text-sm">%</span>
                        </div>
                    )}
                </div>
             </div>
          </RadioGroup>
       </div>
    </div>
  );

  const calculatePreview = () => {
    if (!allSkus || allSkus.length === 0) return [];
    
    const skusToUpdate = selectedCount > 0 ? allSkus.slice(0, selectedCount) : allSkus.slice(0, 5);
    
    return skusToUpdate.map((sku: any) => {
      let newPrice = sku.sell;
      let newMargin = sku.margin;
      
      if (actionType === 'flat' && adjustValue) {
        const value = parseFloat(adjustValue);
        if (adjustUnit === 'percent') {
          const change = (sku.sell * value) / 100;
          newPrice = adjustType === 'increase' ? sku.sell + change : sku.sell - change;
        } else {
          newPrice = adjustType === 'increase' ? sku.sell + value : sku.sell - value;
        }
        const cost = sku.cost || (sku.sell * (1 - sku.margin / 100));
        newMargin = ((newPrice - cost) / newPrice) * 100;
      } else if (actionType === 'margin' && targetMargin) {
        const target = parseFloat(targetMargin);
        const cost = sku.cost || (sku.sell * (1 - sku.margin / 100));
        newPrice = cost / (1 - target / 100);
        newMargin = target;
      }
      
      return {
        ...sku,
        newPrice: parseFloat(newPrice.toFixed(2)),
        newMargin: parseFloat(newMargin.toFixed(1)),
        oldPrice: sku.sell,
        oldMargin: sku.margin
      };
    });
  };

  const renderStep2 = () => {
    const previewData = calculatePreview();
    
    return (
      <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
              Preview Impact <span className="text-sm font-normal text-muted-foreground">(First {previewData.length} items)</span>
          </h3>
          <div className="border rounded-md">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>New Price</TableHead>
                          <TableHead>Margin Change</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {previewData.map((item: any) => (
                          <TableRow key={item.id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>₹{item.oldPrice.toFixed(2)}</TableCell>
                              <TableCell className="font-bold text-green-600">₹{item.newPrice.toFixed(2)}</TableCell>
                              <TableCell>{item.oldMargin.toFixed(1)}% → {item.newMargin.toFixed(1)}%</TableCell>
                          </TableRow>
                      ))}
                      {previewData.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                  No SKUs to preview
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </div>
          <div className="bg-amber-50 p-3 rounded border border-amber-200 flex gap-2">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-sm text-amber-800">
                  Warning: Some SKUs may exceed the maximum price threshold for their category.
              </p>
          </div>
          <div className="space-y-2">
              <Label>Summary Comment (Required)</Label>
              <Input 
                placeholder="e.g. Annual inflation adjustment" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
          </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <Check size={32} />
        </div>
        <h3 className="font-bold text-xl">Updates Queued</h3>
        <p className="text-muted-foreground max-w-xs">
            Price changes for {selectedCount || 45} SKUs have been submitted for approval.
        </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Price Edit</DialogTitle>
        </DialogHeader>

        <div className="py-4">
             {step === 1 && renderStep1()}
             {step === 2 && renderStep2()}
             {step === 3 && renderStep3()}
        </div>

        <DialogFooter>
            {step < 3 ? (
                <>
                    <Button variant="outline" onClick={prevStep} disabled={step === 1}>Back</Button>
                    <Button 
                      onClick={() => {
                        if (step === 2) {
                          // Validate before submitting
                          if (!comment.trim()) {
                            toast.error("Please provide a summary comment");
                            return;
                          }
                          // Apply bulk update
                          applyBulkUpdate();
                        } else {
                          nextStep();
                        }
                      }}
                    >
                        {step === 2 ? "Submit Changes" : "Preview Impact"}
                    </Button>
                </>
            ) : (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
