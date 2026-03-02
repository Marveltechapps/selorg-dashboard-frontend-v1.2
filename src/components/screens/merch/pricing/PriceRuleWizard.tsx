import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { RadioGroup, RadioGroupItem } from "../../../ui/radio-group";
import { Checkbox } from "../../../ui/checkbox";
import { Calendar } from "../../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { pricingApi } from './pricingApi';
import { toast } from "sonner";

interface PriceRuleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rule: any) => void;
}

export function PriceRuleWizard({ open, onOpenChange, onSubmit }: PriceRuleWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'base',
    scope: 'region',
    pricingMethod: 'fixed',
    marginMin: '',
    marginMax: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rule Name</Label>
        <Input 
          placeholder="e.g. Summer Weekend Surge" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          placeholder="Describe the purpose of this rule"
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <Label>Rule Type</Label>
        <Select 
          value={formData.type} 
          onValueChange={v => setFormData({...formData, type: v})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">Base price override</SelectItem>
            <SelectItem value="geo">Geo-pricing</SelectItem>
            <SelectItem value="time">Time-based</SelectItem>
            <SelectItem value="campaign">Campaign-linked</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Scope & Targeting</h3>
        <RadioGroup 
          value={formData.scope} 
          onValueChange={v => setFormData({...formData, scope: v})}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem value="region" id="scope-region" className="peer sr-only" />
            <Label
              htmlFor="scope-region"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              Region / Zone
            </Label>
          </div>
          <div>
            <RadioGroupItem value="store" id="scope-store" className="peer sr-only" />
            <Label
              htmlFor="scope-store"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              Specific Store
            </Label>
          </div>
        </RadioGroup>
        
        <div className="space-y-2">
           <Label>Select Target SKUs</Label>
           <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select criteria (Category, Brand, Collection)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="collection">Collection</SelectItem>
              <SelectItem value="list">Specific List</SelectItem>
            </SelectContent>
           </Select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="font-medium text-lg">Rule Logic</h3>
      
      <div className="space-y-3">
        <Label>Pricing Method</Label>
        <RadioGroup 
          value={formData.pricingMethod} 
          onValueChange={v => setFormData({...formData, pricingMethod: v})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="pm-fixed" />
            <Label htmlFor="pm-fixed">Fixed Value</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cost-plus" id="pm-cost" />
            <Label htmlFor="pm-cost">Cost Plus Markup (%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="competitor" id="pm-comp" />
            <Label htmlFor="pm-comp">Competitor Index</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Min Margin (%)</Label>
          <Input 
            type="number" 
            placeholder="10" 
            value={formData.marginMin} 
            onChange={e => setFormData({...formData, marginMin: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label>Max Margin (%)</Label>
          <Input 
            type="number" 
            placeholder="50" 
            value={formData.marginMax} 
            onChange={e => setFormData({...formData, marginMax: e.target.value})} 
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="font-medium text-lg">Schedule & Priority</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.startDate}
                onSelect={(d) => setFormData({...formData, startDate: d})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
           <Label>End Date</Label>
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.endDate}
                onSelect={(d) => setFormData({...formData, endDate: d})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Priority Level</Label>
        <Select defaultValue="medium">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High (Overrides others)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="font-medium text-lg">Validation & Conflicts</h3>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
         <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
         <div>
            <h4 className="font-medium text-amber-900">Potential Conflict Detected</h4>
            <p className="text-sm text-amber-700 mt-1">This rule overlaps with "Summer Sale 2024" for 45 SKUs in the Beverages category.</p>
         </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Impact Analysis</h4>
        <ul className="space-y-2 text-sm text-blue-800">
           <li>• 120 SKUs affected</li>
           <li>• Est. Margin Impact: -2.5%</li>
           <li>• 3 SKUs might drop below min margin</li>
        </ul>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
        </div>
        <h3 className="font-bold text-xl">Ready to Submit</h3>
        <p className="text-muted-foreground">Review your new price rule configuration below.</p>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm">
         <div className="flex justify-between">
            <span className="text-slate-500">Name:</span>
            <span className="font-medium">{formData.name || "Untitled Rule"}</span>
         </div>
         <div className="flex justify-between">
            <span className="text-slate-500">Type:</span>
            <span className="font-medium capitalize">{formData.type}</span>
         </div>
         <div className="flex justify-between">
            <span className="text-slate-500">Scope:</span>
            <span className="font-medium capitalize">{formData.scope}</span>
         </div>
         <div className="flex justify-between">
            <span className="text-slate-500">Method:</span>
            <span className="font-medium capitalize">{formData.pricingMethod}</span>
         </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Price Rule - Step {step} of 6</DialogTitle>
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between w-full">
           <Button variant="outline" onClick={prevStep} disabled={step === 1}>
             <ChevronLeft size={16} className="mr-2" /> Back
           </Button>
           
           {step < 6 ? (
             <Button onClick={nextStep}>
               Next <ChevronRight size={16} className="ml-2" />
             </Button>
           ) : (
             <Button 
               onClick={async () => {
                 try {
                   const response = await pricingApi.createPriceRule(formData);
                   if (response.success) {
                     toast.success(`Rule "${formData.name}" created successfully`);
                     onSubmit(formData);
                   } else {
                     toast.error("Failed to create rule");
                   }
                 } catch (error) {
                   console.error('Error creating rule:', error);
                   toast.error("Failed to create rule");
                 }
               }} 
               className="bg-purple-600 hover:bg-purple-700"
             >
               Create Rule
             </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
