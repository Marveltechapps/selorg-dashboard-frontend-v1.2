import { apiRequest } from '@/api/apiClient';

export interface Application {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'maintenance';
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
  config: Record<string, unknown>;
  lastSync: string | null;
}

export async function fetchApplications(): Promise<Application[]> {
  const response = await apiRequest<{ success: boolean; data: Application[] }>('/admin/applications');
  if (!response?.data) throw new Error('Failed to fetch applications');
  return Array.isArray(response.data) ? response.data : [];
}

export async function toggleApplication(id: string, status: 'active' | 'inactive'): Promise<Application> {
  const response = await apiRequest<{ success: boolean; data: Application }>(`/admin/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!response?.data) throw new Error('Failed to update application');
  return response.data;
}

export async function testApplicationConnection(id: string): Promise<{ health: string; message: string }> {
  const response = await apiRequest<{ success: boolean; data: { health: string; message?: string } }>(
    `/admin/applications/${id}/test-connection`,
    { method: 'POST' }
  );
  const data = response?.data ?? {};
  return {
    health: data.health ?? 'unknown',
    message: data.message ?? 'Test completed',
  };
}
