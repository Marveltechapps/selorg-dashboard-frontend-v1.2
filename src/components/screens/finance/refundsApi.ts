import { apiRequest } from '@/api/apiClient';

const FINANCE_REFUNDS = '/finance/refunds';

export type RefundReasonCode =
  | 'item_damaged'
  | 'expired'
  | 'late_delivery'
  | 'wrong_item'
  | 'customer_cancelled'
  | 'item_not_available'
  | 'quality_issue'
  | 'partial_delivery'
  | 'other';

export interface RefundRequest {
  id: string;
  orderId: string;
  orderIdRaw?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  reasonCode: RefundReasonCode;
  reasonText: string;
  amount: number;
  currency: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'completed' | 'escalated';
  channel: 'customer_support' | 'self_service' | 'ops_adjustment' | 'auto_missing_item';
  refundMethod?: 'original_payment' | 'wallet' | 'bank_transfer' | 'manual';
  paymentId?: string;
  transactionId?: string;
  notes?: string;
  timeline?: Array<{ status: string; timestamp: string; note?: string; actor?: string }>;
}

export interface WalletTransactionRow {
  id: string;
  customerId: string;
  customerName: string;
  type: 'credit' | 'debit';
  amount: number;
  source: string;
  reference?: string;
  orderId?: string;
  description?: string;
  createdAt: string;
}

export interface ChargebackCase {
  id: string;
  cardNetwork: string;
  amount: number;
  currency: string;
  initiatedAt: string;
  status: "open" | "won" | "lost" | "under_review";
  reasonCode: string;
  orderId?: string;
}

export interface RefundsSummary {
  refundRequestsCount: number;
  activeChargebacksCount: number;
  processedTodayAmount: number;
}

export interface RefundQueueFilter {
  status?: string;
  page: number;
  pageSize: number;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
}

interface RefundQueueResponse {
  data: RefundRequest[];
  total: number;
  page: number;
  pageSize: number;
}

function buildRefundQueueParams(filter: RefundQueueFilter): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: filter.pageSize,
  };
  if (filter.status && filter.status !== 'all') params.status = filter.status;
  if (filter.reason && filter.reason !== 'all') params.reason = filter.reason;
  if (filter.dateFrom) params.dateFrom = filter.dateFrom;
  if (filter.dateTo) params.dateTo = filter.dateTo;
  if (filter.query?.trim()) params.query = filter.query.trim();
  return params;
}

export const fetchRefundsSummary = async (): Promise<RefundsSummary> => {
  const res = await apiRequest<{ success: boolean; data: RefundsSummary }>(
    `${FINANCE_REFUNDS}/summary`
  );
  return res.data;
};

export const fetchRefundQueue = async (filter: RefundQueueFilter): Promise<RefundQueueResponse> => {
  const params = buildRefundQueueParams(filter);
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = `${FINANCE_REFUNDS}/queue${query ? `?${query}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: RefundQueueResponse }>(url);
  return res.data;
};

export const fetchRefundDetails = async (id: string): Promise<RefundRequest> => {
  const res = await apiRequest<{ success: boolean; data: RefundRequest }>(
    `${FINANCE_REFUNDS}/${id}`
  );
  return res.data;
};

export const approveRefund = async (id: string, notes?: string, partialAmount?: number): Promise<RefundRequest> => {
  const res = await apiRequest<{ success: boolean; data: RefundRequest }>(
    `${FINANCE_REFUNDS}/${id}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ notes, partialAmount }),
    }
  );
  return res.data;
};

export const rejectRefund = async (id: string, reason: string): Promise<RefundRequest> => {
  const res = await apiRequest<{ success: boolean; data: RefundRequest }>(
    `${FINANCE_REFUNDS}/${id}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
  return res.data;
};

export const markRefundCompleted = async (
  id: string,
  transactionId?: string,
  notes?: string
): Promise<RefundRequest> => {
  const res = await apiRequest<{ success: boolean; data: RefundRequest }>(
    `${FINANCE_REFUNDS}/${id}/mark-completed`,
    {
      method: 'POST',
      body: JSON.stringify({ transactionId, notes }),
    }
  );
  return res.data;
};

export const fetchWalletTransactions = async (): Promise<WalletTransactionRow[]> => {
  const res = await apiRequest<{ success: boolean; data: WalletTransactionRow[] }>(
    '/finance/wallet-transactions'
  );
  return res.data ?? [];
};

export const fetchChargebacks = async (): Promise<ChargebackCase[]> => {
  const res = await apiRequest<{ success: boolean; data: ChargebackCase[] }>(
    `${FINANCE_REFUNDS}/chargebacks`
  );
  return res.data;
};
