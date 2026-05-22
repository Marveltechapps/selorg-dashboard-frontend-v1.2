/**
 * Vendor dashboard in-app notification feed (Mongo-backed, /api/v1/vendor/notifications).
 */
import { apiRequest } from '../apiClient';

const BASE_PATH = '/vendor';

export interface VendorFeedNotification {
  id: string;
  userId: string;
  userName: string;
  templateName: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  sentAt: string;
}

export async function fetchVendorDashboardNotifications(limit = 30): Promise<VendorFeedNotification[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  const response = await apiRequest<{ success: boolean; data: VendorFeedNotification[] }>(
    `${BASE_PATH}/notifications?limit=${cap}`
  );
  return response.data ?? [];
}

export async function markVendorDashboardNotificationRead(id: string): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function markAllVendorDashboardNotificationsRead(): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
