import { getAuthToken } from '../../../../contexts/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '/api/v1';
const API_BASE_URL = `${API_BASE}/merch/geofence`;

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const json = await response.json();
    const raw = json?.error ?? json?.message;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (raw && typeof raw === 'object') {
      const nested = (raw as Record<string, unknown>).message;
      if (typeof nested === 'string' && nested.trim()) return nested;
      return JSON.stringify(raw);
    }
  } catch {
    // ignore
  }
  return fallback;
}

export type HeatmapMetric = 'revenue' | 'redemptions' | 'orders';

export interface PromoHeatmapRow {
  zoneId: string;
  zoneName: string;
  color: string;
  revenue: number;
  orders: number;
  redemptions: number;
  promoCount?: number;
  areaSqKm?: number;
}

export interface PromoHeatmapResponse {
  days: number;
  periodLabel: string;
  rows: PromoHeatmapRow[];
  totals: { revenue: number; orders: number; redemptions: number };
}

export interface GeofenceKpiStats {
  totalZones: number;
  activeZones: number;
  inactiveZones: number;
  totalArea: number;
  storesTotal: number;
  storesFullyCovered: number;
  storesPartial: number;
  storesNone: number;
  topPromoZone: string;
  topPromoMetric: 'redemptions' | 'revenue' | 'orders';
  topPromoValue: number;
  heatmapDays?: number;
  heatmapTotals?: { revenue: number; orders: number; redemptions: number };
}

export const geofenceApi = {
  getZones: async () => {
    const response = await fetch(`${API_BASE_URL}/zones`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch zones'));
    const json = await response.json();
    return json.data ?? json;
  },

  getZoneById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch zone'));
    const json = await response.json();
    return json.data ?? json;
  },

  createZone: async (zoneData: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/zones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(zoneData),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to create zone'));
    const json = await response.json();
    return json.data ?? json;
  },

  updateZone: async (id: string, updateData: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to update zone'));
    const json = await response.json();
    return json.data ?? json;
  },

  deleteZone: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to delete zone'));
    return response.json();
  },

  toggleZoneStatus: async (id: string, status: 'active' | 'inactive') => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to toggle zone status'));
    const json = await response.json();
    return json.data ?? json;
  },

  getStores: async () => {
    const response = await fetch(`${API_BASE_URL}/stores`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch stores'));
    const json = await response.json();
    return json.data ?? json;
  },

  updateStore: async (id: string, updateData: { zones?: string[]; serviceStatus?: string; zoneId?: string }) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to update store'));
    const json = await response.json();
    return json.data ?? json;
  },

  getHistory: async (limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch history'));
    const json = await response.json();
    return json.data ?? json;
  },

  getOverlaps: async () => {
    const response = await fetch(`${API_BASE_URL}/overlaps`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch overlaps'));
    const json = await response.json();
    return json.data ?? json;
  },

  getStats: async (heatmapDays = 30): Promise<GeofenceKpiStats> => {
    const response = await fetch(`${API_BASE_URL}/stats?heatmapDays=${heatmapDays}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to load geofence stats'));
    const json = await response.json();
    return json.data ?? json;
  },

  getPromoHeatmap: async (days = 30): Promise<PromoHeatmapResponse> => {
    const response = await fetch(`${API_BASE_URL}/heatmap?days=${days}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to load promo heatmap'));
    const json = await response.json();
    return json.data ?? json;
  },

  seedData: async () => {
    const response = await fetch(`${API_BASE_URL}/seed`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to seed data'));
    return response.json();
  },
};
