import { apiRequest } from '@/api/apiClient';

export interface GatewayStatus {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  uptime: number;
  lastCheck: string;
  responseTime: number;
}

const BASE = '/finance';

export const fetchGatewayStatus = async (entityId?: string): Promise<GatewayStatus[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entityId', entityId);
  const response = await apiRequest<{ success: boolean; data: GatewayStatus[] }>(
    `${BASE}/gateway-status${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data ?? [];
};
