import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface PickerWithdrawalListItem {
  id: string;
  pickerId: string;
  pickerName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  bankDetails: { last4: string; bankName?: string } | null;
}

export interface PickerWithdrawalDetails {
  id: string;
  pickerId: string;
  pickerName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  pickerPhone?: string;
  pickerEmail?: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
    branch?: string;
  } | null;
  walletLedger: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    description?: string;
    createdAt: string;
    referenceId?: string;
  }>;
  timeline: Array<{ stage: string; timestamp: string }>;
}

export interface PickerWithdrawalFilters {
  status?: WithdrawalStatus | 'all';
  page?: number;
  limit?: number;
}

interface ListResponse {
  data: PickerWithdrawalListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchPickerWithdrawals(
  filters: PickerWithdrawalFilters
): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  const qs = params.toString();
  const url = `${API_ENDPOINTS.finance.pickerWithdrawals.list}${qs ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean } & ListResponse>(url);
  return res;
}

export async function fetchPickerWithdrawalDetails(id: string): Promise<PickerWithdrawalDetails> {
  const res = await apiRequest<{ success: boolean; data: PickerWithdrawalDetails }>(
    API_ENDPOINTS.finance.pickerWithdrawals.byId(id)
  );
  return res.data;
}

export async function updatePickerWithdrawal(
  id: string,
  action: 'approve' | 'reject' | 'mark_paid',
  rejectedReason?: string
): Promise<PickerWithdrawalDetails> {
  const body: { action: string; rejectedReason?: string } = { action };
  if (action === 'reject' && rejectedReason) body.rejectedReason = rejectedReason;
  const res = await apiRequest<{ success: boolean; data: PickerWithdrawalDetails }>(
    API_ENDPOINTS.finance.pickerWithdrawals.byId(id),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return res.data;
}

export async function fetchPickerEarningsBreakdown(pickerId: string) {
  const res = await apiRequest<{ success: boolean; data: any }>(
    API_ENDPOINTS.finance.pickerWithdrawals.earningsBreakdown(pickerId)
  );
  return res.data;
}

export async function fetchPickerWalletBalance(pickerId: string) {
  const res = await apiRequest<{ success: boolean; data: { availableBalance: number; pendingBalance: number; totalEarnings: number; currency: string } }>(
    API_ENDPOINTS.finance.pickerWithdrawals.walletBalance(pickerId)
  );
  return res.data;
}

export interface PickerTransactionRow {
  id: string;
  pickerId: string;
  pickerName: string;
  pickerPhone: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export async function fetchAllPickerTransactions(filters: {
  search?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  );
  const query = params.toString();
  return apiRequest<{
    success: boolean;
    data: PickerTransactionRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`${API_ENDPOINTS.finance.pickerTransactions}${query ? `?${query}` : ''}`);
}
