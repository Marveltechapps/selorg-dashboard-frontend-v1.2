/**
 * Reports & Analytics API
 * Uses API config base URL for proxy compatibility.
 *
 * Uses `/shared/analytics` (not `/darkstore/analytics`) so rider-dashboard JWTs work:
 * darkstore routes require role darkstore|admin|super_admin; shared routes only require auth.
 */

import { API_CONFIG } from '../../config/api';
import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

const ANALYTICS_ENDPOINT = `${API_CONFIG.baseURL}/shared/analytics`;

export type Granularity = 'hour' | 'day' | 'week';

export interface RiderPerformancePoint {
  timestamp: string;
  deliveriesCompleted: number;
  averageRating: number;
  attendancePercent: number;
  activeRiders: number;
}

export interface SlaAdherencePoint {
  timestamp: string;
  onTimePercent: number;
  slaBreaches: number;
  avgDelayMinutes: number;
  breachReasonBreakdown?: {
    traffic: number;
    no_show: number;
    address_issue: number;
    other: number;
  };
}

export interface FleetUtilizationPoint {
  timestamp: string;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  evUtilizationPercent: number;
  avgKmPerVehicle: number;
}

export interface RiderPerformanceResponse {
  success: boolean;
  data: RiderPerformancePoint[];
  summary: {
    totalDeliveries: number;
    avgRating: number;
    avgAttendance: number;
    peakActiveRiders: number;
  };
}

export interface SlaAdherenceResponse {
  success: boolean;
  data: SlaAdherencePoint[];
  summary: {
    overallOnTimePercent: number;
    totalBreaches: number;
    avgDelayMinutes: number;
  };
}

export interface FleetUtilizationResponse {
  success: boolean;
  data: FleetUtilizationPoint[];
  summary: {
    avgUtilizationPercent: number;
    totalActiveHours: number;
    totalIdleHours: number;
    avgKmPerVehicle: number;
  };
}

export interface ExportReportRequest {
  metric: 'rider' | 'sla' | 'fleet';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    from: string;
    to: string;
  };
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ExportReportResponse {
  success: boolean;
  reportUrl: string;
  reportId: string;
  expiresAt: string;
  message: string;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function messageFromErrorPayload(errorData: Record<string, unknown>): string {
  const msg = errorData.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  const err = errorData.error;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return '';
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: getAuthHeaders(),
    ...options,
  };

  try {
    const response = await fetch(endpoint, defaultOptions);
    
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const text =
        messageFromErrorPayload(errorData) ||
        `HTTP error! status: ${response.status}`;
      throw new Error(text);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`Network error: Backend may not be reachable at ${API_CONFIG.baseURL}`);
      throw new Error('Unable to connect to backend. Please ensure the server is running on port 5000.');
    }
    throw error;
  }
}

