/**
 * HSD Device Management API
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
const HSD_ENDPOINT = `${API_BASE_URL}/api/v1/darkstore/hsd`;

export interface HSDDevice {
  deviceId: string;
  assignedTo?: {
    userId: string;
    userName: string;
    userType: 'Picker' | 'Packer' | 'Rider' | 'Spare';
  } | null;
  status: 'online' | 'offline' | 'charging' | 'error';
  battery: number;
  signal: 'strong' | 'good' | 'weak' | 'no_signal';
  lastSync: string;
  deviceType?: string;
  firmwareVersion?: string;
}

export interface FleetOverviewResponse {
  success: boolean;
  summary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    chargingDevices: number;
    errorDevices: number;
    lowBatteryCount: number;
    avgSyncLatency: number;
  };
  devices: HSDDevice[];
}

export interface LiveSession {
  deviceId: string;
  userId: string;
  userName: string;
  taskType: 'picking' | 'packing' | 'qc' | 'cycle_count';
  taskId: string;
  currentStatus: string;
  zone?: string;
  startedAt: string;
  lastActivity: string;
  itemsCompleted?: number;
  itemsTotal?: number;
}

export interface LiveSessionsResponse {
  success: boolean;
  sessions: LiveSession[];
}

export interface DeviceAction {
  timestamp: string;
  actionType: 'scan_sku' | 'qc_check' | 'shelf_verification' | 'system' | 'error';
  details: string;
  result: 'success' | 'warning' | 'error' | 'blocked';
}

export interface DeviceActionsResponse {
  success: boolean;
  actions: DeviceAction[];
}

export interface DeviceIssue {
  ticketId: string;
  deviceId: string;
  issueType: 'hardware' | 'software' | 'connectivity';
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  reportedAt: string;
  reportedBy?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface IssueTrackerResponse {
  success: boolean;
  issues: DeviceIssue[];
}

export interface HSDLog {
  timestamp: string;
  deviceId: string;
  userId?: string;
  userName?: string;
  eventType: 'scan_sku' | 'qc_check' | 'shelf_verification' | 'system' | 'error';
  details: string;
  result: 'success' | 'warning' | 'error' | 'blocked' | 'alert';
}

export interface HSDLogsResponse {
  success: boolean;
  logs: HSDLog[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
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
 * Get Fleet Overview
 * GET /api/v1/darkstore/hsd/fleet
 */
export async function getFleetOverview(options?: {
  storeId?: string;
  status?: 'all' | 'online' | 'offline' | 'charging' | 'error';
}): Promise<FleetOverviewResponse> {
  const params = new URLSearchParams();
  params.append('storeId', options?.storeId || getActiveStoreId() || '');
  if (options?.status) params.append('status', options.status);

  const response = await apiRequest(`${HSD_ENDPOINT}/fleet?${params.toString()}`) as FleetOverviewResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch fleet overview');
  }
  
  return response;
}

/**
 * Register Device
 * POST /api/v1/darkstore/hsd/devices/register
 */
export async function registerDevice(payload: {
  deviceId: string;
  deviceType: string;
  serialNumber: string;
  storeId?: string;
  firmwareVersion?: string;
}): Promise<{ success: boolean; device: any; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/devices/register`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      storeId: payload.storeId || getActiveStoreId() || '',
    }),
  });
  
  if (!response.success) {
    throw new Error('Failed to register device');
  }
  
  return response;
}

/**
 * Assign Device
 * POST /api/v1/darkstore/hsd/devices/:deviceId/assign
 */
export async function assignDevice(
  deviceId: string,
  payload: {
    userId: string;
    userName: string;
    userType: 'Picker' | 'Packer' | 'Rider';
  }
): Promise<{ success: boolean; device: any; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/devices/${deviceId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (!response.success) {
    throw new Error('Failed to assign device');
  }
  
  return response;
}

/**
 * Unassign Device
 * POST /api/v1/darkstore/hsd/devices/:deviceId/unassign
 */
export async function unassignDevice(
  deviceId: string
): Promise<{ success: boolean; device: any; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/devices/${deviceId}/unassign`, {
    method: 'POST',
  });
  
  if (!response.success) {
    throw new Error('Failed to unassign device');
  }
  
  return response;
}

/**
 * Bulk Reset Devices
 * POST /api/v1/darkstore/hsd/devices/bulk-reset
 */
