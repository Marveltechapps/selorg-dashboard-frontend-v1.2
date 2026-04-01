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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { createCoupon, updateCoupon, generateCouponCode, fetchReferencesCategories, fetchReferencesZones, Coupon } from '../pricingApi';
import { toast } from 'sonner';
import { Ticket, RefreshCw, Copy, Sparkles, Plus, Trash2, Calendar as CalendarIcon, Clock, Percent, DollarSign, Zap, User, AppWindow, Smartphone, MapPin, CreditCard } from 'lucide-react';

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
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRefsLoading(true);
      Promise.all([
        fetchReferencesCategories().catch(() => []),
        fetchReferencesZones().catch(() => [])
      ]).then(([cats, zns]) => {
        setCategories(cats);
        setZones(zns);
      }).finally(() => setRefsLoading(false));
    }
  }, [open]);
  
  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      tiers: [...prev.tiers, { minOrder: 0, discountAmount: 0 }]
    }));
  };

  const removeTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const handleTierChange = (index: number, field: 'minOrder' | 'discountAmount', value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => i === index ? { ...t, [field]: numValue } : t)
    }));
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      validTimeSlots: [...prev.validTimeSlots, { from: '09:00', to: '21:00' }]
    }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      validTimeSlots: prev.validTimeSlots.filter((_, i) => i !== index)
    }));
  };

  const handleTimeSlotChange = (index: number, field: 'from' | 'to', value: string) => {
    setFormData(prev => ({
      ...prev,
      validTimeSlots: prev.validTimeSlots.map((ts, i) => i === index ? { ...ts, [field]: value } : ts)
    }));
  };

  const toggleValidDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      validDays: prev.validDays.includes(day)
        ? prev.validDays.filter(d => d !== day)
        : [...prev.validDays, day]
    }));
  };

  const toggleShowInSection = (section: string) => {
    setFormData(prev => ({
      ...prev,
      showInSections: prev.showInSections.includes(section)
        ? prev.showInSections.filter(s => s !== section)
        : [...prev.showInSections, section]
    }));
  };

  const toggleTargetZone = (zoneId: string) => {
    setFormData(prev => ({
      ...prev,
      targetZones: prev.targetZones.includes(zoneId)
        ? prev.targetZones.filter(z => z !== zoneId)
        : [...prev.targetZones, zoneId]
    }));
  };
  useEffect(() => {
    if (open && editCoupon) {
      let dType = (editCoupon.discountType as string) || 'PERCENTAGE';
      if (dType === 'percentage') dType = 'PERCENTAGE';
      if (dType === 'flat') dType = 'FLAT_DISCOUNT';
      if (dType === 'free_delivery') dType = 'FREE_DELIVERY';
      
      setFormData({
        code: editCoupon.code,
        name: editCoupon.name,
        description: (editCoupon as any).description || '',
        discountType: dType as any,
        discountValue: editCoupon.discountValue.toString(),
        minOrderValue: editCoupon.minOrderValue.toString(),
        maxDiscount: editCoupon.maxDiscount?.toString() || '',
        discountOn: (editCoupon as any).discountOn || 'CART_TOTAL',
        applicableSkuIds: (editCoupon as any).applicableSkuIds?.join(', ') || '',
        tiers: (editCoupon as any).tiers || [],
        bogoMinQty: ((editCoupon as any).bogoMinQty || 2).toString(),
        usageLimit: editCoupon.usageLimit?.toString() || '',
        usagePerUser: editCoupon.usagePerUser.toString(),
        isFirstOrderOnly: (editCoupon as any).isFirstOrderOnly || false,
        isStackable: (editCoupon as any).isStackable || false,
        excludeSaleItems: (editCoupon as any).excludeSaleItems !== false,
        selectedCategories: editCoupon.applicableCategories,
        selectedSegments: editCoupon.userSegments,
        targetSegment: (editCoupon as any).targetSegment || 'ALL_USERS',
        targetUserIds: (editCoupon as any).targetUserIds?.join('\n') || '',
        targetZones: (editCoupon as any).targetZones || [],
        paymentRestriction: (editCoupon as any).paymentRestriction || 'ALL',
        showInSections: (editCoupon as any).showInSections || ['COUPON_LIST'],
        priorityRank: ((editCoupon as any).priorityRank || 10).toString(),
        bannerImageUrl: (editCoupon as any).bannerImageUrl || '',
        themeColor: (editCoupon as any).themeColor || '#2A7D4F',
        deepLink: (editCoupon as any).deepLink || '',
        termsAndConditions: (editCoupon as any).termsAndConditions || '',
        cashbackCreditTrigger: (editCoupon as any).cashbackCreditTrigger || 'ORDER_DELIVERED',
        cashbackExpiryDays: ((editCoupon as any).cashbackExpiryDays || 14).toString(),
        startDate: new Date(editCoupon.startDate).toISOString().slice(0, 16),
        endDate: editCoupon.endDate ? new Date(editCoupon.endDate).toISOString().slice(0, 16) : '',
        validDays: (editCoupon as any).validDays || [],
        validTimeSlots: (editCoupon as any).validTimeSlots || [],
      });
    } else if (open && !editCoupon) {
      // Reset form for new coupon
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        discountOn: 'CART_TOTAL',
        applicableSkuIds: '',
        tiers: [],
        bogoMinQty: '2',
        usageLimit: '',
        usagePerUser: '1',
        isFirstOrderOnly: false,
        isStackable: false,
        excludeSaleItems: true,
        selectedCategories: [],
        selectedSegments: ['all'],
        targetSegment: 'ALL_USERS',
        targetUserIds: '',
        targetZones: [],
        paymentRestriction: 'ALL',
        showInSections: ['COUPON_LIST'],
        priorityRank: '10',
        bannerImageUrl: '',
        themeColor: '#2A7D4F',
        deepLink: '',
        termsAndConditions: '',
        cashbackCreditTrigger: 'ORDER_DELIVERED',
        cashbackExpiryDays: '14',
        startDate: new Date().toISOString().slice(0, 16),
        endDate: '',
        validDays: [],
        validTimeSlots: [],
      });
    }
  }, [open, editCoupon]);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as 'FLAT_DISCOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'BOGO' | 'CASHBACK' | 'TIERED_FLAT',
    discountValue: '',
    minOrderValue: '',
    maxDiscount: '',
    discountOn: 'CART_TOTAL' as 'CART_TOTAL' | 'DELIVERY_FEE' | 'CATEGORY' | 'SPECIFIC_SKU',
    applicableSkuIds: '',
    tiers: [] as { minOrder: number; discountAmount: number }[],
    bogoMinQty: '2',
    usageLimit: '',
    usagePerUser: '1',
    isFirstOrderOnly: false,
    isStackable: false,
    excludeSaleItems: true,
    selectedCategories: [] as string[],
    selectedSegments: ['all'] as string[],
    targetSegment: 'ALL_USERS' as 'ALL_USERS' | 'NEW_USERS' | 'LAPSED_7D' | 'LAPSED_30D' | 'VIP_TIER' | 'SPECIFIC_USER_IDS',
    targetUserIds: '',
    targetZones: [] as string[],
    paymentRestriction: 'ALL' as 'ALL' | 'UPI' | 'COD' | 'WALLET',
    showInSections: ['COUPON_LIST'] as string[],
    priorityRank: '10',
    bannerImageUrl: '',
    themeColor: '#2A7D4F',
    deepLink: '',
    termsAndConditions: '',
    cashbackCreditTrigger: 'ORDER_DELIVERED' as 'ORDER_DELIVERED' | 'ORDER_PLACED',
    cashbackExpiryDays: '14',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
    validDays: [] as string[],
    validTimeSlots: [] as { from: string; to: string }[],
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
    const couponCode = formData.code.trim().toUpperCase();
    if (!couponCode) {
      toast.error('Coupon code is required');
      return;
    }
    if (/\s/.test(couponCode)) {
      toast.error('Coupon code cannot contain spaces');
      return;
    }
    if (/[^A-Z0-9]/.test(couponCode)) {
      toast.error('Coupon code can only contain uppercase letters and numbers');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Display name is required');
      return;
    }

    if (formData.discountType !== 'FREE_DELIVERY' && formData.discountType !== 'BOGO' && formData.discountType !== 'TIERED_FLAT') {
      const discountValue = parseFloat(formData.discountValue);
      if (!discountValue || discountValue <= 0) {
        toast.error('Valid discount value is required');
        return;
      }
    }

    if (!formData.minOrderValue || parseFloat(formData.minOrderValue) < 0) {
      toast.error('Minimum order value must be >= 0');
      return;
    }

    if (formData.discountType === 'PERCENTAGE' && (!formData.maxDiscount || parseFloat(formData.maxDiscount) <= 0)) {
      toast.error('Maximum discount cap is required for percentage discounts');
      return;
    }

    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      let finalMaxDiscount = formData.maxDiscount ? parseFloat(formData.maxDiscount) : null;
      if (formData.discountType === 'FLAT_DISCOUNT') {
        finalMaxDiscount = parseFloat(formData.discountValue);
      }

      const couponData = {
        code: couponCode,
        name: formData.name.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: (formData.discountType === 'FREE_DELIVERY' || formData.discountType === 'BOGO' || formData.discountType === 'TIERED_FLAT') ? 0 : parseFloat(formData.discountValue),
        minOrderValue: parseFloat(formData.minOrderValue) || 0,
        maxDiscount: finalMaxDiscount,
        discountOn: formData.discountOn,
        applicableCategories: formData.selectedCategories,
        applicableSkuIds: formData.applicableSkuIds.split(',').map(s => s.trim()).filter(Boolean),
        tiers: formData.tiers,
        bogoMinQty: parseInt(formData.bogoMinQty),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        usagePerUser: parseInt(formData.usagePerUser),
        isFirstOrderOnly: formData.isFirstOrderOnly,
        isStackable: formData.isStackable,
        excludeSaleItems: formData.excludeSaleItems,
        userSegments: formData.selectedSegments,
        targetSegment: formData.targetSegment,
        targetUserIds: formData.targetUserIds.split('\n').map(s => s.trim()).filter(Boolean),
        targetZones: formData.targetZones,
        paymentRestriction: formData.paymentRestriction,
        showInSections: formData.showInSections,
        priorityRank: parseInt(formData.priorityRank),
        bannerImageUrl: formData.bannerImageUrl,
        themeColor: formData.themeColor,
        deepLink: formData.deepLink || `organicapp://coupon/${couponCode}`,
        termsAndConditions: formData.termsAndConditions,
        cashbackCreditTrigger: formData.cashbackCreditTrigger,
        cashbackExpiryDays: parseInt(formData.cashbackExpiryDays),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date(new Date(formData.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        validDays: formData.validDays,
        validTimeSlots: formData.validTimeSlots,
      };
      
      if (editCoupon) {
        await updateCoupon(editCoupon.id, couponData as any);
        toast.success(`Coupon "${couponCode}" updated successfully`);
      } else {
        await createCoupon(couponData as any);
        toast.success(`Coupon "${couponCode}" created successfully`);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Ticket className="text-purple-600" size={20} />
            </div>
            <div>
              <DialogTitle>{editCoupon ? 'Edit Coupon Code' : 'Create Coupon Code'}</DialogTitle>
              <DialogDescription>{editCoupon ? 'Update coupon details and logic' : 'Generate a new discount coupon for customers'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {/* SECTION 1 — Basic identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Ticket className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-base">SECTION 1 — Basic Identity</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Coupon Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    placeholder="e.g., SUMMER25"
                    value={formData.code}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/\s/g, '');
                      handleChange('code', val);
                      handleChange('deep_link', `organicapp://coupon/${val}`);
                    }}
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
                <p className="text-xs text-[#71717a]">Uppercase only, no spaces, no special chars</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-name">Display Name *</Label>
                <Input
                  id="coupon-name"
                  placeholder="e.g., Summer Special Discount"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                <p className="text-xs text-[#71717a]">Shown to customer in app</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-description">Description</Label>
              <Textarea
                id="coupon-description"
                placeholder="Describe the coupon benefits and usage..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
              />
              <p className="text-xs text-[#71717a]">Shown in coupon detail screen</p>
            </div>

            <div className="space-y-2">
              <Label>Coupon Type *</Label>
              <Select value={formData.discountType} onValueChange={(val: any) => handleChange('discountType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT_DISCOUNT">Flat Discount (₹)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                  <SelectItem value="BOGO">BOGO (Buy X Get Y)</SelectItem>
                  <SelectItem value="CASHBACK">Cashback</SelectItem>
                  <SelectItem value="TIERED_FLAT">Tiered Flat Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* SECTION 2 — Discount value */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <DollarSign className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-base">SECTION 2 — Discount Value</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.discountType !== 'FREE_DELIVERY' && formData.discountType !== 'BOGO' && formData.discountType !== 'TIERED_FLAT' && (
                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    Discount Value * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id="discount-value"
                    type="number"
                    placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '100'}
                    value={formData.discountValue}
                    onChange={(e) => handleChange('discountValue', e.target.value)}
                    min="0"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="min-order">Minimum Order Value (₹) *</Label>
                <Input
                  id="min-order"
                  type="number"
                  placeholder="0"
                  value={formData.minOrderValue}
                  onChange={(e) => handleChange('minOrderValue', e.target.value)}
                  min="0"
                />
                <p className="text-xs text-[#71717a]">Minimum cart value to unlock</p>
              </div>

              {(formData.discountType === 'PERCENTAGE' || formData.discountType === 'FREE_DELIVERY') && (
                <div className="space-y-2">
                  <Label htmlFor="max-discount">Maximum discount cap (₹)</Label>
                  <Input
                    id="max-discount"
                    type="number"
                    placeholder="No limit"
                    value={formData.maxDiscount}
                    onChange={(e) => handleChange('maxDiscount', e.target.value)}
                    min="0"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Discount On *</Label>
                <Select value={formData.discountOn} onValueChange={(val: any) => handleChange('discountOn', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CART_TOTAL">Cart Total</SelectItem>
                    <SelectItem value="DELIVERY_FEE">Delivery Fee</SelectItem>
                    <SelectItem value="CATEGORY">Specific Category</SelectItem>
                    <SelectItem value="SPECIFIC_SKU">Specific SKU IDs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.discountOn === 'CATEGORY' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <Label>Applicable Categories *</Label>
                {refsLoading ? (
                  <p className="text-sm text-[#71717a]">Loading categories...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={formData.selectedCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <Label htmlFor={`cat-${cat.id}`} className="text-xs cursor-pointer">{cat.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formData.discountOn === 'SPECIFIC_SKU' && (
              <div className="space-y-2">
                <Label htmlFor="applicable-skus">Applicable SKU IDs *</Label>
                <Input
                  id="applicable-skus"
                  placeholder="e.g., SKU001, SKU002, SKU003"
                  value={formData.applicableSkuIds}
                  onChange={(e) => handleChange('applicableSkuIds', e.target.value)}
                />
                <p className="text-xs text-[#71717a]">Comma-separated list of product SKUs</p>
              </div>
            )}

            {formData.discountType === 'TIERED_FLAT' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Discount Tiers</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTier}>
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
                {formData.tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Min Order (₹)</Label>
                      <Input
                        type="number"
                        value={tier.minOrder}
                        onChange={(e) => handleTierChange(idx, 'minOrder', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Discount (₹)</Label>
                      <Input
                        type="number"
                        value={tier.discountAmount}
                        onChange={(e) => handleTierChange(idx, 'discountAmount', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(idx)} className="mt-5 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {formData.discountType === 'BOGO' && (
              <div className="space-y-2">
                <Label htmlFor="bogo-qty">BOGO Minimum Quantity *</Label>
                <Input
                  id="bogo-qty"
                  type="number"
                  value={formData.bogoMinQty}
                  onChange={(e) => handleChange('bogoMinQty', e.target.value)}
                  min="1"
                />
                <p className="text-xs text-[#71717a]">Default: 2 (Buy 1 Get 1)</p>
              </div>
            )}
          </div>

          <Separator />

          {/* SECTION 3 — Validity window */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-base">SECTION 3 — Validity Window</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date & Time (IST) *</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date & Time (IST) *</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Valid Days</Label>
              <div className="flex flex-wrap gap-3">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={formData.validDays.includes(day)}
                      onCheckedChange={() => toggleValidDay(day)}
                    />
                    <Label htmlFor={`day-${day}`} className="text-xs cursor-pointer">{day}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#71717a]">Empty = all days valid</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Valid Time Slots</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                  <Plus className="w-3 h-3 mr-1" /> Add Slot
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {formData.validTimeSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/20 rounded border">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <Input
                      type="time"
                      value={slot.from}
                      onChange={(e) => handleTimeSlotChange(idx, 'from', e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <span className="text-xs">to</span>
                    <Input
                      type="time"
                      value={slot.to}
                      onChange={(e) => handleTimeSlotChange(idx, 'to', e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(idx)} className="h-7 w-7 text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#71717a]">Empty = all day valid</p>
            </div>
          </div>

          <Separator />

          {/* SECTION 4 — Usage limits */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Zap className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-base">SECTION 4 — Usage Limits</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usage-limit">Total Redemption Limit</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  placeholder="0"
                  value={formData.usageLimit}
                  onChange={(e) => handleChange('usageLimit', e.target.value)}
                  min="0"
                />
                <p className="text-xs text-[#71717a]">0 means unlimited usage</p>
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

            <div className="grid grid-cols-3 gap-4 py-2">
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded border">
                <div className="space-y-0.5">
                  <Label className="text-xs">First Order Only</Label>
                </div>
                <Switch
                  checked={formData.isFirstOrderOnly}
                  onCheckedChange={(val) => handleChange('isFirstOrderOnly', val)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded border">
                <div className="space-y-0.5">
                  <Label className="text-xs">Stackable</Label>
                </div>
                <Switch
                  checked={formData.isStackable}
                  onCheckedChange={(val) => handleChange('isStackable', val)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded border">
                <div className="space-y-0.5">
                  <Label className="text-xs">Exclude Sale Items</Label>
                </div>
                <Switch
                  checked={formData.excludeSaleItems}
                  onCheckedChange={(val) => handleChange('excludeSaleItems', val)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* SECTION 5 — Customer targeting */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="w-4 h-4 text-pink-600" />
              <h3 className="font-semibold text-base">SECTION 5 — Customer Targeting</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Segment *</Label>
                <Select value={formData.targetSegment} onValueChange={(val: any) => handleChange('targetSegment', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_USERS">All Users</SelectItem>
                    <SelectItem value="NEW_USERS">New Users (No orders)</SelectItem>
                    <SelectItem value="LAPSED_7D">Lapsed (No order in 7 days)</SelectItem>
                    <SelectItem value="LAPSED_30D">Lapsed (No order in 30 days)</SelectItem>
                    <SelectItem value="VIP_TIER">VIP Tier Users</SelectItem>
                    <SelectItem value="SPECIFIC_USER_IDS">Specific User IDs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Restriction *</Label>
                <Select value={formData.paymentRestriction} onValueChange={(val: any) => handleChange('paymentRestriction', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Payment Methods</SelectItem>
                    <SelectItem value="UPI">UPI Only</SelectItem>
                    <SelectItem value="COD">COD Only</SelectItem>
                    <SelectItem value="WALLET">Wallet Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.targetSegment === 'SPECIFIC_USER_IDS' && (
              <div className="space-y-2">
                <Label htmlFor="target-user-ids">Target User IDs *</Label>
                <Textarea
                  id="target-user-ids"
                  placeholder="Enter user IDs, one per line..."
                  value={formData.targetUserIds}
                  onChange={(e) => handleChange('targetUserIds', e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <Label>Target Zones (Empty = all zones)</Label>
              {refsLoading ? (
                <p className="text-sm text-[#71717a]">Loading zones...</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {zones.map(zone => (
                    <div key={zone.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`zone-${zone.id}`}
                        checked={formData.targetZones.includes(zone.id)}
                        onCheckedChange={() => toggleTargetZone(zone.id)}
                      />
                      <Label htmlFor={`zone-${zone.id}`} className="text-xs cursor-pointer">{zone.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* SECTION 6 — App display settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-base">SECTION 6 — App Display Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Show In Sections</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['HOME_BANNER', 'COUPON_LIST', 'CART_NUDGE', 'CHECKOUT_SCREEN'].map(section => (
                    <div key={section} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={formData.showInSections.includes(section)}
                        onCheckedChange={() => toggleShowInSection(section)}
                      />
                      <Label htmlFor={`section-${section}`} className="text-xs cursor-pointer">{section.replace('_', ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-rank">Priority Rank</Label>
                <Input
                  id="priority-rank"
                  type="number"
                  value={formData.priorityRank}
                  onChange={(e) => handleChange('priorityRank', e.target.value)}
                  min="1"
                />
                <p className="text-xs text-[#71717a]">1 = shown first in app</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banner-url">Banner Image URL</Label>
                <Input
                  id="banner-url"
                  placeholder="https://..."
                  value={formData.bannerImageUrl}
                  onChange={(e) => handleChange('bannerImageUrl', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-color">Theme Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="theme-color"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => handleChange('themeColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.themeColor}
                    onChange={(e) => handleChange('themeColor', e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deep-link">Deep Link (Auto-generated)</Label>
              <Input
                id="deep-link"
                value={formData.deepLink || (formData.code ? `organicapp://coupon/${formData.code}` : '')}
                readOnly
                className="bg-muted font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Fine print for the coupon usage..."
                value={formData.termsAndConditions}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION 7 — Cashback settings */}
          {formData.discountType === 'CASHBACK' && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <h3 className="font-semibold text-base">SECTION 7 — Cashback Settings</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cashback Credit Trigger *</Label>
                    <Select value={formData.cashbackCreditTrigger} onValueChange={(val: any) => handleChange('cashbackCreditTrigger', val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORDER_DELIVERED">Order Delivered</SelectItem>
                        <SelectItem value="ORDER_PLACED">Order Placed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashback-expiry">Cashback Expiry Days *</Label>
                    <Input
                      id="cashback-expiry"
                      type="number"
                      value={formData.cashbackExpiryDays}
                      onChange={(e) => handleChange('cashbackExpiryDays', e.target.value)}
                      min="1"
                    />
                    <p className="text-xs text-[#71717a]">Days wallet credit is valid</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Preview */}
          {formData.code && (
            <div className="mt-8 space-y-3">
              <Label>App Preview</Label>
              <div 
                className="p-6 rounded-2xl text-white relative overflow-hidden shadow-lg"
                style={{ backgroundColor: formData.themeColor }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Ticket size={120} />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} />
                      <span className="text-xs font-bold tracking-widest uppercase opacity-90">SPECIAL OFFER</span>
                    </div>
                    <div className="text-4xl font-black font-mono tracking-tighter mb-1">{formData.code}</div>
                    <div className="text-lg font-medium opacity-90">{formData.name}</div>
                    {formData.minOrderValue && parseFloat(formData.minOrderValue) > 0 && (
                      <div className="text-xs mt-4 py-1 px-3 bg-black/20 rounded-full inline-block">
                        On orders above ₹{formData.minOrderValue}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {formData.discountType === 'PERCENTAGE' && formData.discountValue && (
                      <div className="text-5xl font-black">{formData.discountValue}%<span className="text-2xl ml-1">OFF</span></div>
                    )}
                    {formData.discountType === 'FLAT_DISCOUNT' && formData.discountValue && (
                      <div className="text-5xl font-black">₹{formData.discountValue}<span className="text-2xl ml-1">OFF</span></div>
                    )}
                    {formData.discountType === 'FREE_DELIVERY' && (
                      <div className="text-3xl font-black">FREE<br/>DELIVERY</div>
                    )}
                    {formData.discountType === 'CASHBACK' && formData.discountValue && (
                      <div className="text-4xl font-black">₹{formData.discountValue}<br/><span className="text-xl">CASHBACK</span></div>
                    )}
                    {formData.discountType === 'BOGO' && (
                      <div className="text-4xl font-black uppercase">BOGO</div>
                    )}
                    {formData.discountType === 'TIERED_FLAT' && (
                      <div className="text-2xl font-black uppercase text-white/80">Tiered Savings</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-[#e4e4e7]">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 min-w-[140px]">
            {loading ? (editCoupon ? 'Updating...' : 'Creating...') : (editCoupon ? 'Update Coupon' : 'Create Coupon')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
