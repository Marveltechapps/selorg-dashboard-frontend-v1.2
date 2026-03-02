import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

const BASE = `${API_CONFIG.baseURL}/merch/alerts`;
const authHeaders = () => ({
  Authorization: `Bearer ${getAuthToken() || ''}`,
});

export const alertsApi = {
  getAlerts: async (filters: Record<string, string> = {}) => {
    const response = await axios.get(BASE, {
      params: filters,
      headers: authHeaders(),
    });
    const data = response.data?.data ?? [];
    const normalized = Array.isArray(data) ? data.map((a: any) => ({
      ...a,
      id: a.id ?? a._id,
    })) : [];
    return { success: response.data?.success ?? true, data: normalized };
  },

  updateAlert: async (id: string, update: Record<string, any>) => {
    const response = await axios.put(`${BASE}/${id}`, update, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  bulkUpdate: async (ids: string[], update: Record<string, any>) => {
    const response = await axios.post(`${BASE}/bulk-update`, { ids, update }, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
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
