import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface PickerActionLog {
  _id?: string;
  actionType: string;
  pickerId: string;
  orderId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PickerActivityLogsFilter {
  pickerId?: string;
  orderId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface PickerActivityLogsResponse {
  logs: PickerActionLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function fetchPickerActivityLogs(
  filter: PickerActivityLogsFilter
): Promise<PickerActivityLogsResponse> {
  const params = new URLSearchParams();
  if (filter.pickerId) params.set('pickerId', filter.pickerId);
  if (filter.orderId) params.set('orderId', filter.orderId);
  if (filter.actionType) params.set('actionType', filter.actionType);
  if (filter.startDate) params.set('startDate', filter.startDate);
  if (filter.endDate) params.set('endDate', filter.endDate);
  if (filter.page != null) params.set('page', String(filter.page));
  if (filter.limit != null) params.set('limit', String(filter.limit));
  const qs = params.toString();
  const url = `${API_ENDPOINTS.admin.pickers.allActionLogs}${qs ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: PickerActivityLogsResponse }>(url);
  return res.data;
}
