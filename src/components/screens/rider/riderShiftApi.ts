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

export interface RiderShiftListSummary {
  all: number;
  draft: number;
  published: number;
  cancelled: number;
  peak: number;
}

export interface RiderShiftListResponse {
  items: RiderShift[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  summary?: RiderShiftListSummary;
}

export interface RiderShiftHubOption {
  hubName: string;
  hubId: string;
}

export type RiderShiftStatusFilter = 'all' | 'draft' | 'published' | 'cancelled';
export type RiderShiftPeakFilter = 'all' | 'peak' | 'non-peak';
export type RiderShiftAvailabilityFilter = 'all' | 'available' | 'full' | 'empty';
export type RiderShiftSortBy = 'date' | 'startTime' | 'capacity' | 'booked' | 'hub';

export interface RiderShiftListParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  hubId?: string;
  hubName?: string;
  status?: string;
  search?: string;
  peakFilter?: RiderShiftPeakFilter;
  availability?: RiderShiftAvailabilityFilter;
  sortBy?: RiderShiftSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function fetchRiderShifts(
  params: RiderShiftListParams = {}
): Promise<RiderShiftListResponse> {
  const search = new URLSearchParams();
  if (params.peakFilter === 'peak') search.append('isPeak', 'true');
  if (params.peakFilter === 'non-peak') search.append('isPeak', 'false');

  Object.entries(params).forEach(([key, value]) => {
    if (key === 'peakFilter') return;
    if (value == null || value === '' || value === 'all') return;
    search.append(key, String(value));
  });

  const url =
    API_ENDPOINTS.riderShifts.list + (search.toString() ? `?${search.toString()}` : '');

  const res = await apiRequest<{ success: boolean; data: RiderShiftListResponse }>(url);
  return res.data!;
}

export async function fetchRiderShiftFilterOptions(): Promise<{ hubs: RiderShiftHubOption[] }> {
  const res = await apiRequest<{ success: boolean; data: { hubs: RiderShiftHubOption[] } }>(
    API_ENDPOINTS.riderShifts.filterOptions
  );
  return res.data ?? { hubs: [] };
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

export interface ShiftAssignment {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone?: string | null;
  riderStatus?: string | null;
  status: 'selected' | 'started' | 'completed' | 'cancelled';
  date?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
}

export interface ShiftAssignmentsResponse {
  shift: RiderShift;
  assignments: ShiftAssignment[];
  summary: {
    total: number;
    selected: number;
    started: number;
    completed: number;
    cancelled: number;
    capacity: number;
    available: number;
  };
}

export async function fetchShiftAssignments(shiftId: string): Promise<ShiftAssignmentsResponse> {
  const res = await apiRequest<{ success: boolean; data: ShiftAssignmentsResponse }>(
    API_ENDPOINTS.riderShifts.assignments(shiftId)
  );
  return res.data!;
}

export async function assignRiderToShift(shiftId: string, riderId: string): Promise<ShiftAssignmentsResponse> {
  const res = await apiRequest<{ success: boolean; data: ShiftAssignmentsResponse }>(
    API_ENDPOINTS.riderShifts.assignments(shiftId),
    {
      method: 'POST',
      body: JSON.stringify({ riderId }),
    }
  );
  return res.data!;
}

export async function unassignRiderFromShift(
  shiftId: string,
  riderId: string
): Promise<ShiftAssignmentsResponse> {
  const res = await apiRequest<{ success: boolean; data: ShiftAssignmentsResponse }>(
    API_ENDPOINTS.riderShifts.unassign(shiftId, riderId),
    { method: 'DELETE' }
  );
  return res.data!;
}
