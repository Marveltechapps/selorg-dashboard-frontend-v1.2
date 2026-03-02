import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

const BASE = `${API_CONFIG.baseURL}/merch/analytics`;
const authHeaders = () => ({
  Authorization: `Bearer ${getAuthToken() || ''}`,
});

export interface AnalyticsRecord {
  _id?: string;
  type: 'campaign' | 'sku' | 'regional';
  entityId: string;
  entityName: string;
  metricDate: string;
  revenue?: number;
  orders?: number;
  uplift?: number;
  roi?: number;
  unitsSold?: number;
  aov?: number;
  redemptionRate?: number;
  metadata?: Record<string, unknown>;
}

export const analyticsApi = {
  getSummary: async (params?: { type?: string; range?: string }) => {
    const response = await axios.get(`${BASE}/summary`, {
      params,
      headers: authHeaders(),
    });
    const data = response.data?.data ?? [];
    return {
      success: response.data?.success ?? true,
      data: Array.isArray(data) ? data : [],
      count: response.data?.count ?? 0,
    };
  },

  seedData: async () => {
    const response = await axios.post(`${BASE}/seed`, {}, {
      headers: authHeaders(),
    });
    return response.data;
  },
};
