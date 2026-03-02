import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  category: 'transactional' | 'promotional' | 'system' | 'order' | 'welcome';
  channels: ('push' | 'sms' | 'email' | 'in-app')[];
  variables: string[];
  imageUrl?: string;
  deepLink?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive';
  createdAt: string;
  lastUsed?: string;
  totalSent: number;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  segment: 'all' | 'vip' | 'new' | 'inactive' | 'custom';
  customSegmentQuery?: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  channels: ('push' | 'sms' | 'email' | 'in-app')[];
  scheduledAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  targetUsers: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  createdBy: string;
}

export interface ScheduledNotification {
  id: string;
  campaignId: string;
  campaignName: string;
  templateName: string;
  scheduledAt: string;
  targetUsers: number;
  channels: ('push' | 'sms' | 'email' | 'in-app')[];
  recurring?: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  createdBy: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'order_placed' | 'order_delivered' | 'cart_abandoned' | 'user_signup' | 'payment_failed';
  templateId: string;
  templateName: string;
  delay: number;
  channels: ('push' | 'sms' | 'email' | 'in-app')[];
  conditions?: string;
  status: 'active' | 'inactive';
  totalTriggered: number;
  successRate: number;
  createdAt: string;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  avgDeliveryTime: number;
  failedCount: number;
  bounceRate: number;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  userName: string;
  templateName: string;
  title: string;
  body: string;
  channel: 'push' | 'sms' | 'email' | 'in-app';
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced';
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
}

export interface ChannelPerformance {
  channel: 'push' | 'sms' | 'email' | 'in-app';
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface TimeSeriesMetrics {
  timestamp: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

const DEFAULT_ANALYTICS: NotificationAnalytics = {
  totalSent: 0,
  totalDelivered: 0,
  totalOpened: 0,
  totalClicked: 0,
  deliveryRate: 0,
  openRate: 0,
  clickRate: 0,
  avgDeliveryTime: 0,
  failedCount: 0,
  bounceRate: 0,
};

const DEFAULT_CHANNELS: ChannelPerformance[] = [
  { channel: 'push', sent: 0, delivered: 0, opened: 0, clicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0 },
  { channel: 'sms', sent: 0, delivered: 0, opened: 0, clicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0 },
  { channel: 'email', sent: 0, delivered: 0, opened: 0, clicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0 },
  { channel: 'in-app', sent: 0, delivered: 0, opened: 0, clicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0 },
];

const emptyTimeSeries = (): TimeSeriesMetrics[] =>
  Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (23 - i), 0, 0, 0);
    return {
      timestamp: d.toISOString(),
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
  });

// --- API Functions (real backend only, no mocks) ---

export async function fetchTemplates(): Promise<NotificationTemplate[]> {
  const response = await apiRequest<{ success: boolean; data: NotificationTemplate[] }>(
    '/admin/notifications/templates'
  );
  return response.data ?? [];
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const response = await apiRequest<{ success: boolean; data: Campaign[] }>(
    '/admin/notifications/campaigns'
  );
  return response.data ?? [];
}

export async function fetchScheduled(): Promise<ScheduledNotification[]> {
  const response = await apiRequest<{ success: boolean; data: ScheduledNotification[] }>(
    '/admin/notifications/scheduled'
  );
  return response.data ?? [];
}

export async function fetchAutomation(): Promise<AutomationRule[]> {
  const response = await apiRequest<{ success: boolean; data: AutomationRule[] }>(
    '/admin/notifications/automation'
  );
  return response.data ?? [];
}

export async function fetchAnalytics(): Promise<NotificationAnalytics> {
  const response = await apiRequest<{ success: boolean; data: NotificationAnalytics }>(
    '/admin/notifications/analytics'
  );
  return response.data ?? DEFAULT_ANALYTICS;
}

export async function fetchHistory(): Promise<NotificationHistory[]> {
  const response = await apiRequest<{ success: boolean; data: NotificationHistory[] }>(
    '/admin/notifications/history'
  );
  return response.data ?? [];
}

export async function fetchChannelPerformance(): Promise<ChannelPerformance[]> {
  const response = await apiRequest<{ success: boolean; data: ChannelPerformance[] }>(
    '/admin/notifications/channels'
  );
  return response.data ?? DEFAULT_CHANNELS;
}

export async function fetchTimeSeriesMetrics(): Promise<TimeSeriesMetrics[]> {
  const response = await apiRequest<{ success: boolean; data: TimeSeriesMetrics[] }>(
    '/admin/notifications/timeseries'
  );
  return response.data ?? emptyTimeSeries();
}

export async function createTemplate(
  template: Partial<NotificationTemplate>
): Promise<NotificationTemplate> {
  const response = await apiRequest<{ success: boolean; data: NotificationTemplate }>(
    '/admin/notifications/templates',
    {
      method: 'POST',
      body: JSON.stringify(template),
    }
  );
  if (!response?.data) throw new Error('No data returned from create template');
  return response.data;
}

export async function updateTemplate(
  templateId: string,
  template: Partial<NotificationTemplate>
): Promise<NotificationTemplate> {
  const response = await apiRequest<{ success: boolean; data: NotificationTemplate }>(
    `/admin/notifications/templates/${templateId}`,
    {
      method: 'PUT',
      body: JSON.stringify(template),
    }
  );
  if (!response?.data) throw new Error('No data returned from update template');
  return response.data;
}

export async function createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
  const response = await apiRequest<{ success: boolean; data: Campaign }>(
    '/admin/notifications/campaigns',
    {
      method: 'POST',
      body: JSON.stringify(campaign),
    }
  );
  if (!response?.data) throw new Error('No data returned from create campaign');
  return response.data;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign['status']
): Promise<void> {
  await apiRequest(`/admin/notifications/campaigns/${campaignId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiRequest(`/admin/notifications/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export async function createAutomationRule(
  rule: Partial<AutomationRule>
): Promise<AutomationRule> {
  const response = await apiRequest<{ success: boolean; data: AutomationRule }>(
    '/admin/notifications/automation',
    {
      method: 'POST',
      body: JSON.stringify(rule),
    }
  );
  if (!response?.data) throw new Error('No data returned from create automation rule');
  return response.data;
}

export async function toggleAutomation(
  ruleId: string,
  status: 'active' | 'inactive'
): Promise<void> {
  await apiRequest(`/admin/notifications/automation/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
