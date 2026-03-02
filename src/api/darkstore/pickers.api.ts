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
