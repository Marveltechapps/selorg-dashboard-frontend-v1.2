import { apiRequest } from '@/api/apiClient';

export interface CustomerPayment {
  id: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodDisplay: string;
  methodType: 'card' | 'wallet' | 'net_banking' | 'cod' | string;
  gatewayRef: string;
  status: 'captured' | 'authorized' | 'pending' | 'declined' | 'refunded' | 'chargeback';
  createdAt: string;
  lastUpdatedAt: string;
  retryEligible: boolean;
  failureReason?: string;
}

export interface CustomerPaymentFilter {
  query?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  methodType?: string;
  page: number;
  pageSize: number;
}

export interface CustomerPaymentsResponse {
  success: boolean;
  data: {
    data: CustomerPayment[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface CustomerPaymentDetailsResponse {
  success: boolean;
  data: CustomerPayment;
}

export interface RetryPaymentResponse {
  success: boolean;
  data: CustomerPayment;
}

/**
 * Convert date string (YYYY-MM-DD) to ISO datetime for backend validation
 */
function toISODateTime(dateStr: string, endOfDay = false): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export const fetchCustomerPayments = async (
  filter: CustomerPaymentFilter
): Promise<{ data: CustomerPayment[]; total: number; page: number; pageSize: number }> => {
  const params = new URLSearchParams();
  if (filter.query) params.append('query', filter.query);
  if (filter.status && filter.status !== 'all' && filter.status !== 'All Statuses')
    params.append('status', filter.status);
  if (filter.dateFrom) params.append('dateFrom', toISODateTime(filter.dateFrom));
  if (filter.dateTo) params.append('dateTo', toISODateTime(filter.dateTo, true));
  if (filter.methodType && filter.methodType !== 'all' && filter.methodType !== 'any')
    params.append('methodType', filter.methodType);
  params.append('page', String(filter.page));
  params.append('pageSize', String(filter.pageSize));

  const response = await apiRequest<CustomerPaymentsResponse>(
    `/finance/customer-payments?${params.toString()}`
  );
  const result = response.data;
  return {
    data: result?.data ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? filter.page,
    pageSize: result?.pageSize ?? filter.pageSize,
  };
};

export const fetchCustomerPaymentDetails = async (id: string): Promise<CustomerPayment> => {
  const response = await apiRequest<CustomerPaymentDetailsResponse>(
    `/finance/customer-payments/${encodeURIComponent(id)}`
  );
  if (!response?.data) throw new Error('Payment not found');
  return response.data;
};

export const retryCustomerPayment = async (
  id: string,
  amount?: number
): Promise<CustomerPayment> => {
  const response = await apiRequest<RetryPaymentResponse>(
    `/finance/customer-payments/${encodeURIComponent(id)}/retry`,
    {
      method: 'POST',
      body: JSON.stringify(amount != null ? { amount } : {}),
    }
  );
  if (!response?.data) throw new Error('Retry failed');
  return response.data;
};
