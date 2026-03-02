/**
 * Outbound API
 * Handles outbound operations for Darkstore/Production dashboards
 */

import { API_CONFIG } from '../config/api';
import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/outbound';

export interface OutboundSummary {
  totalOrders: number;
  pendingDispatch: number;
  inTransit: number;
  delivered: number;
  rto: number;
  activeRiders: number;
  averageDeliveryTime: number;
}

export interface DispatchOrder {
  orderId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'rto';
  assignedRider?: {
    id: string;
    name: string;
    phone: string;
  };
  customerAddress: string;
  estimatedDelivery?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface ActiveRider {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  currentOrders: number;
  maxCapacity: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface TransferRequest {
  requestId: string;
  fromStore: string;
  toStore: string;
  orders: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed';
  requestedAt: string;
  slaDeadline?: string;
}

/**
 * Get outbound summary
 */
export async function getOutboundSummary(params?: {
  storeId?: string;
}): Promise<{ success: boolean; data: OutboundSummary }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/summary?${queryString}` : `${BASE_PATH}/summary`;
  return apiRequest(url);
}

/**
 * Get dispatch queue
 */
export async function getDispatchQueue(params?: {
  status?: string;
  storeId?: string;
}): Promise<{ success: boolean; data: DispatchOrder[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/dispatch?${queryString}` : `${BASE_PATH}/dispatch`;
  return apiRequest(url);
}

/**
 * Get active riders
 */
export async function getActiveRiders(params?: {
  storeId?: string;
}): Promise<{ success: boolean; data: ActiveRider[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/riders?${queryString}` : `${BASE_PATH}/riders`;
  return apiRequest(url);
}

/**
 * Batch dispatch orders
 */
export async function batchDispatchOrders(
  orderIds: string[],
  options?: {
    autoAssign?: boolean;
    priority?: 'low' | 'medium' | 'high';
  }
): Promise<{ success: boolean; data: { assigned: number; failed: number } }> {
  return apiRequest(`${BASE_PATH}/dispatch/batch`, {
    method: 'POST',
    body: JSON.stringify({ orderIds, ...options }),
  });
}

/**
 * Manually assign rider to order
 */
export async function manuallyAssignRider(
  orderId: string,
  riderId: string
): Promise<{ success: boolean; data: DispatchOrder }> {
  return apiRequest(`${BASE_PATH}/dispatch/assign`, {
    method: 'POST',
    body: JSON.stringify({ orderId, riderId }),
  });
}

/**
 * Get outbound transfer requests
 */
export async function getOutboundTransferRequests(params?: {
  status?: string;
  storeId?: string;
}): Promise<{ success: boolean; data: TransferRequest[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/transfers?${queryString}` : `${BASE_PATH}/transfers`;
  return apiRequest(url);
}

/**
 * Approve transfer request
 */
export async function approveTransferRequest(
  requestId: string
): Promise<{ success: boolean; data: TransferRequest }> {
  return apiRequest(`${BASE_PATH}/transfers/${requestId}/approve`, {
    method: 'POST',
  });
}

/**
 * Reject transfer request
 */
export async function rejectTransferRequest(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; data: TransferRequest }> {
  return apiRequest(`${BASE_PATH}/transfers/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Get transfer fulfillment status
 */
export async function getTransferFulfillmentStatus(
  requestId: string
): Promise<{ success: boolean; data: TransferRequest }> {
  return apiRequest(`${BASE_PATH}/transfers/${requestId}/fulfillment`);
}

/**
 * Get transfer SLA summary
 */
export async function getTransferSLASummary(params?: {
  storeId?: string;
}): Promise<{ success: boolean; data: any }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/transfers/sla-summary?${queryString}` : `${BASE_PATH}/transfers/sla-summary`;
  return apiRequest(url);
}
