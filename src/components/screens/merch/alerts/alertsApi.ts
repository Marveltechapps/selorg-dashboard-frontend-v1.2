import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

const BASE = `${API_CONFIG.baseURL}/merch/alerts`;
const authHeaders = () => ({
  Authorization: `Bearer ${getAuthToken() || ''}`,
});

function normalizeAlert(a: Record<string, unknown>) {
  const id = a.id ?? a._id;
  return {
    ...a,
    id: typeof id === 'object' ? String((id as { toString?: () => string })?.toString?.() ?? '') : String(id ?? ''),
  };
}

export const alertsApi = {
  getAlerts: async (filters: Record<string, string> = {}) => {
    const response = await axios.get(BASE, {
      params: filters,
      headers: authHeaders(),
    });
    const data = response.data?.data ?? [];
    const normalized = Array.isArray(data) ? data.map((a) => normalizeAlert(a as Record<string, unknown>)) : [];
    return { success: response.data?.success ?? true, data: normalized };
  },

  updateAlert: async (id: string, update: Record<string, unknown>) => {
    const response = await axios.put(`${BASE}/${id}`, update, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  bulkUpdate: async (ids: string[], update: Record<string, unknown>) => {
    const response = await axios.post(`${BASE}/bulk-update`, { ids, update }, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  resolvePricingConflict: async (
    id: string,
    payload: { resolutionType: string; marginCap?: number }
  ) => {
    const response = await axios.post(`${BASE}/${id}/resolve-pricing`, payload, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  allocateStock: async (
    id: string,
    payload: { source: string; quantity: number; toLocation?: string }
  ) => {
    const response = await axios.post(`${BASE}/${id}/allocate-stock`, payload, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  pauseCampaign: async (id: string, payload: { reason?: string }) => {
    const response = await axios.post(`${BASE}/${id}/pause-campaign`, payload, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  clearResolved: async () => {
    const response = await axios.post(`${BASE}/clear-resolved`, {}, {
      headers: authHeaders(),
    });
    return response.data;
  },

  seedData: async () => {
    const response = await axios.post(`${BASE}/seed`, {}, {
      headers: authHeaders(),
    });
    return response.data;
  },
};
