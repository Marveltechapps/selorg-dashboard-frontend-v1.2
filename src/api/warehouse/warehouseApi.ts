/**
 * Warehouse API
 * Comprehensive warehouse operations API client
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/warehouse';

export interface WarehouseMetrics {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  averageProcessingTime: number;
  utilizationRate: number;
}

export interface OrderFlow {
  stage: string;
  count: number;
  averageTime: number;
}

/**
 * Get warehouse metrics
 */
export async function getWarehouseMetrics(): Promise<{ success: boolean; data: WarehouseMetrics }> {
  return apiRequest(`${BASE_PATH}/metrics`);
}

/**
 * Get order flow
 */
export async function getOrderFlow(): Promise<{ success: boolean; data: OrderFlow[] }> {
  return apiRequest(`${BASE_PATH}/order-flow`);
}

/**
 * Get daily report
 */
export async function getDailyReport(date?: string): Promise<{ success: boolean; data: any }> {
  const queryString = date ? `?date=${date}` : '';
  return apiRequest(`${BASE_PATH}/reports/daily${queryString}`);
}

/**
 * Get operations view
 */
export async function getOperationsView(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/reports/operations-view`);
}

/**
 * Get analytics
 */
export async function getAnalytics(): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/analytics`);
}
