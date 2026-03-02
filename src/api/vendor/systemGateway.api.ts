import { API_CONFIG } from '../../config/api';
import { apiRequest } from '../apiClient';

export interface SystemService {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down';
  endpoint?: string;
  responseTime?: number;
  lastChecked?: string;
  uptime?: number;
}

export interface SystemLog {
  id: string;
  serviceName: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  time?: string;
  date?: string;
}

export const systemGatewayApi = {
  /**
   * Get all services
   */
  async getServices(filters?: { status?: string; type?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);

    return apiRequest<{ success: boolean; data: SystemService[] }>(
      `/vendor/system-gateway/services?${params.toString()}`
    );
  },

  /**
   * Get service by ID
   */
  async getServiceById(id: string) {
    return apiRequest<{ success: boolean; data: SystemService }>(
      `/vendor/system-gateway/services/${id}`
    );
  },

  /**
   * Create or update service
   */
  async upsertService(serviceData: Partial<SystemService>) {
    return apiRequest<{ success: boolean; data: SystemService }>(
      `/vendor/system-gateway/services`,
      {
        method: 'POST',
        body: JSON.stringify(serviceData),
      }
    );
  },

  /**
   * Get logs
   */
  async getLogs(filters?: { 
    serviceName?: string; 
    level?: string; 
    startDate?: string; 
    endDate?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.serviceName) params.append('serviceName', filters.serviceName);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', String(filters.limit));

    return apiRequest<{ success: boolean; data: SystemLog[] }>(
      `/vendor/system-gateway/logs?${params.toString()}`
    );
  },

  /**
   * Create log entry
   */
  async createLog(logData: Omit<SystemLog, 'id' | 'time' | 'date'>) {
    return apiRequest<{ success: boolean; data: SystemLog }>(
      `/vendor/system-gateway/logs`,
      {
        method: 'POST',
        body: JSON.stringify(logData),
      }
    );
  },
};

export default systemGatewayApi;
