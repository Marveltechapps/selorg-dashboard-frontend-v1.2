/**
 * Merch API
 * Comprehensive merch & promo dashboard API client
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch';

export interface MerchStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPromotions: number;
  revenueImpact: number;
  stockConflicts: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  products: string[];
  performance?: {
    orders: number;
    revenue: number;
    uplift: number;
  };
}

export interface StockConflict {
  id: string;
  sku: string;
  productName: string;
  conflictType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
}

export interface PromoUplift {
  id: string;
  campaignId: string;
  sku: string;
  uplift: number;
  baselineSales: number;
  promoSales: number;
  revenue: number;
}

export interface PriceChange {
  id: string;
  sku: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changeType: 'increase' | 'decrease';
  reason: string;
  effectiveDate: string;
}

/**
 * Get merch stats
 */
export async function getMerchStats(): Promise<{ success: boolean; data: MerchStats }> {
  return apiRequest(`${BASE_PATH}/overview/stats`);
}

/**
 * Get stock conflicts
 */
export async function getStockConflicts(): Promise<{ success: boolean; data: StockConflict[] }> {
  return apiRequest(`${BASE_PATH}/overview/conflicts`);
}

/**
 * Create stock conflict
 */
export async function createStockConflict(
  data: Omit<StockConflict, 'id' | 'createdAt'>
): Promise<{ success: boolean; data: StockConflict }> {
  return apiRequest(`${BASE_PATH}/overview/conflicts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get promo uplift
 */
export async function getPromoUplift(): Promise<{ success: boolean; data: PromoUplift[] }> {
  return apiRequest(`${BASE_PATH}/overview/uplift`);
}

/**
 * Create promo uplift
 */
export async function createPromoUplift(
  data: Omit<PromoUplift, 'id'>
): Promise<{ success: boolean; data: PromoUplift }> {
  return apiRequest(`${BASE_PATH}/overview/uplift`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get price changes
 */
export async function getPriceChanges(): Promise<{ success: boolean; data: PriceChange[] }> {
  return apiRequest(`${BASE_PATH}/overview/price-changes`);
}

/**
 * Create price change
 */
export async function createPriceChange(
  data: Omit<PriceChange, 'id'>
): Promise<{ success: boolean; data: PriceChange }> {
  return apiRequest(`${BASE_PATH}/overview/price-changes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get campaigns
 */
export async function getCampaigns(params?: {
  status?: string;
  type?: string;
}): Promise<{ success: boolean; data: Campaign[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/campaigns?${queryString}` : `${BASE_PATH}/campaigns`;
  return apiRequest(url);
}

/**
 * Get campaign by ID
 */
export async function getCampaign(id: string): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`);
}

/**
 * Create campaign
 */
export async function createCampaign(
  data: Omit<Campaign, 'id' | 'performance'>
): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update campaign
 */
export async function updateCampaign(
  id: string,
  data: Partial<Campaign>
): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`, {
    method: 'DELETE',
  });
}
