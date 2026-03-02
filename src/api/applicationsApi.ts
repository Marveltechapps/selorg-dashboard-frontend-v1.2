import { apiRequest } from '@/api/apiClient';

export interface Application {
  id: string;
  type: string;
  name: string;
  displayName: string;
  description: string;
  baseUrl: string;
  healthPath: string;
  enabled: boolean;
  status: 'active' | 'inactive';
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastHealthCheck: string | null;
  lastHealthStatus: string | null;
}

export interface HealthResult {
  healthy: boolean;
  status: string;
  message: string;
  checkedAt: string;
}

export async function fetchApplications(): Promise<Application[]> {
  const response = await apiRequest<{ success: boolean; data: Application[] }>('/admin/applications');
  if (!response?.data) throw new Error('Failed to fetch applications');
  return Array.isArray(response.data) ? response.data : [];
}

export async function getApplicationHealth(id: string): Promise<HealthResult> {
  const response = await apiRequest<{ success: boolean; data: HealthResult }>(
    `/admin/applications/${id}/health`
  );
  if (!response?.data) throw new Error('Failed to get application health');
  return response.data;
}

export async function testApplication(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest<{ success: boolean; message?: string }>(
    `/admin/applications/${id}/test`,
    { method: 'POST' }
  );
  return {
    success: response?.success ?? false,
    message: response?.message ?? 'Test completed',
  };
}

export async function toggleApplication(id: string, enabled: boolean): Promise<Application> {
  const response = await apiRequest<{ success: boolean; data: Application }>(
    `/admin/applications/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }
  );
  if (!response?.data) throw new Error('Failed to update application');
  return response.data;
}
