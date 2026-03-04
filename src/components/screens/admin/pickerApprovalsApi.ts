import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export type PickerStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED';

export interface PickerApprovalListItem {
  pickerId: string;
  name: string;
  phone: string;
  site: string;
  docsStatus: 'not_uploaded' | 'partial' | 'complete';
  faceVerification: boolean;
  trainingProgress: number;
  trainingCompleted: boolean;
  onboardingStage: string;
  appliedDate: string;
  status: PickerStatus;
  rejectedReason?: string;
  rejectedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface PickerApprovalDetails extends Omit<PickerApprovalListItem, 'trainingProgress'> {
  trainingProgress: number;
  trainingProgressObj?: Record<string, number>;
  email?: string;
  age?: number;
  gender?: string;
  photoUri?: string;
  locationType?: string;
  currentLocationId?: string;
  selectedShifts?: { id: string; name: string; time: string }[];
  trainingCompletedAt?: string;
  upiId?: string;
  upiName?: string;
  contractInfo?: Record<string, unknown>;
  employment?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  documents?: {
    aadhar?: { front: string | null; back: string | null };
    pan?: { front: string | null; back: string | null };
  };
  bankDetails?: Array<{
    accountHolder: string;
    accountNumber: string | null;
    ifscCode: string;
    bankName?: string;
    branch?: string;
    isVerified: boolean;
    isDefault: boolean;
  }>;
}

export interface PickerApprovalsFilter {
  status?: string;
  page: number;
  limit: number;
}

interface PickerApprovalsListResponse {
  data: PickerApprovalListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function buildParams(filter: PickerApprovalsFilter): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filter.page,
    limit: filter.limit,
  };
  if (filter.status && filter.status !== 'all') params.status = filter.status;
  return params;
}

export const fetchPickerApprovalsList = async (
  filter: PickerApprovalsFilter
): Promise<PickerApprovalsListResponse> => {
  const params = buildParams(filter);
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = `${API_ENDPOINTS.admin.pickers.list}${query ? `?${query}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: PickerApprovalsListResponse }>(url);
  return res.data;
};

export const fetchPickerDetails = async (id: string): Promise<PickerApprovalDetails> => {
  const res = await apiRequest<{ success: boolean; data: PickerApprovalDetails }>(
    API_ENDPOINTS.admin.pickers.byId(id)
  );
  return res.data;
};

export const fetchPickerActionLogs = async (
  pickerId: string,
  params?: { startDate?: string; endDate?: string; actionType?: string; limit?: number }
): Promise<any[]> => {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.actionType) searchParams.set('actionType', params.actionType);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = `${API_ENDPOINTS.admin.pickers.actionLogs(pickerId)}${qs ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[] }>(url);
  return Array.isArray(res.data) ? res.data : [];
};

export const updatePickerStatus = async (
  id: string,
  status: PickerStatus,
  rejectedReason?: string
): Promise<PickerApprovalDetails> => {
  const body: { status: PickerStatus; rejectedReason?: string } = { status };
  if (rejectedReason) body.rejectedReason = rejectedReason;
  const res = await apiRequest<{ success: boolean; data: PickerApprovalDetails }>(
    API_ENDPOINTS.admin.pickers.updateStatus(id),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return res.data;
};
