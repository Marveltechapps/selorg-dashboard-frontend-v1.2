import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';

export interface Alert {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  type: 'sla_breach' | 'rider_no_show' | 'zone_deviation' | 'vehicle_issue' | 'other';
  createdAt: string;
  source: {
    orderId?: string;
    riderId?: string;
    riderName?: string;
    vehicleId?: string;
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const alertsApi = {
  getAlerts: (filters: any = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest<{ alerts: Alert[], total: number }>(`${API_ENDPOINTS.alerts.list}?${params.toString()}`);
  },
  performAction: (id: string, actionType: string, metadata?: any) =>
    apiRequest(API_ENDPOINTS.alerts.action(id), {
      method: 'POST',
      body: JSON.stringify({ actionType, metadata }),
    }),
  markAllRead: () =>
    apiRequest<{ success: boolean; modifiedCount: number }>(API_ENDPOINTS.alerts.markAllRead, {
      method: 'PUT',
    }),
};
