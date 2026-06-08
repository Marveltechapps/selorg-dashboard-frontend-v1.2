/**
 * Picklists API — aligned with /darkstore/picklists backend responses
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/picklists';

export interface PicklistRow {
  id: string;
  zone?: string;
  slaTime?: string;
  slaStatus?: string;
  items: number;
  orders: number;
  status: string;
  progress?: number;
  picker?: { name: string; avatar?: string };
  suggestedPicker?: string;
  priority?: string;
}

export interface CreatePicklistRequest {
  orderIds?: string[];
  zone?: string;
  priority?: 'low' | 'medium' | 'high' | 'normal';
  storeId?: string;
  orders?: Array<{ orderId: string; items?: Array<{ sku: string; quantity: number }> }>;
}

export async function getPicklists(params?: {
  status?: string;
  storeId?: string;
  zone?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: PicklistRow[]; pagination?: { total: number } }> {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiRequest(url);
}

export async function createPicklist(
  data: CreatePicklistRequest
): Promise<{ success: boolean; data: PicklistRow }> {
  return apiRequest(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPicklistDetails(
  picklistId: string
): Promise<{ success: boolean; data: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}`);
}

export async function startPicking(
  picklistId: string
): Promise<{ success: boolean; data?: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/start`, { method: 'POST' });
}

export async function pausePicking(
  picklistId: string
): Promise<{ success: boolean; data?: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/pause`, { method: 'POST' });
}

export async function completePicking(
  picklistId: string
): Promise<{ success: boolean; data?: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/complete`, { method: 'POST' });
}

export async function assignPicker(
  picklistId: string,
  pickerId: string
): Promise<{ success: boolean; data?: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ pickerId }),
  });
}

export async function moveToPacking(
  picklistId: string
): Promise<{ success: boolean; data?: PicklistRow }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/move-to-packing`, { method: 'POST' });
}
