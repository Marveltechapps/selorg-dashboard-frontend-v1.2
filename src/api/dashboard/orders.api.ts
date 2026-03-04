/**
 * Order API functions for Darkstore Dashboard.
 * Sends Authorization: Bearer <token> for protected routes.
 * No mock fallbacks - propagates errors to caller.
 */

import { API_CONFIG } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

const BASE = (API_CONFIG.baseURL ?? '').replace(/\/$/, '') || '/api/v1';

function authHeaders(): Record<string, string> {
  const raw = getAuthToken();
  const token = typeof raw === 'string' ? raw.trim() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const base = BASE.startsWith('http') ? BASE : `${window.location.origin}${BASE.startsWith('/') ? '' : '/'}${BASE}`;
  const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
  return new URL(path, baseWithSlash).toString();
}

async function fetchJson(method: string, endpoint: string, data?: Record<string, unknown>) {
  const url = buildUrl(endpoint);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: authHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error('Backend server is unreachable. Please ensure it is running.');
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `API Error: ${response.statusText}`);
  }
  return response.json();
}

async function post(endpoint: string, data?: Record<string, unknown>) {
  return fetchJson('POST', endpoint, data);
}

async function patch(endpoint: string, data?: Record<string, unknown>) {
  return fetchJson('PATCH', endpoint, data);
}

/**
 * Call customer for order. Backend expects POST /api/v1/darkstore/orders/:orderId/call-customer.
 */
export async function callCustomer(orderId: string, options?: string | { reason?: string; phoneNumber?: string }) {
  const body: Record<string, unknown> = {};
  if (typeof options === 'string') {
    body.phoneNumber = options;
  } else if (options && typeof options === 'object') {
    if (options.phoneNumber) body.phoneNumber = options.phoneNumber;
    if (options.reason) body.reason = options.reason;
  }
  const result = await post(`/darkstore/orders/${orderId}/call-customer`, Object.keys(body).length ? body : undefined);
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to call customer');
  }
  return result;
}

/**
 * Mark order as RTO. Backend expects POST /api/v1/darkstore/orders/:orderId/mark-rto.
 */
export async function markRTO(orderId: string, reason?: string | { reason?: string; notes?: string; rto_status?: string }) {
  const body: Record<string, unknown> = {};
  if (typeof reason === 'string') {
    body.reason = reason;
  } else if (reason && typeof reason === 'object') {
    if (reason.reason) body.reason = reason.reason;
    if (reason.notes) body.notes = reason.notes;
    if (reason.rto_status) body.rto_status = reason.rto_status;
  }
  const result = await post(`/darkstore/orders/${orderId}/mark-rto`, Object.keys(body).length ? body : undefined);
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to mark order as RTO');
  }
  return result;
}

/**
 * Update order status or urgency. Backend expects PATCH /api/v1/darkstore/orders/:orderId.
 */
export async function updateOrder(orderId: string, data: { status?: string; urgency?: string }) {
  const body: Record<string, string> = {};
  if (data.status) body.status = data.status;
  if (data.urgency) body.urgency = data.urgency;
  const result = await patch(`/darkstore/orders/${orderId}`, body);
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to update order');
  }
  return result;
}

/**
 * Assign picker to order. Backend expects PATCH /api/v1/darkstore/orders/:orderId/assign.
 */
export async function assignOrder(orderId: string, data: { pickerId: string; pickerName: string }) {
  const result = await patch(`/darkstore/orders/${orderId}/assign`, data);
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to assign order');
  }
  return result;
}

/**
 * Start picking. Backend expects PATCH /api/v1/darkstore/orders/:orderId/start-picking.
 */
export async function startPicking(orderId: string, requestVersion?: number) {
  const result = await patch(`/darkstore/orders/${orderId}/start-picking`, { requestVersion });
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to start picking');
  }
  return result;
}

/**
 * Complete picking. Backend expects PATCH /api/v1/darkstore/orders/:orderId/complete-picking.
 */
export async function completePicking(
  orderId: string,
  data?: { requestVersion?: number; pickDuration?: number; accuracy?: number; missingItems?: Array<{ productName: string; orderedQty: number; scannedQty: number; reason?: string }> }
) {
  const result = await patch(`/darkstore/orders/${orderId}/complete-picking`, data ?? {});
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to complete picking');
  }
  return result;
}

/**
 * Update bag/rack for order. Backend expects PATCH /api/v1/darkstore/orders/:orderId/bag-rack.
 */
export async function updateBagRack(orderId: string, data: { bagId?: string; rackLocation?: string }) {
  const body: Record<string, string> = {};
  if (data.bagId != null) body.bagId = String(data.bagId);
  if (data.rackLocation != null) body.rackLocation = String(data.rackLocation);
  if (Object.keys(body).length === 0) throw new Error('At least one of bagId or rackLocation is required');
  const result = await patch(`/darkstore/orders/${orderId}/bag-rack`, body);
  if (result && result.success === false) throw new Error(result.error || 'Failed to update bag/rack');
  return result;
}

/**
 * Get order action logs. Backend expects GET /api/v1/darkstore/orders/:orderId/action-logs.
 */
export async function getOrderActionLogs(orderId: string, limit = 50) {
  const url = buildUrl(`/darkstore/orders/${orderId}/action-logs?limit=${limit}`);
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  const json = await response.json();
  if (json.success === false) throw new Error(json.error || 'Failed to fetch action logs');
  return json.data || [];
}

/**
 * Cancel order. Backend expects POST /api/v1/darkstore/orders/:orderId/cancel.
 */
export async function cancelOrder(orderId: string, reason?: string) {
  const result = await post(`/darkstore/orders/${orderId}/cancel`, reason ? { reason } : undefined);
  if (result && result.success === false) {
    throw new Error(result.error || 'Failed to cancel order');
  }
  return result;
}

/**
 * Get cancelled orders. Backend expects GET /api/v1/darkstore/orders?status=cancelled.
 */
export async function getCancelledOrders(storeId: string, page = 1, limit = 50) {
  const url = buildUrl(`/darkstore/orders?storeId=${encodeURIComponent(storeId)}&status=cancelled&page=${page}&limit=${limit}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('Backend server is unreachable. Please ensure it is running.');
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `API Error: ${response.statusText}`);
  }
  return response.json();
}
