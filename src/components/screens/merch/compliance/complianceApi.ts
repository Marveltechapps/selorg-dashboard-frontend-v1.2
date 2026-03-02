import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

const BASE = `${API_CONFIG.baseURL}/merch/compliance`;
const authHeaders = () => ({
  Authorization: `Bearer ${getAuthToken() || ''}`,
});

function normalizeApproval(a: any) {
  const id = a.id ?? a._id;
  return { ...a, id: typeof id === 'object' ? id?.toString() : String(id ?? '') };
}

export const complianceApi = {
  getApprovals: async (filters: Record<string, string> = {}) => {
    const response = await axios.get(`${BASE}/approvals`, {
      params: filters,
      headers: authHeaders(),
    });
    const data = response.data?.data ?? [];
    const normalized = Array.isArray(data) ? data.map(normalizeApproval) : [];
    return { success: response.data?.success ?? true, data: normalized };
  },

  getApprovalRequests: async (filters: Record<string, string> = {}) => {
    return complianceApi.getApprovals(filters);
  },

  updateApprovalStatus: async (id: string, status: string, user: string = '') => {
    const response = await axios.put(`${BASE}/approvals/${id}`, { status, user }, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  getAudits: async (filters: Record<string, string> = {}) => {
    const response = await axios.get(`${BASE}/audits`, {
      params: filters,
      headers: authHeaders(),
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await axios.get(`${BASE}/summary`, {
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
