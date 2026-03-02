/**
 * Vendor Inbound API
 * Calls /vendor/inbound/* endpoints (NOT darkstore)
 */
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`,
  };
}

export async function fetchGRNList(filters?: { page?: number; limit?: number; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);

  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.grns}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch GRNs');
  return res.json();
}

export async function fetchShipments(filters?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.shipments}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch shipments');
  return res.json();
}

export async function fetchExceptions(filters?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.exceptions}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch exceptions');
  return res.json();
}

export async function approveGRN(grnId: string, body?: { notes?: string }) {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.approveGrn(grnId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('Failed to approve GRN');
  return res.json();
}

export async function rejectGRN(grnId: string, body: { reason: string; notes?: string }) {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.rejectGrn(grnId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to reject GRN');
  return res.json();
}

export async function patchGRNStatus(grnId: string, body: { status?: string }) {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.patchGrnStatus(grnId)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update GRN status');
  return res.json();
}

export async function updateGRN(grnId: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.updateGrn(grnId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update GRN');
  return res.json();
}

export async function updateGRNItem(
  grnId: string,
  sku: string,
  data: { received_quantity?: number; damaged_quantity?: number; notes?: string }
) {
  return updateGRN(grnId, { items: [{ sku, ...data }] });
}

/** Not supported by vendor inbound - throws */
export async function emailGRN(_grnId: string, _recipients: string[]) {
  throw new Error('Email GRN is not supported for vendor inbound');
}

/** Not supported by vendor inbound - throws */
export async function archiveGRN(_grnId: string) {
  throw new Error('Archive GRN is not supported for vendor inbound');
}
