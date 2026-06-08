import { apiRequest } from '../apiClient';

export interface SlaAdherencePoint {
  timestamp: string;
  onTimePercent: number;
  slaBreaches: number;
  avgDelayMinutes: number;
  breachReasonBreakdown?: Record<string, number>;
}

export interface RiderPerformancePoint {
  timestamp: string;
  deliveriesCompleted: number;
  averageRating: number;
  attendancePercent: number;
  activeRiders: number;
}

export async function getSlaAdherence(params?: {
  storeId?: string;
  dateRange?: string;
  granularity?: string;
}): Promise<{ success: boolean; data: SlaAdherencePoint[]; summary?: Record<string, number> }> {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiRequest(`/darkstore/analytics/sla-adherence${qs ? `?${qs}` : ''}`);
}

export async function getRiderPerformance(params?: {
  storeId?: string;
  dateRange?: string;
  granularity?: string;
}): Promise<{ success: boolean; data: RiderPerformancePoint[]; summary?: Record<string, number> }> {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiRequest(`/darkstore/analytics/rider-performance${qs ? `?${qs}` : ''}`);
}

export async function getFleetUtilization(params?: {
  storeId?: string;
  dateRange?: string;
}): Promise<{ success: boolean; data: unknown[]; summary?: Record<string, number> }> {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiRequest(`/darkstore/analytics/fleet-utilization${qs ? `?${qs}` : ''}`);
}
