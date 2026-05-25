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

export interface CampaignAnalyticsDetail {
  campaignName: string;
  entityId?: string;
  kpis: {
    revenue: number;
    orders: number;
    uplift: number;
    roi: number;
    redemptionRate: number;
  };
  series: { day: string; sales: number; redemptions: number }[];
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

  getCampaignDetail: async (entityId: string, range?: string) => {
    const response = await axios.get(`${BASE}/campaign/${encodeURIComponent(entityId)}`, {
      params: range ? { range } : undefined,
      headers: authHeaders(),
    });
    return response.data?.data as CampaignAnalyticsDetail;
  },

  exportReport: async (payload: { reportType: string; range: string }) => {
    const response = await axios.post(`${BASE}/export`, payload, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  savePreset: async (name: string, filters: Record<string, unknown>) => {
    const response = await axios.post(
      `${BASE}/presets`,
      { name, filters },
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  seedData: async () => {
    const response = await axios.post(`${BASE}/seed`, {}, {
      headers: authHeaders(),
    });
    return response.data;
  },
};
