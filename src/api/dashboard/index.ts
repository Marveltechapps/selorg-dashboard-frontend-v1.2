/**
 * Dashboard API
 * Handles dashboard-related API calls. No mock fallbacks; returns null/empty for errors or empty data.
 */

import { API_CONFIG } from '../../config/api';
import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

const BASE = (API_CONFIG.baseURL ?? '').replace(/\/$/, '') || '/api/v1';

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildUrl(endpoint: string, params?: Record<string, any>): string {
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const base = BASE.startsWith('http') ? BASE : `${window.location.origin}${BASE.startsWith('/') ? '' : '/'}${BASE}`;
  const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(path, baseWithSlash);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

async function get(endpoint: string, params?: Record<string, any>) {
  const url = buildUrl(endpoint, params);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('Backend server is unreachable. Please ensure it is running.');
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

async function post(endpoint: string, data?: Record<string, any>) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = BASE.startsWith('http') ? `${BASE}${path}` : `${window.location.origin}${BASE.startsWith('/') ? '' : '/'}${BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error('Backend server is unreachable. Please ensure it is running.');
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

const BASE_PATH = '/darkstore/dashboard';

export async function getDashboardSummary(storeId = getActiveStoreId() || '') {
  try {
    const data = await get(`${BASE_PATH}/summary`, { storeId });
    if (data && (data.queue != null || data.sla_threat != null)) return data;
  } catch (_) {}
  return null;
}

export async function getStaffLoad(storeId = getActiveStoreId() || '') {
  try {
    const data = await get(`${BASE_PATH}/staff-load`, { storeId });
    if (data && (data.pickers != null || data.packers != null)) return data;
  } catch (_) {}
  return null;
}

export async function getStockAlerts(storeId = getActiveStoreId() || '', severity = 'all') {
  try {
    const data = await get(`${BASE_PATH}/stock-alerts`, { storeId, severity });
    if (data && Array.isArray(data.alerts)) return data;
  } catch (_) {}
  return { alerts: [] };
}

export async function getRTOAlerts(storeId = getActiveStoreId() || '') {
  try {
    const data = await get(`${BASE_PATH}/rto-alerts`, { storeId });
    if (data && Array.isArray(data.alerts)) return data;
  } catch (_) {}
  return { alerts: [] };
}

export async function getLiveOrders(storeId = getActiveStoreId() || '', status = 'all', limit = 50) {
  try {
    const data = await get(`${BASE_PATH}/live-orders`, { storeId, status, limit });
    if (data && Array.isArray(data.orders)) return data;
  } catch (_) {}
  return { orders: [] };
}

export async function refreshDashboard(storeId = getActiveStoreId() || '') {
  return post(`${BASE_PATH}/refresh`, { storeId });
}

export async function restockItem(sku: string, storeId = getActiveStoreId() || '', quantity = 50, priority = 'high') {
  return post('/darkstore/inventory/restock', {
    sku,
    store_id: storeId,
    quantity,
    priority,
  });
}

export async function getAlertHistory(entityType: string, entityId: string, alertType: string | null = null) {
  const params: Record<string, string> = { entityType, entityId };
  if (alertType) params.alertType = alertType;
  return get(`${BASE_PATH}/alert-history`, params);
}
