/**
 * Settings API
 * Manages application settings with real-time updates
 * Uses shared apiClient for auth token and base URL
 */

import { apiRequest } from '@/api/apiClient';

const SETTINGS_ENDPOINT = '/darkstore/settings';

export interface AppSettings {
  refreshIntervals: {
    dashboard: number;
    alerts: number;
    orders: number;
    inventory: number;
    analytics: number;
  };
  storeMode: 'online' | 'pause' | 'maintenance';
  notifications: {
    enabled: boolean;
    sound: boolean;
    criticalOnly: boolean;
    email: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    timeFormat: '12h' | '24h';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  };
  performance: {
    enableRealTimeUpdates: boolean;
    enableOptimisticUpdates: boolean;
    cacheTimeout: number;
  };
  outbound?: {
    autoDispatchEnabled: boolean;
    autoDispatchThreshold: number;
    maxOrdersPerRider: number;
    enableRiderAutoAssignment: boolean;
  };
}

export interface SettingsResponse {
  success: boolean;
  settings: AppSettings;
  lastUpdated?: string;
  message?: string;
}

/**
 * Get Application Settings
 * GET /api/v1/darkstore/settings
 */
export async function getSettings(): Promise<AppSettings> {
  const response = await apiRequest(`${SETTINGS_ENDPOINT}`) as SettingsResponse;
  
  if (!response.success) {
    throw new Error('Failed to fetch settings');
  }
  
  return response.settings;
}

/**
 * Update Application Settings
 * PUT /api/v1/darkstore/settings
 */
export async function updateSettings(settings: AppSettings): Promise<SettingsResponse> {
  const response = await apiRequest(`${SETTINGS_ENDPOINT}`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  }) as SettingsResponse;
  
  if (!response.success) {
    throw new Error('Failed to update settings');
  }
  
  return response;
}