/** Shared analytics returns `{ data, summary }`; darkstore used `{ success, data }`. */
function getAnalyticsDataArray<T>(response: unknown): T[] {
  if (!response || typeof response !== 'object') return [];
  const data = (response as { data?: unknown }).data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/**
 * Fetch Rider Performance Metrics
 * GET /api/v1/shared/analytics/rider-performance
 */
export async function fetchRiderPerformance(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<RiderPerformancePoint[]> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const response = await apiRequest(`${ANALYTICS_ENDPOINT}/rider-performance?${params.toString()}`);
  return getAnalyticsDataArray<RiderPerformancePoint>(response);
}

/**
 * Fetch Rider Performance with Summary
 * GET /api/v1/shared/analytics/rider-performance
 */
export async function fetchRiderPerformanceWithSummary(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<RiderPerformanceResponse> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const raw = await apiRequest(`${ANALYTICS_ENDPOINT}/rider-performance?${params.toString()}`) as Record<string, unknown>;
  const data = getAnalyticsDataArray<RiderPerformancePoint>(raw);
  const s = raw.summary as Record<string, number> | undefined;
  return {
    success: true,
    data,
    summary: {
      totalDeliveries: s?.totalDeliveries ?? 0,
      avgRating: s?.avgRating ?? s?.averageRating ?? 0,
      avgAttendance: s?.avgAttendance ?? s?.averageAttendance ?? 0,
      peakActiveRiders: s?.peakActiveRiders ?? 0,
    },
  };
}

/**
 * Fetch SLA Adherence Metrics
 * GET /api/v1/shared/analytics/sla-adherence
 */
export async function fetchSlaAdherence(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<SlaAdherencePoint[]> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const response = await apiRequest(`${ANALYTICS_ENDPOINT}/sla-adherence?${params.toString()}`);
  return getAnalyticsDataArray<SlaAdherencePoint>(response);
}

/**
 * Fetch SLA Adherence with Summary
 * GET /api/v1/shared/analytics/sla-adherence
 */
export async function fetchSlaAdherenceWithSummary(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<SlaAdherenceResponse> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const raw = await apiRequest(`${ANALYTICS_ENDPOINT}/sla-adherence?${params.toString()}`) as Record<string, unknown>;
  const data = getAnalyticsDataArray<SlaAdherencePoint>(raw);
  const s = raw.summary as Record<string, number> | undefined;
  return {
    success: true,
    data,
    summary: {
      overallOnTimePercent: s?.overallOnTimePercent ?? 0,
      totalBreaches: s?.totalBreaches ?? 0,
      avgDelayMinutes: s?.avgDelayMinutes ?? s?.averageDelay ?? 0,
    },
  };
}

/**
 * Fetch Fleet Utilization Metrics
 * GET /api/v1/shared/analytics/fleet-utilization
 */
export async function fetchFleetUtilization(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<FleetUtilizationPoint[]> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const response = await apiRequest(`${ANALYTICS_ENDPOINT}/fleet-utilization?${params.toString()}`);
  return getAnalyticsDataArray<FleetUtilizationPoint>(response);
}

/**
 * Fetch Fleet Utilization with Summary
 * GET /api/v1/shared/analytics/fleet-utilization
 */
export async function fetchFleetUtilizationWithSummary(
  granularity: Granularity = 'day',
  options?: {
    dateRange?: '7d' | '30d' | '90d';
    storeId?: string;
  }
): Promise<FleetUtilizationResponse> {
  const params = new URLSearchParams();
  params.append('granularity', granularity);
  params.append('dateRange', options?.dateRange || '7d');
  params.append('storeId', options?.storeId || getActiveStoreId() || '');

  const raw = await apiRequest(`${ANALYTICS_ENDPOINT}/fleet-utilization?${params.toString()}`) as Record<string, unknown>;
  const data = getAnalyticsDataArray<FleetUtilizationPoint>(raw);
  const s = raw.summary as Record<string, number> | undefined;
  return {
    success: true,
    data,
    summary: {
      avgUtilizationPercent: s?.avgUtilizationPercent ?? s?.averageUtilization ?? 0,
      totalActiveHours: s?.totalActiveHours ?? 0,
      totalIdleHours: s?.totalIdleHours ?? 0,
      avgKmPerVehicle: s?.avgKmPerVehicle ?? 0,
    },
  };
}

/**
 * Export Report
 * POST /api/v1/shared/analytics/reports/export
 */
export async function exportReport(payload: ExportReportRequest): Promise<ExportReportResponse> {
  const body = {
    metric: payload.metric,
    format: payload.format,
    from: payload.dateRange.from,
    to: payload.dateRange.to,
  };
  const raw = (await apiRequest(`${ANALYTICS_ENDPOINT}/reports/export`, {
    method: 'POST',
    body: JSON.stringify(body),
  })) as Record<string, unknown>;

  const reportUrl = typeof raw.reportUrl === 'string' ? raw.reportUrl : '';
  const reportId = typeof raw.reportId === 'string' ? raw.reportId : '';
  const expiresAt = typeof raw.expiresAt === 'string' ? raw.expiresAt : '';
  if (!reportUrl) {
    throw new Error('Failed to export report');
  }

  return {
    success: true,
    reportUrl,
    reportId,
    expiresAt,
    message: typeof raw.message === 'string' ? raw.message : 'Report generated',
  };
}

