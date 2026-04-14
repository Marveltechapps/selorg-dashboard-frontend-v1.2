import { apiRequest } from '@/api/apiClient';

/** Row shape returned by GET /admin/pickers (list items). */
export interface AdminPickerListRow {
  id: string;
  pickerId: string;
  name: string;
  phone: string;
  status: string;
  currentLocationId: string | null;
  locationName: string;
  onboardingStep: string;
  createdAt?: string;
  lastSeenAt: string | null;
  shiftActive: boolean;
}

export interface AdminPickersListPayload {
  data: AdminPickerListRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Total page count when provided by API */
  pages?: number;
}

export interface AdminPickersListResponse {
  success: boolean;
  data: AdminPickersListPayload;
}

export async function getPickers(filters: {
  page?: number;
  limit?: number;
  status?: string;
  locationId?: string;
  search?: string;
} = {}): Promise<AdminPickersListResponse> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      query.append(k, String(v));
    }
  });
  const qs = query.toString();
  return apiRequest<AdminPickersListResponse>(`/admin/pickers${qs ? `?${qs}` : ''}`);
}
