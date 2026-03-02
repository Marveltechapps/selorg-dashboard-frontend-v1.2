/**
 * Picklists API
 * Handles picklist operations for Darkstore/Production dashboards
 */

import { API_CONFIG } from '../config/api';
import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/picklists';

export interface Picklist {
  id: string;
  orderIds: string[];
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  assignedPicker?: {
    id: string;
    name: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  items: Array<{
    sku: string;
    quantity: number;
    location: string;
    picked?: boolean;
  }>;
}

export interface CreatePicklistRequest {
  orderIds: string[];
  priority?: 'low' | 'medium' | 'high';
  storeId?: string;
}

export interface PicklistDetails extends Picklist {
  progress: {
    totalItems: number;
    pickedItems: number;
    percentage: number;
  };
  estimatedCompletion?: string;
}

/**
 * Get all picklists
 */
export async function getPicklists(params?: {
  status?: string;
  storeId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: Picklist[]; pagination?: any }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiRequest(url);
}

/**
 * Create a new picklist
 */
export async function createPicklist(
  data: CreatePicklistRequest
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get picklist details
 */
export async function getPicklistDetails(
  picklistId: string
): Promise<{ success: boolean; data: PicklistDetails }> {
  return apiRequest(`${BASE_PATH}/${picklistId}`);
}

/**
 * Start picking
 */
export async function startPicking(
  picklistId: string
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/start`, {
    method: 'POST',
  });
}

/**
 * Update picking progress
 */
export async function updateProgress(
  picklistId: string,
  progress: number
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ progress }),
  });
}

/**
 * Pause picking
 */
export async function pausePicking(
  picklistId: string
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/pause`, {
    method: 'POST',
  });
}

/**
 * Complete picking
 */
export async function completePicking(
  picklistId: string
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/complete`, {
    method: 'POST',
  });
}

/**
 * Assign picker to picklist
 */
export async function assignPicker(
  picklistId: string,
  pickerId: string
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ pickerId }),
  });
}

/**
 * Move picklist to packing
 */
export async function moveToPacking(
  picklistId: string
): Promise<{ success: boolean; data: Picklist }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/move-to-packing`, {
    method: 'POST',
  });
}
