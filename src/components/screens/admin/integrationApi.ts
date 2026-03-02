import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface Integration {
  id: string;
  name: string;
  provider: string;
  category: 'payment' | 'communication' | 'maps' | 'analytics' | 'erp' | 'logistics' | 'storage' | 'other';
  status: 'active' | 'inactive' | 'error' | 'testing';
  health: 'healthy' | 'degraded' | 'down';
  description: string;
  logo: string;
  apiVersion: string;
  connectedAt: string;
  lastSync: string;
  metrics: IntegrationMetrics;
  config: IntegrationConfig;
}

export interface IntegrationMetrics {
  requestsToday: number;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
  uptime: number;
  rateLimit: number;
  rateLimitUsed: number;
}

export interface IntegrationConfig {
  apiKey: string;
  secretKey?: string;
  webhookUrl?: string;
  environment: 'production' | 'sandbox' | 'test';
  features: string[];
}

export interface Webhook {
  id: string;
  integrationId: string;
  integrationName: string;
  event: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  status: 'active' | 'inactive' | 'failed';
  lastTriggered: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  retryPolicy: string;
  headers: Record<string, string>;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  integrationId: string;
  integrationName: string;
  permissions: string[];
  environment: 'production' | 'sandbox';
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
  usageCount: number;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  success: boolean;
  errorMessage?: string;
}

export interface IntegrationStats {
  totalIntegrations: number;
  activeIntegrations: number;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
}

// --- API Functions ---

export async function fetchIntegrations(): Promise<Integration[]> {
  const response = await apiRequest<{ success: boolean; data: Integration[] }>('/admin/integrations');
  if (!response?.data) throw new Error('Failed to fetch integrations');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchWebhooks(): Promise<Webhook[]> {
  const response = await apiRequest<{ success: boolean; data: Webhook[] }>('/admin/integrations/webhooks');
  if (!response?.data) throw new Error('Failed to fetch webhooks');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const response = await apiRequest<{ success: boolean; data: ApiKey[] }>('/admin/integrations/api-keys');
  if (!response?.data) throw new Error('Failed to fetch API keys');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchIntegrationLogs(): Promise<IntegrationLog[]> {
  const response = await apiRequest<{ success: boolean; data: IntegrationLog[] }>('/admin/integrations/logs');
  if (!response?.data) throw new Error('Failed to fetch integration logs');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchIntegrationStats(): Promise<IntegrationStats> {
  const response = await apiRequest<{ success: boolean; data: IntegrationStats }>('/admin/integrations/stats');
  if (!response?.data) throw new Error('Failed to fetch integration stats');
  return {
    totalIntegrations: response.data.totalIntegrations ?? 0,
    activeIntegrations: response.data.activeIntegrations ?? 0,
    totalRequests: response.data.totalRequests ?? 0,
    successRate: response.data.successRate ?? 0,
    avgResponseTime: response.data.avgResponseTime ?? 0,
    errorRate: response.data.errorRate ?? 0,
  };
}

export async function toggleIntegration(integrationId: string, status: 'active' | 'inactive'): Promise<void> {
  await apiRequest(`/admin/integrations/${integrationId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function updateIntegration(integrationId: string, updates: Partial<Integration>): Promise<Integration | null> {
  const response = await apiRequest<{ success: boolean; data: Integration }>(`/admin/integrations/${integrationId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response?.data ?? null;
}

export async function testConnection(integrationId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest<{ success: boolean; message?: string }>(
    `/admin/integrations/${integrationId}/test`,
    { method: 'POST' }
  );
  return {
    success: response?.success ?? true,
    message: response?.message ?? 'Connection test completed',
  };
}

export async function createWebhook(webhook: Partial<Webhook>): Promise<Webhook> {
  const response = await apiRequest<{ success: boolean; data: Webhook }>('/admin/integrations/webhooks', {
    method: 'POST',
    body: JSON.stringify(webhook),
  });
  if (!response?.data) throw new Error('Failed to create webhook');
  return response.data;
}

export async function generateApiKey(data: {
  integrationId: string;
  integrationName: string;
  name: string;
  environment: 'production' | 'sandbox';
}): Promise<ApiKey> {
  const response = await apiRequest<{ success: boolean; data: ApiKey }>('/admin/integrations/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to generate API key');
  return response.data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await apiRequest(`/admin/integrations/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}

export async function retryWebhook(webhookId: string): Promise<void> {
  await apiRequest(`/admin/integrations/webhooks/${webhookId}/retry`, {
    method: 'POST',
  });
}
