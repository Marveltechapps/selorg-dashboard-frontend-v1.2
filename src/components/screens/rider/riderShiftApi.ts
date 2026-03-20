import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface RiderShift {
  id: string;
  hubId?: string;
  hubName?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  capacity: number;
  bookedCount: number;
  status: 'draft' | 'published' | 'cancelled';
  isPeak: boolean;
  basePay: number;
  bonus: number;
  currency: string;
  breakMinutes: number;
  walkInBufferMinutes: number;
}

export interface RiderShiftListResponse {
  items: RiderShift[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchRiderShifts(params: {
  date?: string;
  hubId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<RiderShiftListResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      search.append(key, String(value));
    }
  });

  const url =
    API_ENDPOINTS.riderShifts.list + (search.toString() ? `?${search.toString()}` : '');

  const res = await apiRequest<{ success: boolean; data: RiderShiftListResponse }>(url);
  return res.data!;
}

export async function createRiderShift(payload: Partial<RiderShift>): Promise<RiderShift> {
  const res = await apiRequest<{ success: boolean; data: RiderShift }>(
    API_ENDPOINTS.riderShifts.create,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.data!;
}

export async function updateRiderShift(
  id: string,
  updates: Partial<RiderShift>
): Promise<RiderShift> {
  const res = await apiRequest<{ success: boolean; data: RiderShift }>(
    API_ENDPOINTS.riderShifts.update(id),
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
  return res.data!;
}

export async function deleteRiderShift(id: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.riderShifts.delete(id), {
    method: 'DELETE',
  });
}

