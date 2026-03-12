import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface PickerConfig {
  basePayPerHour: number;
  overtimeMultiplier: number;
  currency: string;
  shiftGeoRadiusKm: number;
  walkInBufferMinutes: number;
  defaultShiftDurationHours: number;
  documentMaxSizeBytes: number;
  documentMinDimensionPx: number;
  documentAllowedExtensions: string[];
  heartbeatIntervalMs: number;
  websocketTimeoutMs: number;
  websocketReconnectionAttempts: number;
  websocketReconnectionDelayMs: number;
  websocketReconnectionDelayMaxMs: number;
  defaultHubName?: string;
}

export async function fetchPickerConfig(): Promise<PickerConfig> {
  const res = await apiRequest<{ success: boolean; data: PickerConfig }>(
    API_ENDPOINTS.admin.pickerConfig.get
  );
  return res.data!;
}

export async function updatePickerConfig(config: Partial<PickerConfig>): Promise<PickerConfig> {
  const res = await apiRequest<{ success: boolean; data: PickerConfig }>(
    API_ENDPOINTS.admin.pickerConfig.update,
    {
      method: 'PUT',
      body: JSON.stringify(config),
    }
  );
  return res.data!;
}
