import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Checkbox } from "../../../ui/checkbox";
import { ScrollArea } from "../../../ui/scroll-area";
import { CollectionType, Region } from './types';
import { Check, ChevronRight, Upload, Calendar as CalendarIcon, X, Search, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { catalogApi } from '@/api/merch/catalogApi';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

const STEPS = [
  'Basics',
  'Add SKUs',
  'Media',
  'Visibility',
  'Review'
];

export function CreateCollectionModal({ isOpen, onClose, onSubmit, initialData }: CreateCollectionModalProps) {
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skuPickerOpen, setSkuPickerOpen] = useState(false);
  const [availableSkus, setAvailableSkus] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [skuPickerLoading, setSkuPickerLoading] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  const [data, setData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'Seasonal' as CollectionType,
    region: initialData?.region || 'North America' as Region,
    skus: initialData?.skus || [] as string[],
    media: initialData?.imageUrl || null,
    status: initialData?.status || 'Draft'
  });

  // Reset data when initialData changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData({
          name: initialData.name,
          description: initialData.description,
          type: initialData.type,
          region: initialData.region,
          skus: initialData.skus || [],
          media: initialData.imageUrl || null,
          status: initialData.status
        });
      } else {
        setData({
          name: '',
          description: '',
          type: 'Seasonal',
          region: 'North America',
          skus: [],
          media: null,
          status: 'Draft'
        });
      }
      setStep(0);
    }
  }, [isOpen, initialData]);

  const validateStep = () => {
    if (step === 0) {
      return data.name.trim() !== '' && data.description.trim() !== '';
    }
    if (step === 1) {
      // User requested: "when i didn't upload any data or images starting from create collection it won't allow to next page"
      // Let's require at least one SKU for step 1?
      return data.skus.length > 0;
    }
    if (step === 2) {
      // Require media?
      return data.media !== null;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.error("Please complete all required fields");
      return;
    }
    
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onSubmit(data);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setData({ ...data, media: imageUrl as any });
      toast.success("Cover image selected");
    }
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

  const handleSkuPickerConfirm = (selectedIds: string[]) => {
    setData({ ...data, skus: selectedIds });
    setSkuPickerOpen(false);
    toast.success(`Added ${selectedIds.length} SKU${selectedIds.length !== 1 ? 's' : ''} to collection`);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Collection</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new collection by following the steps.
          </DialogDescription>
          {/* Progress Bar */}
          <div className="flex items-center gap-1 mt-4">
             {STEPS.map((s, i) => (
                <div key={i} className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${i <= step ? 'bg-[#7C3AED]' : 'bg-transparent'} transition-all`} />
                </div>
             ))}
          </div>
          <div className="text-xs text-[#757575] font-medium mt-1">Step {step + 1}: {STEPS[step]}</div>
        </DialogHeader>

        <div className="flex-1 py-4">
            {step === 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <Label>Collection Name</Label>
                        <Input 
                            placeholder="e.g. Summer Essentials" 
                            value={data.name} 
                            onChange={(e) => setData({...data, name: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            placeholder="Describe this collection..." 
                            value={data.description} 
                            onChange={(e) => setData({...data, description: e.target.value})}
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select 
                                value={data.type} 
                                onValueChange={(val: CollectionType) => setData({...data, type: val})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                                    <SelectItem value="Thematic">Thematic</SelectItem>
                                    <SelectItem value="Bundle/Combo">Bundle/Combo</SelectItem>
                                    <SelectItem value="Brand">Brand</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Region Scope</Label>
                            <Select 
                                value={data.region} 
                                onValueChange={(val: Region) => setData({...data, region: val})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="North America">North America</SelectItem>
                                    <SelectItem value="Europe (West)">Europe (West)</SelectItem>
                                    <SelectItem value="APAC">APAC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div 
                        className="p-8 border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-center"
                        onClick={openSkuPicker}
                    >
                        <p className="text-sm font-medium text-gray-900">Click to Select SKUs</p>
                        <p className="text-xs text-gray-500">Opens the SKU picker to choose from catalog</p>
                    </div>
                    {data.skus.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase">Selected SKUs</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {data.skus.map(id => {
                                    const skuInfo = availableSkus.find(s => s.id === id) ?? { name: id, code: '' };
                                    return (
                                        <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
                                            <span>{skuInfo.name || skuInfo.code || id}</span>
                                            <X size={14} className="cursor-pointer text-gray-400 hover:text-red-500 shrink-0" onClick={(e) => { e.stopPropagation(); setData({...data, skus: data.skus.filter(s => s !== id)}); }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 text-center">{data.skus.length} SKUs selected</p>
                </div>
            )}
            
            {step === 2 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                     />
                     <div 
                        className="h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 relative overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {data.media ? (
                            <img src={data.media} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <Upload size={24} className="mb-2" />
                                <span className="text-sm">Upload Cover Image</span>
                            </>
                        )}
                     </div>
                     {data.media && (
                         <Button variant="ghost" size="sm" className="w-full text-red-600" onClick={() => setData({...data, media: null})}>
                             Remove Image
                         </Button>
                     )}
                 </div>
            )}

            {step === 3 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                                value={data.status} 
                                onValueChange={(val: string) => setData({...data, status: val as any})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Live">Live</SelectItem>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Schedule Start (Optional)</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <Input className="pl-9" placeholder="Select date..." />
                            </div>
                        </div>
                 </div>
            )}

             {step === 4 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <h4 className="font-bold text-gray-900">{data.name || 'Untitled Collection'}</h4>
                        <p className="text-sm text-gray-600">{data.description || 'No description provided'}</p>
                        <div className="flex gap-2 text-xs">
                             <span className="px-2 py-1 bg-white border rounded">{data.type}</span>
                             <span className="px-2 py-1 bg-white border rounded">{data.region}</span>
                             <span className="px-2 py-1 bg-white border rounded">{data.status}</span>
                        </div>
                     </div>
                     <p className="text-sm text-gray-500 text-center">Ready to create?</p>
                 </div>
            )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                Back
            </Button>
            <Button onClick={handleNext} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                {step === STEPS.length - 1 ? 'Create Collection' : (
                    <>Next <ChevronRight size={16} className="ml-1" /></>
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* SKU Picker Dialog - rendered as sibling to avoid nested dialog issues */}
    <Dialog open={skuPickerOpen} onOpenChange={setSkuPickerOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Select SKUs</DialogTitle>
                <DialogDescription>Choose SKUs from the catalog to add to this collection.</DialogDescription>
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
                            const isSelected = data.skus.includes(sku.id);
                            return (
                                <div
                                    key={sku.id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                        const next = isSelected
                                            ? data.skus.filter(s => s !== sku.id)
                                            : [...data.skus, sku.id];
                                        setData({ ...data, skus: next });
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
                <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => handleSkuPickerConfirm(data.skus)}>
                    Confirm ({data.skus.length} selected)
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
