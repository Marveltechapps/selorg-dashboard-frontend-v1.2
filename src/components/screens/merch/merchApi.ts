import { API_CONFIG } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

const API_BASE_URL = `${API_CONFIG.baseURL}/merch`;

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const merchApi = {
  // --- Overview Endpoints ---
  getMerchStats: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/stats`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  getStockConflicts: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/conflicts`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch conflicts');
    return response.json();
  },

  getPromoUplift: async () => {
    const response = await fetch(`${API_BASE_URL}/overview/uplift`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch uplift data');
    return response.json();
  },

  // --- Campaign Endpoints ---
  getCampaigns: async () => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  },

  // Create a new campaign
  createCampaign: async (campaignData: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(campaignData),
    });
    if (!response.ok) throw new Error('Failed to create campaign');
    return response.json();
  },

  // Update a campaign
  updateCampaign: async (id: string | number, updateData: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error('Failed to update campaign');
    return response.json();
  },

  // Delete a campaign
  deleteCampaign: async (id: string | number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete campaign');
    return response.json();
  }
};

export const campaignsApi = {
  getCampaigns: async () => {
    const data = await merchApi.getCampaigns();
    const list = Array.isArray(data) ? data : (data?.data ?? data?.campaigns ?? []);
    return { success: true, data: list };
  },
  updateCampaignStatus: async (id: string, status: string) => {
    const data = await merchApi.updateCampaign(id, { status });
    return { success: true, data };
  },
  updateCampaign: async (id: string, updateData: any) => {
    const data = await merchApi.updateCampaign(id, updateData);
    return { success: true, data };
  },
  createCampaign: async (campaignData: any) => {
    const data = await merchApi.createCampaign(campaignData);
    return { success: true, data };
  },
};

