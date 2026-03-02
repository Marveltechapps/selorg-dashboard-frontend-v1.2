/**
 * Rider API
 * Comprehensive rider operations API client
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/rider';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicleType?: string;
  location?: {
    lat: number;
    lng: number;
    lastUpdated: string;
  };
  performance?: {
    totalDeliveries: number;
    averageRating: number;
    onTimeRate: number;
  };
}

export interface RiderDistribution {
  total: number;
  active: number;
  inactive: number;
  byZone: Record<string, number>;
}

/**
 * List all riders
 */
export async function listRiders(params?: {
  status?: string;
  zone?: string;
}): Promise<{ success: boolean; data: Rider[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiRequest(url);
}

/**
 * Create rider
 */
export async function createRider(data: Omit<Rider, 'id' | 'performance'>): Promise<{ success: boolean; data: Rider }> {
  return apiRequest(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get rider by ID
 */
export async function getRiderById(riderId: string): Promise<{ success: boolean; data: Rider }> {
  return apiRequest(`${BASE_PATH}/${riderId}`);
}

/**
 * Update rider
 */
export async function updateRider(riderId: string, data: Partial<Rider>): Promise<{ success: boolean; data: Rider }> {
  return apiRequest(`${BASE_PATH}/${riderId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get rider location
 */
export async function getRiderLocation(riderId: string): Promise<{ success: boolean; data: Rider['location'] }> {
  return apiRequest(`${BASE_PATH}/${riderId}/location`);
}

/**
 * Get rider distribution
 */
export async function getRiderDistribution(): Promise<{ success: boolean; data: RiderDistribution }> {
  return apiRequest(`${BASE_PATH}/distribution`);
}
