/**
 * Rider logistics dashboard in-app notification feed (Mongo-backed, /api/v1/rider/notifications).
 */
import { apiRequest } from '../apiClient';

const BASE_PATH = '/rider';

export interface RiderDashboardFeedNotification {
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

export async function fetchRiderDashboardNotifications(limit = 30): Promise<RiderDashboardFeedNotification[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  const response = await apiRequest<{ success: boolean; data: RiderDashboardFeedNotification[] }>(
    `${BASE_PATH}/notifications?limit=${cap}`
  );
  return response.data ?? [];
}

export async function markRiderDashboardNotificationRead(id: string): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function markAllRiderDashboardNotificationsRead(): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
