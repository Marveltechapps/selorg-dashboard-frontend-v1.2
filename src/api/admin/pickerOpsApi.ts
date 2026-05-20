import { apiDownloadCsv, apiRequest } from '@/api/apiClient';

const ADMIN_PICKER_BASE = '/admin/picker';

export type PickerOpsStatus = 'pending' | 'approved' | 'rejected' | 'deactivated';

export interface PickerOpsListItem {
  pickerId: string;
  name: string;
  phone: string;
  agencyId?: string | null;
  agencyName?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  shiftSlotId?: string | null;
  shiftSlotLabel?: string | null;
  status: PickerOpsStatus;
}

export interface AgencyItem {
  agencyId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  isActive: boolean;
  activePickersCount: number;
}

export interface ShiftSlotItem {
  shiftSlotId: string;
  storeId: string;
  type: 'morning' | 'evening' | 'night' | string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  geofenceRadiusMeters?: number;
  gracePeriodMinutes?: number;
}

export interface OtRequestItem {
  requestId: string;
  pickerId: string;
  pickerName: string;
  storeId: string;
  storeName: string;
  requestedOtMinutes: number;
  shiftEndTime: string; // ISO or display string
}

export interface ShiftChangeRequestItem {
  requestId: string;
  pickerId: string;
  pickerName: string;
  currentShiftLabel: string;
  requestedShiftLabel: string;
  reason: string;
}

export async function fetchPickers(filter?: {
  q?: string;
  status?: PickerOpsStatus | 'all';
  page?: number;
  limit?: number;
}): Promise<{ data: PickerOpsListItem[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (filter?.q) params.set('q', filter.q);
  if (filter?.status && filter.status !== 'all') params.set('status', filter.status);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.limit) params.set('limit', String(filter.limit));
  const qs = params.toString();
  const res = await apiRequest<{ success: boolean; data: any }>(`${ADMIN_PICKER_BASE}/pickers${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function updatePickerAssignment(
  pickerId: string,
  payload: { agencyId?: string | null; storeId?: string | null; shiftSlotId?: string | null }
): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/pickers/${pickerId}/assignment`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updatePickerOpsStatus(
  pickerId: string,
  status: PickerOpsStatus,
  reason?: string
): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/pickers/${pickerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function fetchAgencies(): Promise<AgencyItem[]> {
  const res = await apiRequest<{ success: boolean; data: AgencyItem[] }>(`${ADMIN_PICKER_BASE}/agencies`);
  return res.data;
}

export async function createAgency(payload: { name: string; contactPerson?: string; phone?: string }): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/agencies`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function deactivateAgency(agencyId: string): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/agencies/${encodeURIComponent(agencyId)}/deactivate`, { method: 'POST' });
}

export async function activateAgency(agencyId: string): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/agencies/${encodeURIComponent(agencyId)}/activate`, { method: 'POST' });
}

export async function fetchStoreShiftSlots(storeId: string): Promise<ShiftSlotItem[]> {
  const res = await apiRequest<{ success: boolean; data: ShiftSlotItem[] }>(`${ADMIN_PICKER_BASE}/stores/${storeId}/shift-slots`);
  return res.data;
}

export async function createShiftSlot(
  storeId: string,
  payload: Omit<ShiftSlotItem, 'shiftSlotId' | 'storeId'> & { geofenceRadiusMeters?: number; gracePeriodMinutes?: number }
): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/stores/${storeId}/shift-slots`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchOtRequests(): Promise<OtRequestItem[]> {
  const res = await apiRequest<{ success: boolean; data: OtRequestItem[] }>(`${ADMIN_PICKER_BASE}/ot-requests`);
  return res.data;
}

export async function decideOtRequest(requestId: string, decision: 'approve' | 'reject', reason?: string): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/ot-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, reason }),
  });
}

export async function fetchShiftChangeRequests(): Promise<ShiftChangeRequestItem[]> {
  const res = await apiRequest<{ success: boolean; data: ShiftChangeRequestItem[] }>(`${ADMIN_PICKER_BASE}/shift-change-requests`);
  return res.data;
}

export async function decideShiftChangeRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  reason?: string
): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/shift-change-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, reason }),
  });
}

export async function downloadAttendanceCsv(filter: { month: string; agencyId?: string | 'all' }): Promise<void> {
  const params = new URLSearchParams();
  params.set('month', filter.month);
  if (filter.agencyId && filter.agencyId !== 'all') params.set('agencyId', filter.agencyId);
  await apiDownloadCsv(`${ADMIN_PICKER_BASE}/attendance/export?${params.toString()}`, `picker-attendance-${filter.month}.csv`);
}

export async function sendPickerPushNotification(pickerId: string, payload: { title: string; body: string }): Promise<void> {
  await apiRequest(`${ADMIN_PICKER_BASE}/pickers/${pickerId}/push`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

