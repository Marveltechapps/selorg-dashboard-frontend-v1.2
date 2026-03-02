/**
 * Production Picklists API
 * Mirrors Darkstore picklists API but uses /production path.
 * Returns mock data when API fails or returns empty.
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/production/picklists';

const MOCK_PICKLISTS = [
  { id: 'PL-1001', zone: 'Ambient A', slaTime: '08:15', slaStatus: 'safe', items: 12, orders: 3, status: 'pending', priority: 'high' },
  { id: 'PL-1002', zone: 'Chiller', slaTime: '06:45', slaStatus: 'atrisk', items: 8, orders: 2, status: 'inprogress', progress: 45, picker: { name: 'Sarah C.', avatar: 'SC' }, priority: 'urgent' },
  { id: 'PL-1003', zone: 'Frozen', slaTime: '12:00', slaStatus: 'safe', items: 5, orders: 1, status: 'pending', suggestedPicker: 'Mike R.', priority: 'normal' },
  { id: 'PL-1004', zone: 'Ambient B', slaTime: '10:30', slaStatus: 'safe', items: 15, orders: 4, status: 'completed', progress: 100, picker: { name: 'John D.', avatar: 'JD' }, priority: 'normal' },
  { id: 'PL-1005', zone: 'Chiller', slaTime: '05:20', slaStatus: 'urgent', items: 6, orders: 2, status: 'inprogress', progress: 20, picker: { name: 'Rachel Z.', avatar: 'RZ' }, priority: 'urgent' },
  { id: 'PL-1006', zone: 'Ambient A', slaTime: '14:00', slaStatus: 'safe', items: 9, orders: 2, status: 'pending', priority: 'high' },
];

export async function getPicklists(params?: {
  status?: string;
  storeId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: any[]; pagination?: any }> {
  try {
    const queryString = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
    const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
    const result = await apiRequest<{ success?: boolean; data?: any[] }>(url);
    if (result && Array.isArray(result.data) && result.data.length > 0) return { success: true, data: result.data, pagination: (result as any).pagination };
    if (result && Array.isArray((result as any).picklists) && (result as any).picklists.length > 0) return { success: true, data: (result as any).picklists };
    return { success: true, data: MOCK_PICKLISTS };
  } catch {
    return { success: true, data: MOCK_PICKLISTS };
  }
}

export async function createPicklist(data: any): Promise<{ success: boolean; data: any }> {
  return apiRequest(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPicklistDetails(picklistId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}`);
}

export async function startPicking(picklistId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/start`, {
    method: 'POST',
  });
}

export async function pausePicking(picklistId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/pause`, {
    method: 'POST',
  });
}

export async function completePicking(picklistId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/complete`, {
    method: 'POST',
  });
}

export async function assignPicker(picklistId: string, pickerId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ pickerId }),
  });
}

export async function moveToPacking(picklistId: string): Promise<{ success: boolean; data: any }> {
  return apiRequest(`${BASE_PATH}/${picklistId}/move-to-packing`, {
    method: 'POST',
  });
}

// Export as object for convenience
export const picklistsApi = {
  getPicklists,
  createPicklist,
  getPicklistDetails,
  startPicking,
  pausePicking,
  completePicking,
  assignPicker,
  moveToPacking,
};
