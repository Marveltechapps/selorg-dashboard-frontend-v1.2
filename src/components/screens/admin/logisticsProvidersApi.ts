import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface LogisticsProviderRow {
  _id: string;
  name: string;
  isActive: boolean;
  priority: number;
  apiBaseUrl?: string;
}

function normalizeProvider(raw: Record<string, unknown>): LogisticsProviderRow {
  const idRaw = raw._id ?? raw.id;
  return {
    _id: idRaw != null ? String(idRaw) : '',
    name: String(raw.name ?? ''),
    isActive: raw.isActive === true || raw.isActive === 'true' || raw.isActive === 1,
    priority: Number(raw.priority ?? 0),
    apiBaseUrl: raw.apiBaseUrl ? String(raw.apiBaseUrl) : undefined,
  };
}

export async function fetchLogisticsProviders(): Promise<LogisticsProviderRow[]> {
  const res = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>(
    API_ENDPOINTS.logisticsPlatform.adminProviders
  );
  return (res.data ?? []).map(normalizeProvider);
}

export async function patchLogisticsProvider(
  id: string,
  body: { isActive?: boolean; priority?: number }
): Promise<LogisticsProviderRow> {
  const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
    API_ENDPOINTS.logisticsPlatform.adminProviderPatch(id),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return normalizeProvider(res.data);
}

export async function reorderLogisticsProvider(
  id: string,
  direction: 'up' | 'down'
): Promise<LogisticsProviderRow[]> {
  const res = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>(
    API_ENDPOINTS.logisticsPlatform.adminProviderReorder(id),
    {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }
  );
  return (res.data ?? []).map(normalizeProvider);
}
