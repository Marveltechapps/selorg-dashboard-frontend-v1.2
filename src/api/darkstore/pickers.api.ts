/**
 * Pickers API
 * Handles picker operations for Darkstore/Production dashboards
 */

import { API_CONFIG } from '../config/api';
import { apiRequest } from '../apiClient';

const BASE_PATH = '/darkstore/pickers';

export interface Picker {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  currentPicklistId?: string;
  performance: {
    totalPicked: number;
    averageTime: number;
    accuracy: number;
  };
  lastActivity?: string;
}

/**
 * Get available pickers
 */
export async function getAvailablePickers(params?: {
  storeId?: string;
}): Promise<{ success: boolean; data: Picker[] }> {
  const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const url = queryString ? `${BASE_PATH}/available?${queryString}` : `${BASE_PATH}/available`;
  return apiRequest(url);
}

export type DerivedWorkerStatus = 'AVAILABLE' | 'PICKING' | 'ON_BREAK' | 'OFFLINE' | 'DEVICE_IDLE';

export interface LivePicker {
  id: string;
  name: string;
  online: boolean;
  derivedStatus?: DerivedWorkerStatus;
  batteryLevel: number | null;
  activeOrderId: string | null;
  lastActivity: string | null;
}

/**
 * Get live pickers (PickerUser workforce with heartbeat data)
 */
export async function getPickersLive(): Promise<{ success: boolean; data: LivePicker[] }> {
  return apiRequest(`${BASE_PATH}/live`);
}

export interface PickOpsOrder {
  orderId: string;
  pickerName: string;
  startedAt: string;
  progress: number;
  missingItemsCount: number;
  slaRisk: 'safe' | 'warning' | 'critical';
  zone: string;
}

/**
 * Get pick-ops orders (PICKING or ASSIGNED)
 */
export async function getPickOps(params?: { storeId?: string }): Promise<{ success: boolean; data: PickOpsOrder[] }> {
  const queryString = params?.storeId ? `?storeId=${encodeURIComponent(params.storeId)}` : '';
  return apiRequest(`/darkstore/pick-ops${queryString}`);
}

// --- Picker Performance & Risk Engine ---

export interface PickerPerformanceSummary {
  totalPickers: number;
  avgOrdersPerDay: number;
  avgPickTimeSec: number;
  avgMissingRate: number;
  avgSlaBreachRate: number;
  highRiskCount: number;
}

export interface PickerPerformanceItem {
  pickerId: string;
  pickerName: string;
  ordersPerDay: number;
  avgPickTimeSec: number;
  missingRate: number;
  slaBreachRate: number;
  itemsPerHour: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PickerPerformanceDetail extends PickerPerformanceItem {
  dateRange: { startDate: string; endDate: string };
  ordersPicked: number;
}

export async function fetchPickerPerformanceSummary(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: PickerPerformanceSummary }> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const query = q.toString();
  return apiRequest(`/darkstore/pickers/performance/summary${query ? `?${query}` : ''}`);
}

export async function fetchPickersWithMetrics(params?: {
  startDate?: string;
  endDate?: string;
  risk?: 'high';
}): Promise<{ success: boolean; data: PickerPerformanceItem[] }> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  if (params?.risk) q.set('risk', params.risk);
  const query = q.toString();
  return apiRequest(`/darkstore/pickers${query ? `?${query}` : ''}`);
}

export async function fetchPickerPerformance(
  pickerId: string,
  params?: { startDate?: string; endDate?: string }
): Promise<{ success: boolean; data: PickerPerformanceDetail }> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const query = q.toString();
  return apiRequest(`/darkstore/pickers/${pickerId}/performance${query ? `?${query}` : ''}`);
}
