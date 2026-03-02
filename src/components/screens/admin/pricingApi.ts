import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface BasePrice {
  id: string;
  productSku: string;
  productName: string;
  category: string;
  basePrice: number;
  costPrice: number;
  margin: number;
  marginPercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'active' | 'scheduled' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface SurgeRule {
  id: string;
  name: string;
  description: string;
  type: 'time_based' | 'demand_based' | 'zone_based' | 'event_based';
  multiplier: number;
  conditions: {
    timeSlots?: { start: string; end: string; days: string[] }[];
    zones?: string[];
    demandThreshold?: number;
    eventType?: string;
  };
  applicableCategories: string[];
  applicableProducts: string[];
  priority: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface DiscountCampaign {
  id: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'flat' | 'buy_x_get_y';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  applicableCategories: string[];
  applicableProducts: string[];
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  stackable: boolean;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: 'percentage' | 'flat' | 'free_delivery';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usagePerUser: number;
  usageCount: number;
  applicableCategories: string[];
  applicableProducts: string[];
  userSegments: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'paused';
  createdAt: string;
}

export interface FlashSale {
  id: string;
  name: string;
  description: string;
  products: {
    sku: string;
    name: string;
    originalPrice: number;
    salePrice: number;
    discount: number;
    stockLimit: number;
    soldCount: number;
  }[];
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
  visibility: 'public' | 'members_only';
  createdAt: string;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  products: {
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalOriginalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  imageUrl: string;
  stockLimit: number | null;
  soldCount: number;
  status: 'active' | 'inactive';
  featured: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface PricingStats {
  totalRevenue: number;
  discountedRevenue: number;
  totalDiscount: number;
  avgOrderValue: number;
  activeDiscounts: number;
  activeCoupons: number;
  couponRedemptionRate: number;
}

export interface CategoryRef {
  id: string;
  name: string;
}

export interface ZoneRef {
  id: string;
  name: string;
}

// --- API Functions (no mocks, no fallbacks) ---

export async function fetchBasePrices(): Promise<BasePrice[]> {
  return [];
}

export async function fetchSurgeRules(): Promise<SurgeRule[]> {
  const response = await apiRequest<{ success: boolean; data: SurgeRule[] }>('/merch/pricing/surge-rules');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchDiscountCampaigns(): Promise<DiscountCampaign[]> {
  const response = await apiRequest<{ success: boolean; data: DiscountCampaign[] }>('/merch/pricing/discounts');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const response = await apiRequest<{ success: boolean; data: Coupon[] }>('/merch/pricing/coupons');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchFlashSales(): Promise<FlashSale[]> {
  const response = await apiRequest<{ success: boolean; data: FlashSale[] }>('/merch/pricing/flash-sales');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchBundles(): Promise<Bundle[]> {
  const response = await apiRequest<{ success: boolean; data: Bundle[] }>('/merch/pricing/bundles');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchPricingStats(): Promise<PricingStats> {
  const response = await apiRequest<{ success: boolean; data: PricingStats }>('/merch/pricing/stats');
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch pricing stats');
  }
  return response.data;
}

export async function fetchReferencesCategories(): Promise<CategoryRef[]> {
  const response = await apiRequest<{ success: boolean; data: CategoryRef[] }>('/merch/pricing/references/categories');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function fetchReferencesZones(): Promise<ZoneRef[]> {
  const response = await apiRequest<{ success: boolean; data: ZoneRef[] }>('/merch/pricing/references/zones');
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Invalid response');
  }
  return response.data;
}

export async function createSurgeRule(data: Partial<SurgeRule>): Promise<SurgeRule> {
  const response = await apiRequest<{ success: boolean; data: SurgeRule }>('/merch/pricing/surge-rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function updateSurgeRule(id: string, data: Partial<SurgeRule>): Promise<SurgeRule> {
  const response = await apiRequest<{ success: boolean; data: SurgeRule }>(`/merch/pricing/surge-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function deleteSurgeRule(id: string): Promise<void> {
  await apiRequest(`/merch/pricing/surge-rules/${id}`, {
    method: 'DELETE',
  });
}

export async function createDiscount(data: Partial<DiscountCampaign>): Promise<DiscountCampaign> {
  const response = await apiRequest<{ success: boolean; data: DiscountCampaign }>('/merch/pricing/discounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function updateDiscountCampaign(id: string, data: Partial<DiscountCampaign>): Promise<DiscountCampaign> {
  const response = await apiRequest<{ success: boolean; data: DiscountCampaign }>(`/merch/pricing/discounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function deleteDiscountCampaign(id: string): Promise<void> {
  await apiRequest(`/merch/pricing/discounts/${id}`, {
    method: 'DELETE',
  });
}

export async function createCoupon(data: Partial<Coupon>): Promise<Coupon> {
  const response = await apiRequest<{ success: boolean; data: Coupon }>('/merch/pricing/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function createFlashSale(data: Partial<FlashSale>): Promise<FlashSale> {
  const response = await apiRequest<{ success: boolean; data: FlashSale }>('/merch/pricing/flash-sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function createBundle(data: Partial<Bundle>): Promise<Bundle> {
  const response = await apiRequest<{ success: boolean; data: Bundle }>('/merch/pricing/bundles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiRequest(`/merch/pricing/coupons/${id}`, {
    method: 'DELETE',
  });
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
  const response = await apiRequest<{ success: boolean; data: Coupon }>(`/merch/pricing/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function updateCouponStatus(id: string, status: 'active' | 'paused' | 'expired'): Promise<Coupon> {
  const response = await apiRequest<{ success: boolean; data: Coupon }>(`/merch/pricing/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  if (!response.success || !response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

export async function generateCouponCode(): Promise<string> {
  const response = await apiRequest<{ success: boolean; data: { code: string } }>('/merch/pricing/coupons/generate-code', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!response.success || !response.data?.code) {
    throw new Error('Could not generate coupon code');
  }
  return response.data.code;
}
