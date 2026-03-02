import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

function authHeaders(): Record<string, string> {
  const token = getAuthToken() || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface UploadHistory {
  id: string;
  fileName: string;
  recordsProcessed: number;
  uploadedBy: string;
  timestamp: string;
  status: 'success' | 'failed' | 'processing';
}

export interface Contract {
  id: string;
  vendorId: string;
  vendorName: string;
  contractNumber: string;
  title: string;
  type: 'Service' | 'Supply' | 'Maintenance' | 'Other';
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'expired' | 'pending' | 'terminated';
  renewalDate?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  module: string;
  details?: string;
  ipAddress?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  uploadId: string;
  fileName: string;
  recordsProcessed: number;
  totalRows: number;
  failedRows: number;
  message: string;
}

export async function fetchUploadHistory(limit?: number): Promise<UploadHistory[]> {
  const params = limit != null ? `?limit=${limit}` : '';
  const res = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.uploadHistory}${params}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to fetch upload history');
  }
  const data = await res.json();
  return data.uploads ?? [];
}

export async function bulkUploadVendors(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAuthToken() || '';
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.bulkUpload}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to upload file');
  }
  return res.json();
}

export async function fetchContracts(params?: {
  status?: string;
  search?: string;
}): Promise<Contract[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
  const query = q.toString() ? `?${q.toString()}` : '';
  const res = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.contracts}${query}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to fetch contracts');
  }
  const data = await res.json();
  return data.contracts ?? [];
}

export async function createContract(body: {
  vendorId: string;
  vendorName: string;
  contractNumber: string;
  title: string;
  type?: string;
  startDate: string;
  endDate: string;
  value: number;
  status?: string;
  renewalDate?: string;
}): Promise<{ success: boolean; contract: Contract }> {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.contracts}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to create contract');
  }
  return res.json();
}

export async function deleteContract(contractId: string): Promise<void> {
  const res = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.contractById(contractId)}`,
    { method: 'DELETE', headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to delete contract');
  }
}

export async function fetchAuditLogs(params?: {
  limit?: number;
  module?: string;
  search?: string;
}): Promise<AuditLogEntry[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.module) q.set('module', params.module);
  if (params?.search) q.set('search', params.search);
  const query = q.toString() ? `?${q.toString()}` : '';
  const res = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.auditLogs}${query}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to fetch audit logs');
  }
  const data = await res.json();
  return data.logs ?? [];
}

export async function exportAuditLogsCSV(payload: {
  from: string;
  to: string;
  module?: string;
}): Promise<Blob> {
  const res = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.utilities.auditLogsExport}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      module: payload.module ?? 'all',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to export audit logs');
  }
  return res.blob();
}
