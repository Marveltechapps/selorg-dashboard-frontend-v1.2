/**
 * Settings API
 * Admin dashboard → /admin/app-settings
 * Darkstore dashboard → /darkstore/settings (per store)
 */

import { apiRequest } from '@/api/apiClient';

export type SettingsScope = 'admin' | 'darkstore';

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

export const DEFAULT_APP_SETTINGS: AppSettings = {
  refreshIntervals: {
    dashboard: 30,
    alerts: 15,
    orders: 10,
    inventory: 20,
    analytics: 30,
  },
  storeMode: 'online',
  notifications: {
    enabled: true,
    sound: true,
    criticalOnly: false,
    email: false,
  },
  display: {
    theme: 'light',
    timeFormat: '24h',
    dateFormat: 'MM/DD/YYYY',
  },
  performance: {
    enableRealTimeUpdates: true,
    enableOptimisticUpdates: true,
    cacheTimeout: 60,
  },
};

export function mergeAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  const src = partial ?? {};
  return {
    refreshIntervals: {
      ...DEFAULT_APP_SETTINGS.refreshIntervals,
      ...(src.refreshIntervals ?? {}),
    },
    storeMode: ['online', 'pause', 'maintenance'].includes(src.storeMode as string)
      ? (src.storeMode as AppSettings['storeMode'])
      : DEFAULT_APP_SETTINGS.storeMode,
    notifications: {
      ...DEFAULT_APP_SETTINGS.notifications,
      ...(src.notifications ?? {}),
    },
    display: {
      ...DEFAULT_APP_SETTINGS.display,
      ...(src.display ?? {}),
    },
    performance: {
      ...DEFAULT_APP_SETTINGS.performance,
      ...(src.performance ?? {}),
    },
    ...(src.outbound ? { outbound: { ...src.outbound } } : {}),
  };
}

function settingsPath(scope: SettingsScope, storeId?: string): string {
  if (scope === 'admin') {
    return '/admin/app-settings';
  }
  const params = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  return `/darkstore/settings${params}`;
}

/**
 * Get application settings for the given scope.
 */
export async function getSettings(
  scope: SettingsScope = 'darkstore',
  storeId?: string
): Promise<{ settings: AppSettings; lastUpdated?: string }> {
  const response = await apiRequest<SettingsResponse>(settingsPath(scope, storeId));

  if (!response.success || !response.settings) {
    throw new Error('Failed to fetch settings');
  }

  return {
    settings: mergeAppSettings(response.settings),
    lastUpdated: response.lastUpdated,
  };
}

/**
 * Update application settings for the given scope.
 */
export async function updateSettings(
  settings: AppSettings,
  scope: SettingsScope = 'darkstore',
  storeId?: string
): Promise<SettingsResponse> {
  const endpoint = settingsPath(scope, storeId);
  const body =
    scope === 'admin'
      ? JSON.stringify({ settings })
      : JSON.stringify({ settings, ...(storeId ? { storeId } : {}) });

  const response = await apiRequest<SettingsResponse>(endpoint, {
    method: 'PUT',
    body,
  });

  if (!response.success) {
    throw new Error('Failed to update settings');
  }

  return response;
}
