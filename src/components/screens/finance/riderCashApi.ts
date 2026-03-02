import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '../../../config/api';

export interface RiderCashSummary {
  pendingPayoutCount: number;
  pendingPayoutAmount: number;
  completedTodayCount: number;
  completedTodayAmount: number;
  codCollected: number;
  codDeposited: number;
  codOutstanding: number;
}

export interface RiderPayout {
  id: string;
  payoutNumber: string;
  riderId: string;
  riderPhoneNumber: string;
  amount: number;
  baseAmount: number;
  incentiveAmount: number;
  status: string;
  method: string;
  requestedAt: string;
  completedAt?: string;
  periodStart: string;
  periodEnd: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function fetchRiderCashSummary(): Promise<RiderCashSummary> {
  const res = await apiRequest<ApiResponse<RiderCashSummary>>(API_ENDPOINTS.finance.riderCash.summary);
  return res.data;
}

export async function fetchRiderPayouts(params: { page?: number; pageSize?: number; status?: string }): Promise<{
  data: RiderPayout[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  const url = `${API_ENDPOINTS.finance.riderCash.payouts}?${searchParams.toString()}`;
  const res = await apiRequest<ApiResponse<{ data: RiderPayout[]; total: number; page: number; pageSize: number }>>(url);
  return res.data;
}

export async function fetchCodReconciliation(): Promise<{ codCollected: number; codDeposited: number; codOutstanding: number }> {
  const res = await apiRequest<ApiResponse<{ codCollected: number; codDeposited: number; codOutstanding: number }>>(
    API_ENDPOINTS.finance.riderCash.codReconciliation
  );
  return res.data;
}
