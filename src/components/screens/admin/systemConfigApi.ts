import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface GeneralSettings {
  platformName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  dateFormat: string;
  timeFormat: '12h' | '24h';
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string;
  supportPhone: string;
}

export interface DeliverySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  maxOrders: number;
  isActive: boolean;
  surgeMultiplier: number;
}

export interface DeliverySettings {
  minOrderValue: number;
  maxOrderValue: number;
  baseDeliveryFee: number;
  freeDeliveryAbove: number;
  deliveryFeePerKm: number;
  maxDeliveryRadius: number;
  avgDeliveryTime: number;
  expressDeliveryFee: number;
  slots: DeliverySlot[];
  partners: string[];
}

export interface PaymentGateway {
  id: string;
  name: string;
  provider: 'razorpay' | 'paytm' | 'stripe' | 'phonepe' | 'cod';
  isActive: boolean;
  apiKey: string;
  secretKey: string;
  merchantId?: string;
  transactionFee: number;
  transactionFeeType: 'percentage' | 'flat';
  minAmount: number;
  maxAmount: number;
  displayOrder: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  event: string;
  subject?: string;
  template: string;
  isActive: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailProvider: 'sendgrid' | 'ses' | 'smtp';
  smsProvider: 'twilio' | 'msg91' | 'gupshup';
  emailApiKey: string;
  smsApiKey: string;
  fcmServerKey: string;
  templates: NotificationTemplate[];
}

export interface TaxSettings {
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  tdsEnabled: boolean;
  tdsRate: number;
  taxDisplayType: 'inclusive' | 'exclusive';
  gstNumber: string;
  panNumber: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  category: 'core' | 'experimental' | 'beta' | 'premium';
  requiresRestart: boolean;
}

export interface Integration {
  id: string;
  name: string;
  service: string;
  apiKey: string;
  isActive: boolean;
  endpoint?: string;
  lastSync?: string;
}

export interface AdvancedSettings {
  maintenanceMode: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
  cacheDuration: number;
  rateLimitPerMinute: number;
  maxConcurrentUsers: number;
  sessionTimeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  apiVersion: string;
}

export interface ApiKey {
  key_id: string;
  id: string;
  name: string;
  created_by: string;
  scopes: string[];
  last_used?: string;
  status: 'active' | 'revoked';
  created_at: string;
}

// --- API Functions (no mock fallbacks; errors propagate to caller) ---

export async function fetchGeneralSettings(): Promise<GeneralSettings> {
  const response = await apiRequest<{ success: boolean; data: GeneralSettings }>('/admin/system/general');
  if (!response?.data) throw new Error('Failed to fetch general settings');
  return response.data;
}

export async function updateGeneralSettings(data: Partial<GeneralSettings>): Promise<GeneralSettings> {
  const response = await apiRequest<{ success: boolean; data: GeneralSettings }>('/admin/system/general', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update general settings');
  return response.data;
}

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const response = await apiRequest<{ success: boolean; data: DeliverySettings }>('/admin/system/delivery');
  if (!response?.data) throw new Error('Failed to fetch delivery settings');
  return response.data;
}

