import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Textarea } from "../../../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../../ui/radio-group";
import { Calendar } from "../../../ui/calendar";
import { Checkbox } from "../../../ui/checkbox";
import { ScrollArea } from "../../../ui/scroll-area";
import { Separator } from "../../../ui/separator";
import { Badge } from "../../../ui/badge";
import { CalendarIcon, ChevronRight, Check, AlertCircle, Upload, Search, X, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { toast } from "sonner";
import { catalogApi } from '@/api/merch/catalogApi';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onComplete?: (data: any) => void;
  onSave?: (data: any) => void;
}

const STEPS = [
  { id: 'basics', label: 'Basic Details' },
  { id: 'time', label: 'Time & Scope' },
  { id: 'skus', label: 'Target SKUs' },
  { id: 'pricing', label: 'Pricing & Rules' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'approval', label: 'Approval' },
  { id: 'review', label: 'Review' },
];

export function CampaignWizard({ open, onOpenChange, initialData, onComplete, onSave }: CampaignWizardProps) {
  const [step, setStep] = useState(0);

  const getInitialFormData = React.useCallback(() => {
    if (initialData) {
      // Parse period to extract dates if available
      let startDate = new Date();
      let endDate = new Date();
      if (initialData.period) {
        const parts = initialData.period.split(' - ');
        if (parts.length === 2) {
          try {
            startDate = new Date(parts[0]);
            endDate = new Date(parts[1]);
          } catch (e) {
            // Use defaults if parsing fails
          }
        }
      }
      
      return {
        name: initialData.name || '',
        type: initialData.type?.toLowerCase() || '',
        description: initialData.tagline || initialData.description || '',
        owner: initialData.owner?.name || 'Alice L.',
        startDate: initialData.startDate ? new Date(initialData.startDate) : startDate,
        endDate: initialData.endDate ? new Date(initialData.endDate) : endDate,
        region: initialData.scope || initialData.region || 'North America',
        zones: initialData.zones || [],
        skus: initialData.skus ?? [],
        discountType: initialData.discountType || 'percentage',
        discountValue: initialData.discountValue || '',
        minOrderValue: initialData.minOrderValue || '',
        approvers: initialData.approvers || ['Pricing Manager', 'Regional Head'],
        target: initialData.target || ''
      };
    }
    
    return {
      name: '',
      type: '',
      description: '',
      owner: 'Alice L.',
      startDate: new Date(),
      endDate: new Date(),
      region: 'North America',
      zones: [] as string[],
      skus: [] as string[],
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: '',
      approvers: ['Pricing Manager', 'Regional Head'],
      target: ''
    };
  }, [initialData]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [skuPickerOpen, setSkuPickerOpen] = useState(false);
  const [availableSkus, setAvailableSkus] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [skuPickerLoading, setSkuPickerLoading] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');

  // Reset step and form data when wizard closes or initialData changes
  React.useEffect(() => {
    if (!open) {
      setStep(0);
      setFormData(getInitialFormData());
    } else if (initialData) {
      setFormData(getInitialFormData());
    }
  }, [open, initialData, getInitialFormData]);

  const removeSku = (id: string) => {
    setFormData(prev => ({
      ...prev,
      skus: prev.skus.filter(skuId => skuId !== id)
    }));
    toast.info("SKU Removed");
  };

  const openSkuPicker = async () => {
    setSkuPickerOpen(true);
    setSkuSearch('');
    setSkuPickerLoading(true);
    try {
      const resp = await catalogApi.getSKUs();
      const list = resp?.data ?? [];
      setAvailableSkus(Array.isArray(list) ? list.map((s: any) => ({
        id: String(s.id ?? s._id ?? ''),
        name: s.name ?? '',
        code: s.code ?? s.sku ?? '',
      })).filter((s: { id: string }) => s.id) : []);
    } catch (err) {
      toast.error('Failed to load SKUs');
      setAvailableSkus([]);
    } finally {
      setSkuPickerLoading(false);
    }
  };

  const filteredSkus = availableSkus.filter(s =>
    !skuSearch.trim() ||
    s.name.toLowerCase().includes(skuSearch.toLowerCase()) ||
    (s.code ?? '').toLowerCase().includes(skuSearch.toLowerCase())
  );

  const handleSubmit = () => {
    toast.success("Campaign Submitted", {
        description: `"${formData.name || 'Campaign'}" has been sent for approval.`
    });
    onComplete?.(formData);
    onOpenChange(false);
    setStep(0);
  };

  const handleSaveDraft = () => {
    toast.info("Draft Saved", {
        description: "You can find this campaign in your drafts."
    });
    onSave?.(formData);
    onOpenChange(false);
    setStep(0);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Basic Details
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid w-full gap-2">
              <Label htmlFor="name" className="text-sm font-bold text-gray-700">Campaign Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., Summer Sale 2024" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="h-11 border-2 focus-visible:ring-[#7C3AED]"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="type" className="text-sm font-bold text-gray-700">Campaign Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData({...formData, type: val})}
              >
                <SelectTrigger className="h-11 border-2 focus:ring-[#7C3AED]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="flash">Flash Sale</SelectItem>
                  <SelectItem value="loyalty">Loyalty Boost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="description" className="text-sm font-bold text-gray-700">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Internal notes about this campaign..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="min-h-[120px] border-2 focus-visible:ring-[#7C3AED] resize-none"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="owner" className="text-sm font-bold text-gray-700">Owner</Label>
              <Input id="owner" value={formData.owner} disabled className="h-11 bg-gray-50 border-2 font-medium" />
            </div>
          </div>
        );
      
      case 1: // Time & Scope
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-bold h-11 border-2">
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#7C3AED]" />
                      {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => date && setFormData({...formData, startDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-bold h-11 border-2">
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#7C3AED]" />
                      {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => date && setFormData({...formData, endDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700">Target Region</Label>
                <Select 
                    value={formData.region} 
                    onValueChange={(val) => setFormData({...formData, region: val})}
                >
                    <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="North America">North America</SelectItem>
                        <SelectItem value="Europe">Europe</SelectItem>
                        <SelectItem value="APAC">APAC</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl flex gap-4 items-center">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-orange-900">Conflict Detection</h4>
                    <p className="text-xs text-orange-700/80 mt-0.5 font-medium leading-relaxed">
                        Campaign overlaps with "Spring Clearance" in North East Zone. Ensure SKUs do not overlap.
                    </p>
                </div>
            </div>
          </div>
        );

      case 2: // Target SKUs
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-base font-bold">Selected SKUs ({formData.skus.length})</Label>
                    <Button variant="outline" size="sm" className="text-[#7C3AED] font-bold" onClick={openSkuPicker}>
                        Select SKUs
                    </Button>
                </div>
                
                <div className="border-2 rounded-xl overflow-hidden bg-gray-50/30">
                    <ScrollArea className="h-[320px]">
                        <div className="divide-y-2">
                    {formData.skus.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Search size={32} className="opacity-20" />
                                    </div>
                                    <p className="font-medium text-gray-500">No SKUs selected yet</p>
                                    <p className="text-xs">Click &quot;Select SKUs&quot; to add products from the catalog</p>
                                </div>
                            ) : (
                                formData.skus.map((id) => {
                                  const skuInfo = availableSkus.find(s => s.id === id) ?? { name: id, code: id };
                                  return (
                                    <div key={id} className="flex items-center justify-between p-4 hover:bg-white transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white border-2 rounded-lg flex items-center justify-center text-gray-400 font-bold text-[10px] shadow-sm">
                                                IMG
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{skuInfo.name || skuInfo.code || id}</p>
                                                {skuInfo.code && <p className="text-[10px] text-gray-500 font-medium">ID: {skuInfo.code}</p>}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            onClick={() => removeSku(id)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                  );
                                })
                            )}
                        </div>
                </ScrollArea>
                </div>
            </div>
          </div>
        );

      case 3: // Pricing & Rules
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                <Label className="text-sm font-black text-gray-700 uppercase tracking-widest">Promotion Strategy</Label>
            <RadioGroup 
                value={formData.discountType}
                onValueChange={(val) => setFormData({...formData, discountType: val})}
                className="grid grid-cols-2 gap-4"
            >
                {['flat', 'percentage', 'bogo', 'tiered'].map((type) => (
                        <div key={type} className="h-full">
                        <RadioGroupItem value={type} id={`wizard-type-${type}`} className="peer sr-only" />
                        <Label
                            htmlFor={`wizard-type-${type}`}
                                className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 bg-white p-6 hover:bg-gray-50 peer-data-[state=checked]:border-[#7C3AED] peer-data-[state=checked]:bg-[#F3E8FF]/20 [&:has([data-state=checked])]:border-[#7C3AED] cursor-pointer transition-all h-full text-center shadow-sm"
                        >
                                <span className="text-lg font-black text-gray-900 capitalize mb-1">
                                {type === 'flat' ? '₹ Flat' : type === 'percentage' ? '% Percent' : type.toUpperCase()}
                            </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                {type === 'flat' ? 'Fixed Amount Off' : type === 'percentage' ? 'Percentage Off' : type === 'bogo' ? 'Buy X Get Y' : 'Volume Discounts'}
                            </span>
                        </Label>
                    </div>
                ))}
            </RadioGroup>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Discount Value</Label>
                <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="20" 
                        value={formData.discountValue}
                        onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                        className="pl-10 h-11 border-2 font-bold text-lg"
                    />
                    <span className="absolute left-4 top-2.5 text-[#7C3AED] font-black text-lg">
                        {formData.discountType === 'flat' ? '₹' : '%'}
                    </span>
                </div>
            </div>

            <div className="bg-blue-50/50 border-2 border-blue-100 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Pricing Preview</h4>
                    <p className="text-xs text-blue-700 mt-1 font-medium">Estimated average unit price after discount</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 line-through font-bold text-lg">₹2.50</span>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <ChevronRight className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-black text-2xl text-blue-900">₹2.00</span>
                </div>
            </div>
          </div>
        );

      case 4: // Eligibility
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                <Label className="text-sm font-black text-gray-700 uppercase tracking-widest">Customer Segmentation</Label>
                <div className="grid grid-cols-2 gap-4">
                    {['All Customers', 'New Users Only', 'Loyalty Tier: Gold+', 'Premium Subscribers'].map((seg, idx) => (
                        <div key={seg} className="flex items-center space-x-4 border-2 p-4 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all shadow-sm group">
                            <Checkbox id={`seg-${idx}`} className="h-5 w-5 border-2 data-[state=checked]:bg-[#7C3AED] data-[state=checked]:border-[#7C3AED]" />
                            <Label htmlFor={`seg-${idx}`} className="text-sm font-bold text-gray-700 cursor-pointer flex-1 group-hover:text-gray-900">{seg}</Label>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="space-y-4 pt-4">
                <Label className="text-sm font-black text-gray-700 uppercase tracking-widest">Redemption Limits</Label>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Limit Per Customer</Label>
                        <Input type="number" placeholder="1" defaultValue="1" className="h-11 border-2 font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Campaign Limit</Label>
                        <Input type="number" placeholder="No limit" className="h-11 border-2 font-bold" />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl flex gap-4 items-center">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xs text-blue-800 font-medium">
                    Eligibility rules ensure that the campaign is only available to the selected customer segments and respects redemption limits.
                </p>
            </div>
          </div>
        );

      case 5: // Approval
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 bg-purple-50/50 border-2 border-purple-100 rounded-2xl">
                <h4 className="text-sm font-black text-purple-900 mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <AlertCircle size={18} /> Approval Chain Required
                </h4>
                <p className="text-xs text-purple-700/80 leading-relaxed font-medium">
                    Based on the discount depth (&gt;15%) and target margin impact, this campaign requires manual review by the following stakeholders.
                </p>
            </div>
            <div className="space-y-4">
                <Label className="text-sm font-black text-gray-700 uppercase tracking-widest">Required Approvers</Label>
                <div className="space-y-3">
                    {[
                        { step: 1, role: 'System Validation', name: 'Auto-Check', status: 'Passed', icon: <Check size={14} className="text-white" />, color: 'bg-green-500 border-green-200' },
                        { step: 2, role: 'Pricing Manager', name: 'Sarah Miller', status: 'Pending', icon: '2', color: 'bg-blue-100 text-blue-600 border-blue-200' },
                        { step: 3, role: 'Regional Head', name: 'James Wilson', status: 'Pending', icon: '3', color: 'bg-gray-100 text-gray-400 border-gray-200' }
                    ].map((approver) => (
                        <div key={approver.step} className="flex items-center gap-4 p-4 border-2 rounded-2xl bg-white shadow-sm hover:border-gray-300 transition-colors">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2",
                                approver.color
                            )}>
                                {approver.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-gray-900">{approver.role}</p>
                                <p className="text-[11px] text-gray-500 font-bold">{approver.name}</p>
                            </div>
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-black tracking-widest px-3 py-1 border-2",
                                approver.status === 'Passed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                            )}>
                                {approver.status}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        );

      case 6: // Review
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border-2 space-y-4">
                    <h4 className="font-black text-gray-900 text-xs border-b-2 pb-3 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-4 bg-[#7C3AED] rounded-full" /> Campaign Details
                    </h4>
                {[
                        { label: 'Campaign Name', value: formData.name || 'Untitled Campaign' },
                        { label: 'Campaign Type', value: formData.type || 'Not selected' },
                        { label: 'Owner', value: formData.owner },
                    { label: 'Region', value: formData.region },
                        { label: 'Target SKUs', value: `${formData.skus.length} Items Selected` }
                ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">{item.label}</span>
                            <span className="font-bold text-gray-900 capitalize">{item.value}</span>
                    </div>
                ))}
                </div>

                <div className="bg-purple-50/30 p-6 rounded-2xl border-2 border-purple-100 space-y-4">
                    <h4 className="font-black text-purple-900 text-xs border-b-2 border-purple-100 pb-3 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-4 bg-[#7C3AED] rounded-full" /> Strategy & Schedule
                    </h4>
                    {[
                        { label: 'Offer', value: `${formData.discountValue || '0'}${formData.discountType === 'flat' ? '₹' : '%'} Off` },
                        { label: 'Strategy', value: formData.discountType },
                        { label: 'Start Date', value: format(formData.startDate, "MMM dd, yyyy") },
                        { label: 'End Date', value: format(formData.endDate, "MMM dd, yyyy") },
                        { label: 'Eligibility', value: 'All Customers' }
                    ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                            <span className="text-purple-600/70 font-medium">{item.label}</span>
                            <span className="font-bold text-purple-900 capitalize">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Projected Uplift', value: '+14.8%', color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Est. Margin Hit', value: '-4.2%', color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'ROI Forecast', value: '4.2x', color: 'text-[#7C3AED]', bg: 'bg-purple-50' }
                ].map((stat) => (
                    <div key={stat.label} className={cn("p-4 border-2 rounded-2xl text-center shadow-sm", stat.bg)}>
                        <p className="text-[10px] text-gray-500 mb-1 font-black uppercase tracking-widest">{stat.label}</p>
                        <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-yellow-50 border-2 border-yellow-100 rounded-xl flex gap-3 items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800 font-medium">
                    This campaign requires 2 levels of approval before going live on the selected start date.
                </p>
            </div>
          </div>
        );
        
      default:
        return (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
                <AlertCircle className="h-10 w-10 text-gray-200" />
                <p>Step content under construction</p>
            </div>
        );
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-auto max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
        <DialogHeader className="p-6 pb-4 bg-white shrink-0 border-b relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#F3E8FF] rounded-2xl flex items-center justify-center shadow-sm">
                <Plus size={28} className="text-[#7C3AED]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                  {initialData ? 'Edit Campaign' : 'Launch Campaign'}
                </DialogTitle>
                <DialogDescription className="text-sm font-bold text-gray-500 mt-0.5">
                  Step {step + 1} of {STEPS.length}: {STEPS[step].label}
          </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
              <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED]">Drafting Mode</span>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Steps - Restored names and better spacing */}
        <div className="px-6 py-6 bg-gray-50/50 shrink-0 border-b relative z-10">
            <div className="flex justify-between items-start relative max-w-3xl mx-auto">
                <div className="absolute top-[16px] left-[20px] right-[20px] h-[2px] bg-gray-200 z-0 rounded-full" />
                
                {STEPS.map((s, i) => {
                    const isActive = i === step;
                    const isCompleted = i < step;

                    return (
                        <div key={s.id} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                                <div 
                                    className={cn(
                                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 border-2 shadow-sm cursor-pointer",
                                        isActive ? "border-[#7C3AED] bg-white text-[#7C3AED] ring-4 ring-[#7C3AED]/10 scale-110" : 
                                        isCompleted ? "border-[#7C3AED] bg-[#7C3AED] text-white" : 
                                    "border-gray-300 bg-white text-gray-400"
                                    )}
                                    onClick={() => i < step && setStep(i)}
                                >
                                {isCompleted ? <Check className="h-4 w-4 stroke-[4]" /> : i + 1}
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter text-center max-w-[80px] leading-tight transition-colors duration-300 h-6 flex items-center",
                                isActive ? "text-[#7C3AED]" : isCompleted ? "text-gray-700" : "text-gray-400"
                            )}>{s.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        <ScrollArea className="flex-1 bg-white relative z-0 overflow-y-auto">
            <div className="p-8 pb-12 max-w-3xl mx-auto min-h-full flex flex-col">
                <div className="flex-1">
                    {renderStepContent()}
                </div>
                
                {/* Navigation Buttons - Now integrated with content flow */}
                <div className="mt-12 pt-8 border-t flex justify-between items-center bg-white">
                    <Button 
                        type="button"
                        variant="ghost" 
                        onClick={(e) => {
                            e.preventDefault();
                            handleBack();
                        }} 
                        disabled={step === 0}
                        className="h-11 px-6 font-black text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        Back
                    </Button>
                    <div className="flex gap-3">
                        {step === STEPS.length - 1 ? (
                            <>
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSaveDraft();
                                    }}
                                    className="h-11 px-6 font-black text-gray-600 border-2 border-gray-100 hover:bg-gray-50 rounded-xl"
                                >
                                    Save Draft
                                </Button>
                                <Button 
                                    type="button"
                                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-8 font-black shadow-lg shadow-purple-200 rounded-xl transition-all active:scale-95" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSubmit();
                                    }}
                                >
                                    Launch Now
                                </Button>
                            </>
                        ) : (
                            <Button 
                                type="button"
                                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-8 font-black shadow-lg shadow-purple-200 rounded-xl transition-all active:scale-95" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNext();
                                }}
                            >
                                Next Step
                                <ChevronRight className="ml-2 h-4 w-4 stroke-[3]" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <Dialog open={skuPickerOpen} onOpenChange={setSkuPickerOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Select SKUs</DialogTitle>
                <DialogDescription>Choose SKUs from the catalog for this campaign.</DialogDescription>
            </DialogHeader>
            <div className="relative py-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search by name or code..."
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="pl-9"
                />
            </div>
            {skuPickerLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading SKUs...</span>
                </div>
            ) : filteredSkus.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">No SKUs found</div>
            ) : (
                <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-2 space-y-1">
                        {filteredSkus.map((sku) => {
                            const isSelected = formData.skus.includes(sku.id);
                            return (
                                <div
                                    key={sku.id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                        const next = isSelected
                                            ? formData.skus.filter(s => s !== sku.id)
                                            : [...formData.skus, sku.id];
                                        setFormData(prev => ({ ...prev, skus: next }));
                                    }}
                                >
                                    <Checkbox checked={isSelected} />
                                    <span className="text-sm font-medium">{sku.name}</span>
                                    {sku.code && <span className="text-xs text-gray-500">({sku.code})</span>}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setSkuPickerOpen(false)}>Cancel</Button>
                <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => setSkuPickerOpen(false)}>
                    Done
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
