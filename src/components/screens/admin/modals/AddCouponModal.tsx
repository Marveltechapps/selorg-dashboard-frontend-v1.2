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
import { Badge } from '@/components/ui/badge';
import { createCoupon, updateCoupon, generateCouponCode, fetchReferencesCategories, Coupon } from '../pricingApi';
import { toast } from 'sonner';
import { Ticket, RefreshCw, Copy, Sparkles } from 'lucide-react';

interface AddCouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCoupon?: Coupon | null;
}

const USER_SEGMENTS = ['all', 'new_users', 'premium', 'inactive', 'high_value'];

export function AddCouponModal({ open, onOpenChange, onSuccess, editCoupon }: AddCouponModalProps) {
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
    if (open && editCoupon) {
      setFormData({
        code: editCoupon.code,
        name: editCoupon.name,
        discountType: editCoupon.discountType,
        discountValue: editCoupon.discountValue.toString(),
        minOrderValue: editCoupon.minOrderValue.toString(),
        maxDiscount: editCoupon.maxDiscount?.toString() || '',
        usageLimit: editCoupon.usageLimit?.toString() || '',
        usagePerUser: editCoupon.usagePerUser.toString(),
        selectedCategories: editCoupon.applicableCategories,
        selectedSegments: editCoupon.userSegments,
        startDate: new Date(editCoupon.startDate).toISOString().split('T')[0],
        endDate: new Date(editCoupon.endDate).toISOString().split('T')[0],
      });
    } else if (open && !editCoupon) {
      // Reset form for new coupon
      setFormData({
        code: '',
        name: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        usageLimit: '',
        usagePerUser: '1',
        selectedCategories: [],
        selectedSegments: ['all'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    }
  }, [open, editCoupon]);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discountType: 'percentage' as 'percentage' | 'flat' | 'free_delivery',
    discountValue: '',
    minOrderValue: '',
    maxDiscount: '',
    usageLimit: '',
    usagePerUser: '1',
    selectedCategories: [] as string[],
    selectedSegments: ['all'] as string[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateCode = async () => {
    try {
      const code = await generateCouponCode();
      handleChange('code', code);
      toast.success('Coupon code generated');
    } catch (error) {
      toast.error('Failed to generate code');
    }
  };

  const handleCopyCode = () => {
    if (formData.code) {
      navigator.clipboard.writeText(formData.code);
      toast.success('Code copied to clipboard');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(c => c !== categoryId)
        : [...prev.selectedCategories, categoryId]
    }));
  };

  const toggleSegment = (segment: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSegments: prev.selectedSegments.includes(segment)
        ? prev.selectedSegments.filter(s => s !== segment)
        : [...prev.selectedSegments, segment]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Coupon name is required');
      return;
    }

    if (formData.discountType !== 'free_delivery') {
      const discountValue = parseFloat(formData.discountValue);
      if (!discountValue || discountValue <= 0) {
        toast.error('Valid discount value is required');
        return;
      }
    }

    setLoading(true);
    try {
      const couponData = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        discountType: formData.discountType,
        discountValue: formData.discountType === 'free_delivery' ? 0 : parseFloat(formData.discountValue),
        minOrderValue: parseFloat(formData.minOrderValue) || 0,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        usagePerUser: parseInt(formData.usagePerUser),
        applicableCategories: formData.selectedCategories,
        applicableProducts: [],
        userSegments: formData.selectedSegments,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      if (editCoupon) {
        await updateCoupon(editCoupon.id, couponData);
        toast.success(`Coupon "${formData.code}" updated successfully`);
      } else {
        await createCoupon(couponData);
        toast.success(`Coupon "${formData.code}" created successfully`);
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(editCoupon ? 'Failed to update coupon' : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Ticket className="text-purple-600" size={20} />
            </div>
            <div>
              <DialogTitle>{editCoupon ? 'Edit Coupon Code' : 'Create Coupon Code'}</DialogTitle>
              <DialogDescription>{editCoupon ? 'Update coupon details' : 'Generate a new discount coupon for customers'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Coupon Code */}
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Coupon Code *</Label>
            <div className="flex gap-2">
                <Input
                id="coupon-code"
                placeholder="e.g., SUMMER25"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                className="flex-1 font-mono"
                disabled={!!editCoupon}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleGenerateCode}
                title="Generate random code"
              >
                <RefreshCw size={14} />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleCopyCode}
                disabled={!formData.code}
                title="Copy code"
              >
                <Copy size={14} />
              </Button>
            </div>
            <p className="text-xs text-[#71717a]">Use uppercase letters and numbers only</p>
          </div>

          {/* Coupon Name */}
          <div className="space-y-2">
            <Label htmlFor="coupon-name">Display Name *</Label>
            <Input
              id="coupon-name"
              placeholder="e.g., Summer Special Discount"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount Type *</Label>
              <Select value={formData.discountType} onValueChange={(val: any) => handleChange('discountType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount Off (₹)</SelectItem>
                  <SelectItem value="free_delivery">Free Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.discountType !== 'free_delivery' && (
              <div className="space-y-2">
                <Label htmlFor="discount-value">
                  Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  placeholder={formData.discountType === 'percentage' ? '10' : '100'}
                  value={formData.discountValue}
                  onChange={(e) => handleChange('discountValue', e.target.value)}
                  min="0"
                  step={formData.discountType === 'percentage' ? '1' : '10'}
                />
              </div>
            )}
          </div>

          {/* Min Order & Max Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min-order">Minimum Order Value (₹)</Label>
              <Input
                id="min-order"
                type="number"
                placeholder="0"
                value={formData.minOrderValue}
                onChange={(e) => handleChange('minOrderValue', e.target.value)}
                min="0"
                step="50"
              />
              <p className="text-xs text-[#71717a]">Leave 0 for no minimum</p>
            </div>

            {formData.discountType === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="max-discount">Max Discount Cap (₹)</Label>
                <Input
                  id="max-discount"
                  type="number"
                  placeholder="No limit"
                  value={formData.maxDiscount}
                  onChange={(e) => handleChange('maxDiscount', e.target.value)}
                  min="0"
                  step="50"
                />
                <p className="text-xs text-[#71717a]">Optional cap for percentage discounts</p>
              </div>
            )}
          </div>

          {/* Usage Limits */}
          <div className="p-4 bg-[#f4f4f5] rounded-lg space-y-3">
            <h4 className="font-bold text-sm text-[#18181b]">Usage Limits</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="usage-limit">Total Usage Limit</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  placeholder="Unlimited"
                  value={formData.usageLimit}
                  onChange={(e) => handleChange('usageLimit', e.target.value)}
                  min="1"
                />
                <p className="text-xs text-[#71717a]">Total times this coupon can be used</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage-per-user">Per User Limit</Label>
                <Input
                  id="usage-per-user"
                  type="number"
                  placeholder="1"
                  value={formData.usagePerUser}
                  onChange={(e) => handleChange('usagePerUser', e.target.value)}
                  min="1"
                />
                <p className="text-xs text-[#71717a]">Times each user can use this</p>
              </div>
            </div>
          </div>

          {/* Applicable Categories */}
          <div className="space-y-3">
            <Label>Applicable Categories (Leave empty for all)</Label>
            {refsLoading ? (
              <p className="text-sm text-[#71717a]">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-amber-600">No categories available. Add categories in Catalog first.</p>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={formData.selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</Label>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* User Segments */}
          <div className="space-y-3">
            <Label>Target User Segments</Label>
            <div className="flex flex-wrap gap-2">
              {USER_SEGMENTS.map(segment => (
                <Badge
                  key={segment}
                  variant={formData.selectedSegments.includes(segment) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSegment(segment)}
                >
                  {segment === 'all' && '👥 All Users'}
                  {segment === 'new_users' && '✨ New Users'}
                  {segment === 'premium' && '💎 Premium'}
                  {segment === 'inactive' && '💤 Inactive'}
                  {segment === 'high_value' && '🌟 High Value'}
                </Badge>
              ))}
            </div>
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Valid From *</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Valid Until</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
              <p className="text-xs text-[#71717a]">Leave empty for 30 days from start</p>
            </div>
          </div>

          {/* Preview */}
          {formData.code && (
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} />
                    <span className="text-xs opacity-90">COUPON CODE</span>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-wider">{formData.code}</div>
                  {formData.name && <div className="text-sm opacity-90 mt-1">{formData.name}</div>}
                </div>
                <div className="text-right">
                  {formData.discountType === 'percentage' && formData.discountValue && (
                    <div className="text-3xl font-bold">{formData.discountValue}% OFF</div>
                  )}
                  {formData.discountType === 'flat' && formData.discountValue && (
                    <div className="text-3xl font-bold">₹{formData.discountValue} OFF</div>
                  )}
                  {formData.discountType === 'free_delivery' && (
                    <div className="text-xl font-bold">FREE DELIVERY</div>
                  )}
                  {formData.minOrderValue && (
                    <div className="text-xs opacity-75 mt-1">On orders above ₹{formData.minOrderValue}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#e4e4e7]">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? (editCoupon ? 'Updating...' : 'Creating...') : (editCoupon ? 'Update Coupon' : 'Create Coupon')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