export async function updateDeliverySettings(data: Partial<DeliverySettings>): Promise<DeliverySettings> {
  const response = await apiRequest<{ success: boolean; data: DeliverySettings }>('/admin/system/delivery', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update delivery settings');
  return response.data;
}

export async function fetchPaymentGateways(): Promise<PaymentGateway[]> {
  const response = await apiRequest<{ success: boolean; data: PaymentGateway[] }>('/admin/system/payment-gateways');
  if (!response?.data) throw new Error('Failed to fetch payment gateways');
  return response.data;
}

export async function updatePaymentGateway(id: string, data: Partial<PaymentGateway>): Promise<PaymentGateway> {
  const response = await apiRequest<{ success: boolean; data: PaymentGateway }>(`/admin/system/payment-gateways/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update payment gateway');
  return response.data;
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiRequest<{ success: boolean; data: NotificationSettings }>('/admin/system/notifications');
  if (!response?.data) throw new Error('Failed to fetch notification settings');
  return response.data;
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const response = await apiRequest<{ success: boolean; data: NotificationSettings }>('/admin/system/notifications', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update notification settings');
  return response.data;
}

export async function fetchTaxSettings(): Promise<TaxSettings> {
  const response = await apiRequest<{ success: boolean; data: TaxSettings }>('/admin/system/tax-settings');
  if (!response?.data) throw new Error('Failed to fetch tax settings');
  return response.data;
}

export async function updateTaxSettings(data: Partial<TaxSettings>): Promise<TaxSettings> {
  const response = await apiRequest<{ success: boolean; data: TaxSettings }>('/admin/system/tax-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update tax settings');
  return response.data;
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await apiRequest<{ success: boolean; data: FeatureFlag[] }>('/admin/system/feature-flags');
  if (!response?.data) throw new Error('Failed to fetch feature flags');
  return response.data;
}

export async function toggleFeatureFlag(id: string): Promise<FeatureFlag> {
  const response = await apiRequest<{ success: boolean; data: FeatureFlag }>(`/admin/system/feature-flags/${id}/toggle`, {
    method: 'PUT',
  });
  if (!response?.data) throw new Error('Failed to toggle feature flag');
  return response.data;
}

export async function fetchIntegrations(): Promise<Integration[]> {
  const response = await apiRequest<{ success: boolean; data: Integration[] }>('/admin/system/integrations');
  if (!response?.data) throw new Error('Failed to fetch integrations');
  return response.data;
}

export async function updateIntegration(id: string, data: Partial<Integration>): Promise<Integration> {
  const response = await apiRequest<{ success: boolean; data: Integration }>(`/admin/system/integrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update integration');
  return response.data;
}

export async function fetchAdvancedSettings(): Promise<AdvancedSettings> {
  const response = await apiRequest<{ success: boolean; data: AdvancedSettings }>('/admin/system/advanced');
  if (!response?.data) throw new Error('Failed to fetch advanced settings');
  return response.data;
}

export async function updateAdvancedSettings(data: Partial<AdvancedSettings>): Promise<AdvancedSettings> {
  const response = await apiRequest<{ success: boolean; data: AdvancedSettings }>('/admin/system/advanced', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response?.data) throw new Error('Failed to update advanced settings');
  return response.data;
}

export async function testIntegration(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest<{ success: boolean; message?: string }>(`/admin/system/integrations/${id}/test`, {
    method: 'POST',
  });
  if (!response?.success) throw new Error('Integration test failed');
  return { success: true, message: response.message || 'Integration test passed' };
}

// --- API Key Management ---

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const response = await apiRequest<{ success: boolean; data: ApiKey[] }>('/admin/system/api-keys');
  if (!response?.data) throw new Error('Failed to fetch API keys');
  return response.data;
}

export async function createApiKey(params: { name: string; scopes: string[] }): Promise<{ data: ApiKey; plainKey: string }> {
  const response = await apiRequest<{ success: boolean; data: ApiKey; plainKey: string }>('/admin/system/api-keys', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!response?.data || !response?.plainKey) throw new Error('Failed to create API key');
  return { data: response.data, plainKey: response.plainKey };
}

export async function revokeApiKey(id: string): Promise<void> {
  const response = await apiRequest<{ success: boolean }>(`/admin/system/api-keys/${id}/revoke`, {
    method: 'POST',
  });
  if (!response?.success) throw new Error('Failed to revoke API key');
}

export async function rotateApiKey(id: string): Promise<{ data: ApiKey; plainKey: string }> {
  const response = await apiRequest<{ success: boolean; data: ApiKey; plainKey: string }>(`/admin/system/api-keys/${id}/rotate`, {
    method: 'POST',
  });
  if (!response?.data || !response?.plainKey) throw new Error('Failed to rotate API key');
  return { data: response.data, plainKey: response.plainKey };
}
