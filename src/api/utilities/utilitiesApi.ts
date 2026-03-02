/**
 * Utilities & Settings API
 * Integrated with backend based on api-documentation.yaml
 */

import { getActiveStoreId } from '../../contexts/AuthContext';

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    try { return new URL(String(envUrl).trim()).origin; } catch { return ''; }
  }
  return '';
})();
const UTILITIES_ENDPOINT = `${API_BASE_URL}/api/v1/darkstore/utilities`;

export interface GenerateLabelRequest {
  searchTerm: string;
  labelType: 'item_barcode' | 'shelf_edge_label' | 'bin_location_tag' | 'pallet_id';
  quantity: number;
  printerId?: string;
}

export interface GenerateLabelResponse {
  success: boolean;
  labelId: string;
  printJobId: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  message: string;
}

export interface BulkUploadResponse {
  success: boolean;
  uploadId: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errors: Array<{ row: number; error: string }>;
  message: string;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  lastCheck: string;
  message?: string;
}

export interface SystemStatusResponse {
  success: boolean;
  services: ServiceStatus[];
  overallStatus: 'operational' | 'degraded' | 'down';
}

export interface SystemDiagnosticsResponse {
  success: boolean;
  diagnosticId: string;
  status: 'running' | 'completed' | 'failed';
  estimatedCompletion?: string;
  message: string;
}

export interface ForceSyncResponse {
  success: boolean;
  syncId: string;
  recordsPushed: number;
  status: 'running' | 'completed' | 'failed';
  completedAt?: string;
  message: string;
}

export interface AuditLog {
  timestamp: string;
  userId: string;
  userName: string;
  module: 'inventory' | 'picking' | 'packing' | 'auth' | 'settings' | 'sync';
  action: string;
  details: string;
  ipAddress?: string;
}

export interface AuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface ExportAuditLogsResponse {
  success: boolean;
  exportUrl: string;
  exportId: string;
  expiresAt: string;
  message: string;
}

/**
 * API Request Helper
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(endpoint, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`Network error: Backend may not be running at ${API_BASE_URL}`);
      throw new Error('Unable to connect to backend. Please ensure the server is running on port 5000.');
    }
    throw error;
  }
}

/**
 * Generate Label
 * POST /api/v1/darkstore/utilities/labels/generate
 */
export async function generateLabel(payload: GenerateLabelRequest): Promise<GenerateLabelResponse> {
  const response = await apiRequest(`${UTILITIES_ENDPOINT}/labels/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }) as GenerateLabelResponse;
  
  if (!response.success) {
    throw new Error('Failed to generate label');
  }
  
  return response;
}

/**
 * Bulk Upload
 * POST /api/v1/darkstore/utilities/inventory/bulk-upload
 */
export async function bulkUpload(
  file: File,
  options?: {
    storeId?: string;
    validateOnly?: boolean;
  }
): Promise<BulkUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('storeId', options?.storeId || getActiveStoreId() || '');
  if (options?.validateOnly !== undefined) {
    formData.append('validateOnly', options.validateOnly.toString());
  }

  const response = await fetch(`${UTILITIES_ENDPOINT}/inventory/bulk-upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to upload file');
  }

  const data = await response.json() as BulkUploadResponse;
  if (!data.success) {
    throw new Error('Failed to upload file');
  }

  return data;
}

/**
 * Download Upload Template
 * GET /api/v1/darkstore/utilities/inventory/upload-template
 */
export async function downloadUploadTemplate(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
  const response = await fetch(`${UTILITIES_ENDPOINT}/inventory/upload-template?format=${format}`);
  
  if (!response.ok) {
    throw new Error('Failed to download template');
  }
  
  return await response.blob();
}

/**
 * Get System Status
 * GET /api/v1/darkstore/utilities/system/status
 */
export async function getSystemStatus(options?: {
  storeId?: string;
}): Promise<SystemStatusResponse> {
  const params = new URLSearchParams();
  if (options?.storeId) params.append('storeId', options.storeId);

  const response = await apiRequest(`${UTILITIES_ENDPOINT}/system/status?${params.toString()}`) as SystemStatusResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch system status');
  }
  
  return response;
}

/**
 * Run System Diagnostics
 * POST /api/v1/darkstore/utilities/system/diagnostics
 */
export async function runSystemDiagnostics(payload: {
  diagnosticType: 'database_reindex' | 'sync_check' | 'integrity_check';
  storeId?: string;
}): Promise<SystemDiagnosticsResponse> {
  const response = await apiRequest(`${UTILITIES_ENDPOINT}/system/diagnostics`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      storeId: payload.storeId || getActiveStoreId() || '',
    }),
  }) as SystemDiagnosticsResponse;
  
  if (!response.success) {
    throw new Error('Failed to run diagnostics');
  }
  
  return response;
}

/**
 * Force Global Sync
 * POST /api/v1/darkstore/utilities/system/sync
 */
export async function forceGlobalSync(payload: {
  storeId?: string;
  syncType?: 'full' | 'incremental';
}): Promise<ForceSyncResponse> {
  const response = await apiRequest(`${UTILITIES_ENDPOINT}/system/sync`, {
    method: 'POST',
    body: JSON.stringify({
      storeId: payload.storeId || getActiveStoreId() || '',
      syncType: payload.syncType || 'full',
    }),
  }) as ForceSyncResponse;
  
  if (!response.success) {
    throw new Error('Failed to force sync');
  }
  
  return response;
}

/**
 * Get Audit Logs
 * GET /api/v1/darkstore/utilities/audit-logs
 */
export async function getAuditLogs(options?: {
  module?: 'inventory' | 'picking' | 'packing' | 'auth' | 'settings' | 'sync' | 'all';
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: AuditLog[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options?.module) params.append('module', options.module);
  if (options?.userId) params.append('userId', options.userId);
  if (options?.action) params.append('action', options.action);
  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  if (options?.page) params.append('page', options.page.toString());
  params.append('limit', (options?.limit || 50).toString());

  const response = await apiRequest(`${UTILITIES_ENDPOINT}/audit-logs?${params.toString()}`) as AuditLogsResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch audit logs');
  }
  
  return {
    logs: response.logs,
    pagination: response.pagination,
  };
}

/**
 * Export Audit Logs
 * POST /api/v1/darkstore/utilities/audit-logs/export
 */
export async function exportAuditLogs(payload: {
  module?: 'inventory' | 'picking' | 'packing' | 'auth' | 'settings' | 'sync' | 'all';
  from: string;
  to: string;
  format?: 'csv' | 'xlsx';
}): Promise<ExportAuditLogsResponse | Blob> {
  const format = payload.format || 'csv';
  
  if (format === 'csv') {
    // For CSV, fetch as blob and download directly
    const response = await fetch(`${UTILITIES_ENDPOINT}/audit-logs/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module: payload.module || 'all',
        from: payload.from,
        to: payload.to,
        format: 'csv',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to export audit logs');
    }

    // Return blob for CSV download
    return await response.blob();
  } else {
    // For Excel, return JSON response with URL
    const response = await apiRequest(`${UTILITIES_ENDPOINT}/audit-logs/export`, {
      method: 'POST',
      body: JSON.stringify({
        module: payload.module || 'all',
        from: payload.from,
        to: payload.to,
        format: 'xlsx',
      }),
    }) as ExportAuditLogsResponse;
    
    if (!response.success) {
      throw new Error('Failed to export audit logs');
    }
    
    return response;
  }
}

