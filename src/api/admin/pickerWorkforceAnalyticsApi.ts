import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

export interface PickerAnalyticsResponse {
  summary: {
    totalActivePickers: number;
    avgPicksPerHour: number;
    avgAccuracy: number;
    totalShiftsCompleted: number;
    avgAttendanceRate: number;
  };
  topPerformers: Array<{
    pickerId: string;
    name: string;
    picksPerHour: number;
    accuracy: number;
    shiftsThisMonth: number;
  }>;
  locationBreakdown: Array<{
    locationId: string;
    locationName: string;
    activePickers: number;
    avgPicksPerHour: number;
  }>;
  dailyTrend: Array<{
    date: string;
    totalPicks: number;
    activePickers: number;
    avgAccuracy: number;
  }>;
}

export async function fetchPickerWorkforceAnalytics(params?: {
  locationId?: string;
  from?: string;
  to?: string;
  period?: 'week' | 'month';
}): Promise<PickerAnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params?.locationId) qs.set('locationId', params.locationId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.period) qs.set('period', params.period);
  const token = getAuthToken();
  const url = `${API_CONFIG.baseURL}/admin/analytics/pickers${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!res.ok) throw new Error('Failed to load picker analytics');
  const json = await res.json();
  if (!json?.success || !json.data) throw new Error('Invalid picker analytics response');
  return json.data as PickerAnalyticsResponse;
}
