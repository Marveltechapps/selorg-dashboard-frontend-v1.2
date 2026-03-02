import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createDiscount, updateDiscountCampaign, fetchReferencesCategories, type DiscountCampaign } from '../pricingApi';
import { toast } from 'sonner';
import { Tag } from 'lucide-react';

interface AddCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCampaign?: DiscountCampaign | null;
}

export function AddCampaignModal({ open, onOpenChange, onSuccess, editCampaign }: AddCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRefsLoading(true);
      fetchReferencesCategories()
        .then(setCategories)
        .catch(() => setCategories([]))
        .finally(() => setRefsLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (open && editCampaign) {
      setFormData({
        name: editCampaign.name,
        description: editCampaign.description || '',
        discountType: editCampaign.discountType,
        discountValue: String(editCampaign.discountValue),
        minOrderValue: String(editCampaign.minOrderValue || 0),
        maxDiscount: editCampaign.maxDiscount ? String(editCampaign.maxDiscount) : '',
        applicableCategories: editCampaign.applicableCategories || [],
        stackable: editCampaign.stackable || false,
        startDate: new Date(editCampaign.startDate).toISOString().split('T')[0],
        endDate: new Date(editCampaign.endDate).toISOString().split('T')[0],
        usageLimit: editCampaign.usageLimit ? String(editCampaign.usageLimit) : '',
      });
    } else if (open && !editCampaign) {
      setFormData({
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '10',
        minOrderValue: '0',
        maxDiscount: '',
        applicableCategories: [],
        stackable: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: '',
      });
    }
  }, [open, editCampaign]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'flat' | 'buy_x_get_y',
    discountValue: '10',
    minOrderValue: '0',
    maxDiscount: '',
    applicableCategories: [] as string[],
    stackable: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(categoryId)
        ? prev.applicableCategories.filter(c => c !== categoryId)
        : [...prev.applicableCategories, categoryId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    const discountValue = parseFloat(formData.discountValue);
    if (!discountValue || discountValue <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: discountValue,
        minOrderValue: parseFloat(formData.minOrderValue) || 0,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        applicableCategories: formData.applicableCategories,
        stackable: formData.stackable,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        status: 'active' as const,
      };

      if (editCampaign) {
        await updateDiscountCampaign(editCampaign.id, payload);
        toast.success('Campaign updated successfully');
      } else {
        await createDiscount(payload);
        toast.success('Campaign created successfully');
      }
      
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '10',
        minOrderValue: '0',
        maxDiscount: '',
        applicableCategories: [],
        stackable: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: '',
      });
    } catch (error) {
      console.error('Create/update campaign error:', error);
      toast.error(editCampaign ? 'Failed to update campaign' : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editCampaign ? 'Edit Discount Campaign' : 'Create Discount Campaign'}</DialogTitle>
          <DialogDescription>{editCampaign ? 'Update the discount campaign details' : 'Create a new discount campaign for products or categories'}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Sale 2024"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Campaign description..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type *</Label>
              <Select value={formData.discountType} onValueChange={(val: any) => handleChange('discountType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">Discount Value *</Label>
              <Input
                id="discountValue"
                type="number"
                placeholder="10"
                value={formData.discountValue}
                onChange={(e) => handleChange('discountValue', e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minOrderValue">Min Order Value (₹)</Label>
              <Input
                id="minOrderValue"
                type="number"
                placeholder="0"
                value={formData.minOrderValue}
                onChange={(e) => handleChange('minOrderValue', e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Max Discount (₹)</Label>
              <Input
                id="maxDiscount"
                type="number"
                placeholder="No limit"
                value={formData.maxDiscount}
                onChange={(e) => handleChange('maxDiscount', e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              placeholder="No limit"
              value={formData.usageLimit}
              onChange={(e) => handleChange('usageLimit', e.target.value)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Applicable Categories</Label>
            {refsLoading ? (
              <p className="text-sm text-[#71717a]">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-amber-600">No categories available. Add categories in Catalog first.</p>
            ) : (
            <div className="grid grid-cols-2 gap-2 p-3 border border-[#e4e4e7] rounded-lg max-h-40 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={formData.applicableCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                    {cat.name}
                  </Label>
                </div>
              ))}
            </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="stackable"
              checked={formData.stackable}
              onCheckedChange={(checked) => handleChange('stackable', checked)}
            />
            <Label htmlFor="stackable" className="cursor-pointer">
              Allow stacking with other discounts
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#e11d48] hover:bg-[#be123c]">
            {loading ? (editCampaign ? 'Updating...' : 'Creating...') : (editCampaign ? 'Update Campaign' : 'Create Campaign')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
