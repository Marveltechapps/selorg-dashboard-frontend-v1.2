/**
 * Packing API
 * Handles packing operations for Darkstore/Production dashboards
 */

import { API_CONFIG } from '../config/api';
import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/packing';

export interface PackOrder {
  orderId: string;
  status: 'pending' | 'packing' | 'completed' | 'exception';
  items: Array<{
    sku: string;
    quantity: number;
    scanned?: boolean;
    missing?: boolean;
    damaged?: boolean;
  }>;
  assignedPacker?: {
    id: string;
    name: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PackQueue {
  orders: PackOrder[];
  summary: {
    total: number;
    pending: number;
    packing: number;
    completed: number;
    exceptions: number;
  };
}

/**
 * Get packing queue
 */
export async function getPackQueue(params?: {
  status?: string;
  storeId?: string;
}): Promise<{ success: boolean; data: PackQueue }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/queue?${queryString}` : `${BASE_PATH}/queue`;
  return apiRequest(url);
}

/**
 * Get order details for packing
 */
export async function getOrderDetails(
  orderId: string
): Promise<{ success: boolean; data: PackOrder }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}`);
}

/**
 * Scan item during packing
 */
export async function scanItem(
  orderId: string,
  sku: string,
  quantity: number
): Promise<{ success: boolean; data: PackOrder }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/scan`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity }),
  });
}

/**
 * Complete order packing
 */
export async function completeOrder(
  orderId: string
): Promise<{ success: boolean; data: PackOrder }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/complete`, {
    method: 'POST',
  });
}

/**
 * Report missing item
 */
export async function reportMissingItem(
  orderId: string,
  sku: string,
  quantity: number,
  reason?: string
): Promise<{ success: boolean; data: PackOrder }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/report-missing`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity, reason }),
  });
}

/**
 * Report damaged item
 */
export async function reportDamagedItem(
  orderId: string,
  sku: string,
  quantity: number,
  reason?: string
): Promise<{ success: boolean; data: PackOrder }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/report-damaged`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity, reason }),
  });
}
