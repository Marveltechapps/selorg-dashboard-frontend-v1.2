import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../utils/apiRequest';

export interface SystemHealthSummary {
  systemUptime: number;
  activeDevices: number;
  totalDevices: number;
  connectivityIssues: number;
  lastUpdated?: string;
}

export interface DeviceHealth {
  deviceId: string;
  riderId: string;
  riderName: string;
  appVersion: string;
  isLatestVersion: boolean;
  batteryLevel: number;
  signalStrength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  lastSync: string;
  status: 'Healthy' | 'Attention' | 'Critical' | 'Offline';
  issues?: string[];
  location?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
}

export interface DiagnosticsReport {
  reportId: string;
  status: 'completed' | 'in_progress' | 'failed';
  scope: 'full' | 'devices' | 'connectivity' | 'performance';
  createdAt: string;
  completedAt?: string;
  findings: DiagnosticsFinding[];
  summary?: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface DiagnosticsFinding {
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  deviceId?: string;
  recommendation?: string;
}

/**
 * Transform backend data
 */
function transformTimestamp(timestamp: string | Date): string {
  return typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString();
}

function transformDeviceHealth(apiDevice: any): DeviceHealth {
  return {
    deviceId: apiDevice.deviceId,
    riderId: apiDevice.riderId,
    riderName: apiDevice.riderName,
    appVersion: apiDevice.appVersion,
    isLatestVersion: apiDevice.isLatestVersion || false,
    batteryLevel: apiDevice.batteryLevel,
    signalStrength: apiDevice.signalStrength as any,
    lastSync: transformTimestamp(apiDevice.lastSync),
    status: apiDevice.status as any,
    issues: apiDevice.issues || [],
    location: apiDevice.location ? {
      lat: apiDevice.location.lat,
      lng: apiDevice.location.lng,
      timestamp: transformTimestamp(apiDevice.location.timestamp),
    } : undefined,
  };
}

/**
 * Get system health summary
 */
export async function getSystemHealthSummary(): Promise<SystemHealthSummary> {
  const result = await apiRequest<SystemHealthSummary>(API_ENDPOINTS.systemHealth.summary, {}, 'System Health API');
  return {
    ...result,
    lastUpdated: result.lastUpdated ? transformTimestamp(result.lastUpdated) : undefined,
  };
}

/**
 * List device health logs
 */
export async function listDeviceHealth(filters?: {
  status?: string;
  riderId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<DeviceHealth[]> {
  const queryParams = new URLSearchParams();
  
  if (filters?.status) {
    queryParams.append('status', filters.status);
  }
  if (filters?.riderId) {
    queryParams.append('riderId', filters.riderId);
  }
  if (filters?.search) {
    queryParams.append('search', filters.search);
  }
  if (filters?.page) {
    queryParams.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    queryParams.append('limit', filters.limit.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `${API_ENDPOINTS.systemHealth.devices}?${queryString}`
    : API_ENDPOINTS.systemHealth.devices;

  const response = await apiRequest<{ devices: any[]; total: number; page: number; limit: number }>(
    endpoint,
    {},
    'System Health API'
  );
  const devices = response?.devices ?? [];
  return Array.isArray(devices) ? devices.map(transformDeviceHealth) : [];
}

/**
 * Get device health by ID
 */
export async function getDeviceHealthById(deviceId: string): Promise<DeviceHealth> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.systemHealth.device(deviceId),
    {},
    'System Health API'
  );
  return transformDeviceHealth(result);
}

/**
 * Run system diagnostics
 * Backend returns 202 with reportId; we fetch the full report.
 */
export async function runDiagnostics(options?: {
  scope?: 'full' | 'devices' | 'connectivity' | 'performance';
  deviceIds?: string[];
}): Promise<DiagnosticsReport> {
  const result = await apiRequest<{ reportId: string; message?: string }>(
    API_ENDPOINTS.systemHealth.runDiagnostics,
    {
      method: 'POST',
      body: JSON.stringify({ scope: options?.scope || 'full', deviceIds: options?.deviceIds || [] }),
    },
    'System Health API'
  );
  if (!result?.reportId) {
    throw new Error('Diagnostics did not return a report ID');
  }
  return getDiagnosticsReport(result.reportId);
}

/**
 * Get diagnostics report
 */
export async function getDiagnosticsReport(reportId: string): Promise<DiagnosticsReport> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.systemHealth.diagnosticsReport(reportId),
    {},
    'System Health API'
  );
  
  return {
    ...result,
    createdAt: transformTimestamp(result.createdAt),
    completedAt: result.completedAt ? transformTimestamp(result.completedAt) : undefined,
  };
}
