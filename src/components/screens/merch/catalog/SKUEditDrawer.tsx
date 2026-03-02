import React, { useRef } from 'react';
import { SKU, Region, SKUVisibilityStatus } from './types';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "../../../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { Upload, X } from 'lucide-react';
import { toast } from "sonner";

interface SKUEditDrawerProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sku: SKU) => void;
}

export function SKUEditDrawer({ sku, isOpen, onClose, onSave }: SKUEditDrawerProps) {
  const [formData, setFormData] = React.useState<SKU | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update internal state when sku prop changes
  React.useEffect(() => {
    if (sku && isOpen) {
      setFormData({ ...sku });
    }
  }, [sku, isOpen]);

  if (!sku || !formData) return null;

  const handleInputChange = (field: keyof SKU, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleVisibilityToggle = (region: string) => {
    const currentStatus = formData.visibility[region as Region];
    const newStatus: SKUVisibilityStatus = currentStatus === 'Visible' ? 'Hidden' : 'Visible';
    
    setFormData({
      ...formData,
      visibility: {
        ...formData.visibility,
        [region]: newStatus
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('imageUrl', imageUrl);
      toast.success("Image updated successfully");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
           <SheetTitle className="text-2xl font-bold text-[#212121]">Edit SKU</SheetTitle>
           <SheetDescription>
                {formData.code} • {formData.name}
           </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basics" className="w-full">
            <TabsList className="w-full justify-start border-b border-[#E0E0E0] rounded-none bg-transparent h-auto p-0 mb-6">
                <TabsTrigger value="basics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Basics</TabsTrigger>
                <TabsTrigger value="pricing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Pricing</TabsTrigger>
                <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Media</TabsTrigger>
                <TabsTrigger value="visibility" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Visibility</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4">
                <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={formData.category} onChange={(e) => handleInputChange('category', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Brand</Label>
                        <Input value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                        {formData.tags.map(t => (
                             <span key={t} className="bg-gray-100 px-2 py-1 rounded text-xs">{t}</span>
                        ))}
                        <span className="text-xs text-gray-400 flex items-center cursor-pointer hover:text-gray-600">+ Add Tag</span>
                    </div>
                 </div>
            </TabsContent>

             <TabsContent value="pricing" className="space-y-4">
                 <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200">
                    Base price is managed by the Global Pricing Engine.
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Base Price</Label>
                        <Input value={formData.price} type="number" onChange={(e) => handleInputChange('price', parseFloat(e.target.value))} />
                    </div>
                     <div className="space-y-2">
                        <Label>Promo Price</Label>
                        <Input value={formData.promoPrice || ''} type="number" placeholder="Optional" onChange={(e) => handleInputChange('promoPrice', parseFloat(e.target.value))} />
                    </div>
                 </div>
            </TabsContent>

             <TabsContent value="media" className="space-y-4">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                 />
                 <div className="grid grid-cols-3 gap-4">
                     <div className="aspect-square bg-gray-100 rounded-lg border border-[#E0E0E0] overflow-hidden relative group cursor-pointer">
                        {formData.imageUrl && <ImageWithFallback src={formData.imageUrl} className="w-full h-full object-cover" />}
                        <div 
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Change
                        </div>
                        {formData.imageUrl && (
                            <button 
                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleInputChange('imageUrl', '');
                                }}
                            >
                                <X size={12} className="text-red-500" />
                            </button>
                        )}
                     </div>
                     <div 
                        className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        <Upload size={20} className="mb-1" />
                        <span className="text-[10px] font-medium">+ Add</span>
                     </div>
                 </div>
            </TabsContent>

             <TabsContent value="visibility" className="space-y-4">
                 <div className="border rounded-lg divide-y">
                     {Object.entries(formData.visibility).map(([region, status]) => (
                         <div key={region} className="flex items-center justify-between p-3">
                             <span className="text-sm font-medium">{region}</span>
                             <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${status === 'Visible' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {status}
                                </span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-xs text-blue-600"
                                    onClick={() => handleVisibilityToggle(region)}
                                >
                                    Toggle
                                </Button>
                             </div>
                         </div>
                     ))}
                 </div>
            </TabsContent>
        </Tabs>
        
        <SheetFooter className="mt-8 pt-6 border-t border-[#E0E0E0]">
            <Button variant="outline" onClick={onClose}>Discard</Button>
            <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => onSave(formData)}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
