/**
 * Warehouse dashboard in-app notification feed (Mongo-backed, /api/v1/warehouse/notifications).
 */
import { apiRequest } from '../apiClient';

const BASE_PATH = '/warehouse';

/** Shape matches admin notification history for shared UI styling */
export interface WarehouseFeedNotification {
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

export async function fetchWarehouseNotifications(limit = 30): Promise<WarehouseFeedNotification[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  const response = await apiRequest<{ success: boolean; data: WarehouseFeedNotification[] }>(
    `${BASE_PATH}/notifications?limit=${cap}`
  );
  return response.data ?? [];
}

export async function markWarehouseNotificationRead(id: string): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function markAllWarehouseNotificationsRead(): Promise<void> {
  await apiRequest(`${BASE_PATH}/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
