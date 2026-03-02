// --- Type Definitions ---

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: string;
  module: string;
  resource: string;
  resourceId?: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  description: string;
  ipAddress: string;
  userAgent: string;
  changes?: ChangeDetail[];
  metadata?: Record<string, any>;
}

export interface ChangeDetail {
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
}

export interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  criticalEvents: number;
  uniqueUsers: number;
  topAction: string;
  topModule: string;
}

// --- API Response Types ---

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// --- API Functions ---

import { apiRequest } from '@/api/apiClient';

export interface FetchAuditLogsFilters {
  module?: string;
  action?: string;
  severity?: string;
  user?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface FetchAuditLogsResult {
  logs: AuditLog[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export async function fetchAuditLogs(filters?: FetchAuditLogsFilters): Promise<FetchAuditLogsResult> {
  const queryParams = new URLSearchParams();
  if (filters?.module) queryParams.append('module', filters.module);
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.severity) queryParams.append('severity', filters.severity);
  if (filters?.user) queryParams.append('user', filters.user);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.dateFrom) queryParams.append('startDate', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('endDate', filters.dateTo);
  if (filters?.page != null) queryParams.append('page', String(filters.page));
  if (filters?.limit != null) queryParams.append('limit', String(filters.limit));

  const response = await apiRequest<AuditLogsResponse>(`/admin/audit/logs?${queryParams.toString()}`);
  const logs = response.data || [];
  const meta = response.meta || { total: 0, page: 1, limit: 50, pages: 0 };
  return { logs, meta };
}

export async function fetchAuditStats(): Promise<AuditStats> {
  try {
    const response = await apiRequest<{ success: boolean; data: AuditStats }>('/admin/audit/logs/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch audit stats:', error);
    return {
      totalEvents: 0,
      todayEvents: 0,
      criticalEvents: 0,
      uniqueUsers: 0,
      topAction: 'N/A',
      topModule: 'N/A',
    };
  }
}

export async function exportAuditLogs(format: 'csv' | 'json', logs?: AuditLog[]): Promise<{ url: string }> {
  try {
    // If logs are provided, use them; otherwise fetch from API
    let logsToExport = logs || [];
    if (logsToExport.length === 0) {
      const result = await fetchAuditLogs();
      logsToExport = result.logs;
    }
    
    if (format === 'csv') {
      const csv = [
        ['Timestamp', 'User', 'Email', 'Action', 'Module', 'Resource', 'Severity', 'Description', 'IP Address'],
        ...logsToExport.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.user,
          log.userEmail,
          log.action,
          log.module,
          log.resource,
          log.severity,
          log.description,
          log.ipAddress,
        ])
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { url: link.href };
    } else {
      const json = JSON.stringify(logsToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { url: link.href };
    }
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    throw error;
  }
}

export async function fetchLogDetails(logId: string): Promise<AuditLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; data: AuditLog }>(`/admin/audit/logs/${logId}`);
    return response.data || null;
  } catch (error) {
    console.error('Failed to fetch log details:', error);
    return null;
  }
}
