/**
 * Shared Routes API
 * Common functionality shared across dashboards
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/shared';

/**
 * Dashboard Summary
 */
export async function getDashboardSummary(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/dashboard/summary`);
}

/**
 * Shared Alerts
 */
export async function getSharedAlerts(params?: {
  status?: string;
  priority?: string;
}): Promise<{ success: boolean; data: any[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/alerts?${queryString}` : `${BASE_PATH}/alerts`;
  return apiRequest(url);
}

export async function getSharedAlertById(id: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/alerts/${id}`);
}

export async function performSharedAlertAction(id: string, action: any): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/alerts/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

export async function clearResolvedSharedAlerts(): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/alerts`, {
    method: 'DELETE',
  });
}

/**
 * Shared Analytics
 */
export async function getSharedRiderPerformance(params?: {
  granularity?: string;
  dateRange?: string;
}): Promise<{ success: boolean; data: any }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/analytics/rider-performance?${queryString}` : `${BASE_PATH}/analytics/rider-performance`;
  return apiRequest(url);
}

export async function getSharedSlaAdherence(params?: {
  granularity?: string;
  dateRange?: string;
}): Promise<{ success: boolean; data: any }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/analytics/sla-adherence?${queryString}` : `${BASE_PATH}/analytics/sla-adherence`;
  return apiRequest(url);
}

export async function getSharedFleetUtilization(params?: {
  granularity?: string;
  dateRange?: string;
}): Promise<{ success: boolean; data: any }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/analytics/fleet-utilization?${queryString}` : `${BASE_PATH}/analytics/fleet-utilization`;
  return apiRequest(url);
}

export async function exportSharedReport(data: any): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/analytics/reports/export`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Communication
 */
export async function getActiveChats(): Promise<{ success: boolean; data: any[] }> {
  return apiRequest(`${BASE_PATH}/communication/chats`);
}

export async function getChatDetails(id: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/communication/chats/${id}`);
}

export async function sendMessage(id: string, message: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/communication/chats/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function markChatAsRead(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/communication/chats/${id}/read`, {
    method: 'PUT',
  });
}

export async function createBroadcast(data: any): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/communication/broadcasts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function flagIssue(id: string, data: any): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/communication/chats/${id}/flag`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Approvals
 */
export async function getApprovalSummary(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/approvals/summary`);
}

export async function getApprovalQueue(params?: {
  status?: string;
  type?: string;
}): Promise<{ success: boolean; data: any[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/approvals/queue?${queryString}` : `${BASE_PATH}/approvals/queue`;
  return apiRequest(url);
}

export async function getApprovalItem(id: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/approvals/queue/${id}`);
}

export async function approveItem(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/approvals/queue/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectItem(id: string, reason?: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/approvals/queue/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function batchApprove(ids: string[]): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/approvals/batch-approve`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

/**
 * System Health
 */
export async function getSystemHealthSummary(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/system-health/summary`);
}

export async function getSystemDevices(): Promise<{ success: boolean; data: any[] }> {
  return apiRequest(`${BASE_PATH}/system-health/devices`);
}

export async function getSystemDevice(id: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/system-health/devices/${id}`);
}

export async function runDiagnostics(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/system-health/diagnostics/run`, {
    method: 'POST',
  });
}

export async function getDiagnosticsReport(reportId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/system-health/diagnostics/reports/${reportId}`);
}
