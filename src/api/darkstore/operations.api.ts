import { apiRequest } from '../apiClient';

export interface SlaMonitorRow {
  orderId: string;
  storeId: string;
  status: string;
  pickerName: string;
  slaDeadline: string;
  slaStatus: 'safe' | 'warning' | 'critical';
  slaTimer: string;
  remainingMs: number;
  remainingFormatted: string;
  itemCount: number;
}

export interface MissingItemRow {
  orderId: string;
  storeId: string;
  productName: string;
  orderedQty: number;
  scannedQty: number;
  reason: string;
  pickerName: string;
  reportedAt: string;
}

export interface LivePickingRow {
  orderId: string;
  storeId: string;
  pickerName: string;
  startedAt: string;
  items: { productName: string; orderedQty: number; scannedQty: number; location: string }[];
  progress: number;
}

export async function getSlaMonitor(params?: { storeId?: string; risk?: string }): Promise<{ success: boolean; data: SlaMonitorRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.risk) q.set('risk', params.risk);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/sla-monitor${query ? `?${query}` : ''}`);
}

export async function getMissingItems(params?: { storeId?: string; orderId?: string }): Promise<{ success: boolean; data: MissingItemRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.orderId) q.set('orderId', params.orderId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/missing-items${query ? `?${query}` : ''}`);
}

export async function getLivePickingMonitor(params?: { storeId?: string }): Promise<{ success: boolean; data: LivePickingRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/live-picking${query ? `?${query}` : ''}`);
}

export interface OperationalAlertRow {
  _id: string;
  alertType: string;
  storeId: string;
  orderId?: string;
  pickerId?: string;
  deviceId?: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}

export async function getOperationalAlerts(params?: { storeId?: string; status?: string }): Promise<{ success: boolean; data: OperationalAlertRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.status) q.set('status', params.status);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/alerts${query ? `?${query}` : ''}`);
}
