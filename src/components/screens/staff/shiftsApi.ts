/**
 * Staff & Shifts API
 * Wired to real backend at /api/v1/staff
 */

import { API_CONFIG, API_ENDPOINTS } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'absent' | 'late';

export interface Shift {
  id: string;
  riderId: string;
  riderName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  checkInTime?: string;
  checkOutTime?: string;
  hub: string;
  isPeakHour: boolean;
  overtimeMinutes?: number;
}

export interface ShiftSummary {
  date: string;
  checkedInCount: number;
  scheduledTodayCount: number;
  absentOrLateCount: number;
}

export interface AvailableRider {
  id: string;
  name: string;
  hub: string;
  existingHours: number;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const fetchShiftSummary = async (date: string): Promise<ShiftSummary> => {
  const params = new URLSearchParams({ date });
  const data = await apiRequest<ShiftSummary>(`${API_ENDPOINTS.staff.summary}?${params}`);
  return data;
};

export const fetchShifts = async (date: string): Promise<Shift[]> => {
  const params = new URLSearchParams({ date });
  const data = await apiRequest<Shift[]>(`${API_ENDPOINTS.staff.shifts}?${params}`);
  return Array.isArray(data) ? data : [];
};

export const fetchAvailableRiders = async (date?: string): Promise<AvailableRider[]> => {
  const d = date ?? new Date().toISOString().split('T')[0];
  const params = new URLSearchParams({ date: d });
  const data = await apiRequest<AvailableRider[]>(
    `${API_ENDPOINTS.staff.list}?${params}`
  );
  return Array.isArray(data) ? data : [];
};

export const createShift = async (
  newShift: Omit<Shift, 'id' | 'riderName'> & { riderName?: string }
): Promise<Shift> => {
  return apiRequest<Shift>(API_ENDPOINTS.staff.shifts, {
    method: 'POST',
    body: JSON.stringify({
      riderId: newShift.riderId,
      riderName: newShift.riderName,
      date: newShift.date,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      hub: newShift.hub,
      isPeakHour: newShift.isPeakHour ?? false,
      status: newShift.status ?? 'scheduled',
    }),
  });
};

export const updateShiftStatus = async (
  id: string,
  updates: Partial<Pick<Shift, 'status' | 'checkInTime' | 'checkOutTime' | 'overtimeMinutes'>>
): Promise<Shift> => {
  return apiRequest<Shift>(API_ENDPOINTS.staff.shift(id), {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};
