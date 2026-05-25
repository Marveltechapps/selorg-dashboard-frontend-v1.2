import { API_CONFIG } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

const API_BASE_URL = `${API_CONFIG.baseURL}/merch`;

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
    // ignore parse errors
  }
  return fallback;
}

export const merchApi = {
  // --- Overview Endpoints ---
  getMerchStats: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/stats`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch stats'));
    return response.json();
  },

  getStockConflicts: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/conflicts`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch conflicts'));
    return response.json();
  },

  getPromoUplift: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/uplift`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch uplift data'));
    return response.json();
  },

  getPerformanceReport: async (params: {
    dateRange?: string;
    region?: string;
    channel?: string;
    campaignType?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.dateRange) qs.set('dateRange', params.dateRange);
    if (params.region) qs.set('region', params.region);
    if (params.channel) qs.set('channel', params.channel);
    if (params.campaignType) qs.set('campaignType', params.campaignType);
    const query = qs.toString();
    const url = `${API_BASE_URL}/overview/performance-report${query ? `?${query}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch performance report'));
    return response.json();
  },

  // --- Campaign Endpoints ---
  getCampaigns: async (params?: {
    status?: string;
    region?: string;
    typeFilter?: string;
    running?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.region) qs.set('region', params.region);
    if (params?.typeFilter) qs.set('typeFilter', params.typeFilter);
    if (params?.running) qs.set('running', 'true');
    const query = qs.toString();
    const url = `${API_BASE_URL}/campaigns${query ? `?${query}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch campaigns'));
    return response.json();
  },

  // Create a new campaign
  createCampaign: async (campaignData: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(campaignData),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to create campaign'));
    return response.json();
  },

  // Update a campaign
  updateCampaign: async (id: string | number, updateData: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to update campaign'));
    return response.json();
  },

  // Delete a campaign
  deleteCampaign: async (id: string | number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to delete campaign'));
    return response.json();
  }
};

function unwrapMerchResponse<T>(resp: { success?: boolean; data?: T } | T): T {
  if (resp && typeof resp === 'object' && 'data' in (resp as object)) {
    return (resp as { data: T }).data;
  }
  return resp as T;
}

export const campaignsApi = {
  getCampaigns: async (params?: {
    status?: string;
    region?: string;
    typeFilter?: string;
    running?: boolean;
  }) => {
    const resp = await merchApi.getCampaigns(params);
    const list = Array.isArray(resp) ? resp : (resp?.data ?? (resp as { campaigns?: unknown })?.campaigns ?? []);
    return { success: true, data: Array.isArray(list) ? list : [] };
  },

  getCampaign: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to fetch campaign'));
    const json = await response.json();
    return { success: json?.success ?? true, data: unwrapMerchResponse(json) };
  },

  updateCampaignStatus: async (id: string, status: string) => {
    const resp = await merchApi.updateCampaign(id, { status });
    return { success: resp?.success ?? true, data: unwrapMerchResponse(resp) };
  },

  updateCampaign: async (id: string, updateData: Record<string, unknown>) => {
    const resp = await merchApi.updateCampaign(id, updateData);
    return { success: resp?.success ?? true, data: unwrapMerchResponse(resp) };
  },

  createCampaign: async (campaignData: Record<string, unknown>) => {
    const resp = await merchApi.createCampaign(campaignData);
    return { success: resp?.success ?? true, data: unwrapMerchResponse(resp) };
  },

  deleteCampaign: async (id: string) => {
    const resp = await merchApi.deleteCampaign(id);
    return { success: resp?.success ?? true, data: unwrapMerchResponse(resp) };
  },
};

