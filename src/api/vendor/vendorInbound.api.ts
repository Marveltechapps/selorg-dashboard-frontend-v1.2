/**
 * Vendor Inbound API — /api/v1/vendor/inbound/*
 */
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';
import {
  extractList,
  mapExceptionFromApi,
  mapGrnFromApi,
  mapRtvFromApi,
  mapShipmentFromApi,
  rtvStatusToApi,
  type GRN,
  type InboundException,
  type InboundOverview,
  type RTV,
  type RTVStatus,
  type Shipment,
} from './vendorInboundMappers';

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
  };
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await res.json();
    message = String(body?.message ?? body?.error ?? message);
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...getAuthHeaders(), ...init?.headers } });
  if (!res.ok) await parseError(res, `Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchInboundOverview(): Promise<InboundOverview> {
  const data = await requestJson<InboundOverview>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.overview}`
  );
  return {
    totalGRNsToday: data?.totalGRNsToday ?? 0,
    pendingApproval: data?.pendingApproval ?? 0,
    approvedGRNs: data?.approvedGRNs ?? 0,
    rejectedGRNs: data?.rejectedGRNs ?? 0,
    inTransitShipments: data?.inTransitShipments ?? 0,
    exceptions: data?.exceptions ?? 0,
  };
}

export async function fetchGRNList(filters?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<GRN[]> {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  params.set('limit', String(filters?.limit ?? 100));
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const result = await requestJson<unknown>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.grns}${qs}`
  );
  return extractList<Record<string, unknown>>(result).map(mapGrnFromApi);
}

export async function fetchGRNById(grnId: string): Promise<GRN> {
  const raw = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.grnById(grnId)}`
  );
  return mapGrnFromApi(raw);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const result = await requestJson<unknown>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.shipments}?limit=100`
  );
  return extractList<Record<string, unknown>>(result).map(mapShipmentFromApi);
}

export async function fetchExceptions(): Promise<InboundException[]> {
  const result = await requestJson<unknown>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.exceptions}`
  );
  return extractList<Record<string, unknown>>(result).map(mapExceptionFromApi);
}

export async function fetchRTVList(): Promise<RTV[]> {
  const result = await requestJson<unknown>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.rtvs}`
  );
  return extractList<Record<string, unknown>>(result).map(mapRtvFromApi);
}

export async function approveGRN(
  grnId: string,
  body?: { notes?: string; qualityChecked?: boolean; documentsComplete?: boolean }
): Promise<GRN> {
  await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.approveGrn(grnId)}`,
    { method: 'POST', body: body ? JSON.stringify(body) : undefined }
  );
  return fetchGRNById(grnId);
}

export async function rejectGRN(grnId: string, body: { reason: string; notes?: string }): Promise<GRN> {
  await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.rejectGrn(grnId)}`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return fetchGRNById(grnId);
}

export async function archiveGRN(grnId: string): Promise<void> {
  await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.archiveGrn(grnId)}`,
    { method: 'POST' }
  );
}

export async function updateGRN(grnId: string, body: Record<string, unknown>): Promise<GRN> {
  const raw = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.updateGrn(grnId)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  return mapGrnFromApi(raw);
}

export async function updateGRNItem(
  grnId: string,
  sku: string,
  data: { received_quantity?: number; receivedQuantity?: number; notes?: string }
): Promise<GRN> {
  return updateGRN(grnId, {
    items: [
      {
        sku,
        receivedQuantity: data.received_quantity ?? data.receivedQuantity,
        remarks: data.notes,
      },
    ],
  });
}

export async function createException(body: {
  grnId: string;
  type: string;
  description: string;
}) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.createException}`,
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export async function resolveException(exceptionId: string) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.resolveException(exceptionId)}`,
    { method: 'POST', body: JSON.stringify({}) }
  );
}

export async function createRTV(body: {
  grnId: string;
  grnReference: string;
  reason: string;
  quantity: string;
  vendor: string;
  vendorId?: string;
  items: string[];
}): Promise<RTV> {
  const raw = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.createRtv}`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return mapRtvFromApi(raw);
}

export async function patchRTVStatus(
  rtvId: string,
  body: { status: RTVStatus; currentTrackingStep?: number }
): Promise<RTV> {
  const raw = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.patchRtvStatus(rtvId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: rtvStatusToApi(body.status),
        currentTrackingStep: body.currentTrackingStep,
      }),
    }
  );
  return mapRtvFromApi(raw);
}

export async function downloadInboundReport(): Promise<Blob> {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inbound.report}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await parseError(res, 'Failed to download report');
  return res.blob();
}

export type { GRN, Shipment, RTV, InboundException, InboundOverview };
