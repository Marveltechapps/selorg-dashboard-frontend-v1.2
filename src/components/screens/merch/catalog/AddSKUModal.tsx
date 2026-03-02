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
import { ChevronRight, Upload, Check, X } from 'lucide-react';
import { toast } from "sonner";

interface AddSKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const STEPS = [
  'Basics',
  'Attributes',
  'Pricing',
  'Media',
  'Visibility'
];

export function AddSKUModal({ isOpen, onClose, onSubmit }: AddSKUModalProps) {
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any>({
      code: '',
      name: '',
      category: '',
      brand: '',
      packSize: '',
      weight: '',
      price: 0,
      stock: 0,
      images: [] as string[]
  });

  const validateStep = () => {
    if (step === 0) {
      return data.code.trim() !== '' && data.name.trim() !== '' && data.category.trim() !== '' && data.brand.trim() !== '';
    }
    if (step === 1) {
      return data.packSize.trim() !== '' && data.weight.trim() !== '';
    }
    if (step === 2) {
      return data.price > 0 && data.stock >= 0;
    }
    if (step === 3) {
      return data.images.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onSubmit(data);
      onClose();
      setStep(0);
      setData({
        code: '',
        name: '',
        category: '',
        brand: '',
        packSize: '',
        weight: '',
        price: 0,
        stock: 0,
        images: []
      });
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setData({ ...data, images: [...data.images, ...newImages] });
      toast.success(`${files.length} image(s) selected`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New SKU</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new SKU to the catalog by following the steps.
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
                        <Label>SKU Code</Label>
                        <Input value={data.code} placeholder="e.g. FRT-AVO-002" onChange={e => setData({...data, code: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Product Name</Label>
                        <Input value={data.name} placeholder="e.g. Organic Avocados" onChange={e => setData({...data, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input value={data.category} placeholder="Select category..." onChange={e => setData({...data, category: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Brand</Label>
                            <Input value={data.brand} placeholder="Select brand..." onChange={e => setData({...data, brand: e.target.value})} />
                        </div>
                    </div>
                </div>
             )}

             {step === 1 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Pack Size</Label>
                            <Input value={data.packSize} placeholder="e.g. 2pk" onChange={e => setData({...data, packSize: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Weight/Volume</Label>
                            <Input value={data.weight} placeholder="e.g. 500g" onChange={e => setData({...data, weight: e.target.value})} />
                        </div>
                    </div>
                 </div>
             )}

             {step === 2 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Base Price ($)</Label>
                            <Input value={data.price} type="number" placeholder="0.00" onChange={e => setData({...data, price: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Initial Stock</Label>
                            <Input value={data.stock} type="number" placeholder="0" onChange={e => setData({...data, stock: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>
                 </div>
             )}
             
             {step === 3 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={handleFileChange} 
                     />
                     <div 
                        className="h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 overflow-hidden relative"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Upload Product Images</span>
                     </div>
                     {data.images.length > 0 && (
                         <div className="grid grid-cols-4 gap-2">
                             {data.images.map((img: string, i: number) => (
                                 <div key={i} className="aspect-square bg-gray-100 rounded border relative group overflow-hidden">
                                     <img src={img} alt="Product" className="w-full h-full object-cover" />
                                     <button 
                                        className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setData({...data, images: data.images.filter((_: any, idx: number) => idx !== i)});
                                        }}
                                     >
                                         <X size={12} className="text-red-500" />
                                     </button>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             )}

             {step === 4 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-center pt-8">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Check className="text-green-600" size={32} />
                     </div>
                     <h4 className="font-bold text-lg text-gray-900">Ready to Add SKU</h4>
                     <p className="text-gray-500">Review details before submitting.</p>
                 </div>
             )}
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={handleBack} disabled={step === 0}>Back</Button>
            <Button onClick={handleNext} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                {step === STEPS.length - 1 ? 'Add SKU' : (
                    <>Next <ChevronRight size={16} className="ml-1" /></>
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
