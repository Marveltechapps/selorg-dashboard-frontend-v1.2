import { getAuthToken } from '../../../../contexts/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '/api/v1';
const API_BASE_URL = `${API_BASE}/merch/geofence`;

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const geofenceApi = {
  getZones: async () => {
    const response = await fetch(`${API_BASE_URL}/zones`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch zones');
    const json = await response.json();
    return json.data ?? json;
  },

  createZone: async (zoneData: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/zones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(zoneData),
    });
    if (!response.ok) throw new Error('Failed to create zone');
    const json = await response.json();
    return json.data ?? json;
  },

  updateZone: async (id: string, updateData: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error('Failed to update zone');
    const json = await response.json();
    return json.data ?? json;
  },

  deleteZone: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete zone');
    return response.json();
  },

  toggleZoneStatus: async (id: string, status: 'active' | 'inactive') => {
    const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to toggle zone status');
    const json = await response.json();
    return json.data ?? json;
  },

  getStores: async () => {
    const response = await fetch(`${API_BASE_URL}/stores`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch stores');
    const json = await response.json();
    return json.data ?? json;
  },

  seedData: async () => {
    const response = await fetch(`${API_BASE_URL}/seed`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to seed data');
    return response.json();
  },
};
