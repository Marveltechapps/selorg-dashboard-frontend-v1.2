/**
 * Merch Pricing API
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch/pricing';

export interface PricingSKU {
  id: string;
  sku: string;
  name: string;
  currentPrice: number;
  basePrice: number;
  surgeMultiplier?: number;
}

export interface SurgeRule {
  id: string;
  name: string;
  conditions: any;
  multiplier: number;
  status: 'active' | 'inactive';
}

export interface PendingUpdate {
  id: string;
  sku: string;
  changeType: 'price' | 'surge';
  oldValue: any;
  newValue: any;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Get pricing SKUs
 */
export async function getPricingSKUs(): Promise<{ success: boolean; data: PricingSKU[] }> {
  return apiRequest(`${BASE_PATH}/skus`);
}

/**
 * Update SKU price
 */
export async function updateSKUPrice(id: string, price: number): Promise<{ success: boolean; data: PricingSKU }> {
  return apiRequest(`${BASE_PATH}/skus/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ price }),
  });
}

/**
 * Get surge rules
 */
export async function getSurgeRules(): Promise<{ success: boolean; data: SurgeRule[] }> {
  return apiRequest(`${BASE_PATH}/surge-rules`);
}

/**
 * Create surge rule
 */
export async function createSurgeRule(data: Omit<SurgeRule, 'id'>): Promise<{ success: boolean; data: SurgeRule }> {
  return apiRequest(`${BASE_PATH}/surge-rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update surge rule
 */
export async function updateSurgeRule(id: string, data: Partial<SurgeRule>): Promise<{ success: boolean; data: SurgeRule }> {
  return apiRequest(`${BASE_PATH}/surge-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete surge rule
 */
export async function deleteSurgeRule(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/surge-rules/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get pending updates
 */
export async function getPendingUpdates(): Promise<{ success: boolean; data: PendingUpdate[] }> {
  return apiRequest(`${BASE_PATH}/pending-updates`);
}

/**
 * Handle pending update
 */
export async function handlePendingUpdate(id: string, action: 'approve' | 'reject'): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/pending-updates/${id}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}