export async function bulkResetDevices(payload: {
  deviceIds: string[];
  storeId?: string;
  reason?: string;
}): Promise<{ success: boolean; results: any[]; errors?: any[]; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/devices/bulk-reset`, {
    method: 'POST',
    body: JSON.stringify({
      deviceIds: payload.deviceIds,
      storeId: payload.storeId || getActiveStoreId() || '',
      reason: payload.reason || 'Bulk reset',
    }),
  });
  
  if (!response.success) {
    throw new Error('Failed to reset devices');
  }
  
  return response;
}

/**
 * Get Device History
 * GET /api/v1/darkstore/hsd/devices/:deviceId/history
 */
export interface DeviceHistoryEntry {
  id: string;
  action: 'ASSIGN' | 'UNASSIGN' | 'RESET' | 'LOCK' | 'REBOOT' | 'CLEAR_CACHE';
  performed_by: string;
  performed_at: string;
  metadata: any;
  previous_state: any;
  new_state: any;
}

export async function getDeviceHistory(
  deviceId: string,
  options?: { limit?: number }
): Promise<{ success: boolean; history: DeviceHistoryEntry[] }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await apiRequest(`${HSD_ENDPOINT}/devices/${deviceId}/history?${params.toString()}`);
  
  if (!response.success) {
    throw new Error('Failed to fetch device history');
  }
  
  return response;
}

/**
 * Get Live Sessions
 * GET /api/v1/darkstore/hsd/sessions/live
 */
export async function getLiveSessions(options?: {
  deviceId?: string;
  storeId?: string;
}): Promise<LiveSession[]> {
  const params = new URLSearchParams();
  if (options?.deviceId) params.append('deviceId', options.deviceId);
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const response = await apiRequest(`${HSD_ENDPOINT}/sessions/live?${params.toString()}`) as LiveSessionsResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch live sessions');
  }
  
  return response.sessions;
}

/**
 * Get Device Actions
 * GET /api/v1/darkstore/hsd/devices/:deviceId/actions
 */
export async function getDeviceActions(
  deviceId: string,
  options?: { limit?: number }
): Promise<DeviceAction[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await apiRequest(`${HSD_ENDPOINT}/devices/${deviceId}/actions?${params.toString()}`) as DeviceActionsResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch device actions');
  }
  
  return response.actions;
}

/**
 * Device Control
 * POST /api/v1/darkstore/hsd/devices/:deviceId/control
 */
export async function deviceControl(
  deviceId: string,
  payload: {
    action: 'lock' | 'reboot' | 'reset' | 'clear_cache' | 'restart_app';
    reason?: string;
    storeId?: string;
  }
): Promise<{ success: boolean; action: string; status: string; message: string }> {
  const params = new URLSearchParams();
  if (payload.storeId) params.append('storeId', payload.storeId);

  const response = await apiRequest(`${HSD_ENDPOINT}/devices/${deviceId}/control?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({
      action: payload.action,
      reason: payload.reason,
    }),
  });
  
  if (!response.success) {
    throw new Error('Failed to perform device control action');
  }
  
  return response;
}

/**
 * Get Issues
 * GET /api/v1/darkstore/hsd/issues
 */
export async function getIssues(options?: {
  status?: 'all' | 'open' | 'in_progress' | 'resolved';
  deviceId?: string;
  storeId?: string;
}): Promise<DeviceIssue[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.deviceId) params.append('deviceId', options.deviceId);
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const response = await apiRequest(`${HSD_ENDPOINT}/issues?${params.toString()}`) as IssueTrackerResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch issues');
  }
  
  return response.issues;
}

/**
 * Report Issue
 * POST /api/v1/darkstore/hsd/issues/report
 */
export async function reportIssue(payload: {
  deviceId: string;
  issueType: 'hardware' | 'software' | 'connectivity';
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reportedBy?: string;
}): Promise<{ success: boolean; ticketId: string; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/issues/report`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (!response.success) {
    throw new Error('Failed to report issue');
  }
  
  return response;
}

/**
 * Get HSD Logs
 * GET /api/v1/darkstore/hsd/logs
 */
export async function getHSDLogs(options?: {
  deviceId?: string;
  eventType?: 'scan_sku' | 'qc_check' | 'shelf_verification' | 'system' | 'error' | 'all';
  search?: string;
  page?: number;
  limit?: number;
  storeId?: string;
}): Promise<{ logs: HSDLog[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options?.deviceId) params.append('deviceId', options.deviceId);
  if (options?.eventType) params.append('eventType', options.eventType);
  if (options?.search) params.append('search', options.search);
  if (options?.page) params.append('page', options.page.toString());
  params.append('storeId', options?.storeId || getActiveStoreId() || '');
  params.append('limit', (options?.limit || 50).toString());

  const response = await apiRequest(`${HSD_ENDPOINT}/logs?${params.toString()}`) as HSDLogsResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch HSD logs');
  }
  
  return {
    logs: response.logs,
    pagination: response.pagination,
  };
}

/**
 * Session Action
 * POST /api/v1/darkstore/hsd/sessions/:deviceId/action
 */
export async function sessionAction(
  deviceId: string,
  payload: {
    action: 'confirm_quantity' | 'report_issue';
    payload?: any;
  }
): Promise<{ success: boolean; session: any; message: string }> {
  const response = await apiRequest(`${HSD_ENDPOINT}/sessions/${deviceId}/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (!response.success) {
    throw new Error('Failed to perform session action');
  }
  
  return response;
}

/**
 * Create Requisition
 * POST /api/v1/darkstore/hsd/requisitions
 */
export async function createRequisition(payload: {
  deviceIds: string[];
  reason: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  storeId?: string;
}): Promise<{ success: boolean; requestId: string; message: string }> {
  const params = new URLSearchParams();
  if (payload.storeId) params.append('storeId', payload.storeId);

  const response = await apiRequest(`${HSD_ENDPOINT}/requisitions?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({
      deviceIds: payload.deviceIds,
      reason: payload.reason,
      priority: payload.priority,
    }),
  });
  
  if (!response.success) {
    throw new Error('Failed to create requisition order');
  }
  
  return response;
}

