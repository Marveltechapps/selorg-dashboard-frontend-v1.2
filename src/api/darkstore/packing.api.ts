/**
 * Packing API — aligned with /darkstore/packing backend responses
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/packing';

export interface PackQueueOrder {
  id: string;
  picker: string;
  sla: string;
  items: number;
  status: string;
}

export interface PackQueueSummary {
  total: number;
  pending: number;
  packing: number;
}

export interface PackOrderItem {
  sku: string;
  name: string;
  qty: number;
  weight?: string;
  status: 'pending' | 'scanned' | 'missing' | 'damaged' | string;
}

export interface PackOrderDetail {
  id: string;
  customerName?: string;
  orderType?: string;
  slaTime?: string;
  slaStatus?: string;
  picker?: string;
  status?: string;
  items: PackOrderItem[];
}

export async function getPackQueue(params?: {
  status?: string;
  storeId?: string;
}): Promise<{ success: boolean; data: { orders: PackQueueOrder[]; summary: PackQueueSummary } }> {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  const url = queryString ? `${BASE_PATH}/queue?${queryString}` : `${BASE_PATH}/queue`;
  return apiRequest(url);
}

export async function getOrderDetails(
  orderId: string
): Promise<{ success: boolean; data: PackOrderDetail }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}`);
}

export async function scanItem(
  orderId: string,
  sku: string,
  quantity: number
): Promise<{ success: boolean; data: PackOrderDetail; message?: string }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/scan`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity }),
  });
}

export async function completeOrder(
  orderId: string
): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/complete`, {
    method: 'POST',
  });
}

export async function reportMissingItem(
  orderId: string,
  sku: string,
  quantity: number,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/report-missing`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity, reason }),
  });
}

export async function reportDamagedItem(
  orderId: string,
  sku: string,
  quantity: number,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`${BASE_PATH}/orders/${orderId}/report-damaged`, {
    method: 'POST',
    body: JSON.stringify({ sku, quantity, reason }),
  });
}
