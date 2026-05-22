import { API_CONFIG, API_ENDPOINTS } from '@/config/api';
import { getActiveStoreId, getAuthToken, getAuthUser } from '@/contexts/AuthContext';

export interface FinanceSummary {
  entityId: string;
  date: string;
  totalReceivedToday: number;
  totalReceivedChangePercent: number;
  pendingSettlementsAmount: number;
  pendingSettlementsGateways: number;
  vendorPayoutsAmount: number;
  vendorPayoutsStatusText: string;
  failedPaymentsRatePercent: number;
  failedPaymentsCount: number;
  failedPaymentsThresholdPercent: number;
  netRevenueToday: number;
  refundsTodayAmount: number;
  refundsTodayCount: number;
  settlementSuccessRatePercent: number;
  settledPaymentsCount: number;
  settlementAttemptsCount: number;
  averageOrderValue: number;
  successfulOrderCount: number;
  refundRatePercent: number;
  codPercent: number;
  codTxnCount: number;
  gatewaySuccessRatePercent: number;
  gatewaySuccessCount: number;
  gatewayTerminalCount: number;
}

export interface PaymentMethodSplitItem {
  method: string;
  label: string;
  percentage: number;
  amount: number;
  txnCount: number;
}

export interface LiveTransaction {
  id: string;
  txnId: string;
  amount: number;
  currency: string;
  methodDisplay: string;
  maskedDetails: string;
  status: "success" | "failed" | "pending";
  createdAt: string;
  gateway: string;
  orderId?: string;
  customerName?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken() || '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    const raw = data?.error ?? data?.message ?? data?.data?.message;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (raw && typeof raw === 'object') {
      const nested = (raw as Record<string, unknown>).message;
      if (typeof nested === 'string' && nested.trim()) return nested;
      return JSON.stringify(raw);
    }
  } catch {
    // ignore json parse failures
  }
  return fallback;
}

function resolveFinanceEntityId(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const activeStoreId = getActiveStoreId();
  if (activeStoreId && activeStoreId.trim()) return activeStoreId.trim();
  const user = getAuthUser();
  if (user?.primaryStoreId && user.primaryStoreId.trim()) return user.primaryStoreId.trim();
  if (user?.assignedStores?.[0] && user.assignedStores[0].trim()) return user.assignedStores[0].trim();
  return 'default';
}

function normalizePaymentMethodSplit(data: any): PaymentMethodSplitItem[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.split)
    ? data.split
    : [];

  return list.map((item: any) => ({
    method: String(item.method ?? item.key ?? 'unknown'),
    label: String(item.label ?? item.method ?? item.key ?? 'Unknown'),
    percentage: Number(item.percentage ?? item.percent ?? 0),
    amount: Number(item.amount ?? item.totalAmount ?? 0),
    txnCount: Number(item.txnCount ?? item.count ?? item.transactions ?? 0),
  }));
}

function normalizeFinanceSummary(raw: Record<string, unknown>): FinanceSummary {
  const num = (key: string, fallback = 0) => Number(raw[key] ?? fallback);
  return {
    entityId: String(raw.entityId ?? 'default'),
    date: String(raw.date ?? new Date().toISOString()),
    totalReceivedToday: num('totalReceivedToday'),
    totalReceivedChangePercent: num('totalReceivedChangePercent'),
    pendingSettlementsAmount: num('pendingSettlementsAmount'),
    pendingSettlementsGateways: num('pendingSettlementsGateways'),
    vendorPayoutsAmount: num('vendorPayoutsAmount'),
    vendorPayoutsStatusText: String(raw.vendorPayoutsStatusText ?? 'No payouts scheduled'),
    failedPaymentsRatePercent: num('failedPaymentsRatePercent'),
    failedPaymentsCount: num('failedPaymentsCount'),
    failedPaymentsThresholdPercent: num('failedPaymentsThresholdPercent', 1),
    netRevenueToday: num('netRevenueToday', num('totalReceivedToday')),
    refundsTodayAmount: num('refundsTodayAmount'),
    refundsTodayCount: num('refundsTodayCount'),
    settlementSuccessRatePercent: num('settlementSuccessRatePercent', 100),
    settledPaymentsCount: num('settledPaymentsCount'),
    settlementAttemptsCount: num('settlementAttemptsCount'),
    averageOrderValue: num('averageOrderValue'),
    successfulOrderCount: num('successfulOrderCount'),
    refundRatePercent: num('refundRatePercent'),
    codPercent: num('codPercent'),
    codTxnCount: num('codTxnCount'),
    gatewaySuccessRatePercent: num('gatewaySuccessRatePercent', 100),
    gatewaySuccessCount: num('gatewaySuccessCount'),
    gatewayTerminalCount: num('gatewayTerminalCount'),
  };
}

export const fetchFinanceSummary = async (entityId: string, date: string): Promise<FinanceSummary> => {
  const params = new URLSearchParams({ entityId: resolveFinanceEntityId(entityId), date });
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.summary}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch finance summary: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return normalizeFinanceSummary(data as Record<string, unknown>);
};

export const fetchPaymentMethodSplit = async (entityId: string, date: string): Promise<PaymentMethodSplitItem[]> => {
  const params = new URLSearchParams({ entityId: resolveFinanceEntityId(entityId), date });
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.paymentMethodSplit}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch payment method split: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return normalizePaymentMethodSplit(data);
};

export const fetchLiveTransactions = async (
  entityId: string,
  limit: number = 10,
  cursor?: string
): Promise<LiveTransaction[]> => {
  const params = new URLSearchParams({ entityId: resolveFinanceEntityId(entityId), limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.liveTransactions}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch live transactions: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return Array.isArray(data) ? data : [];
};

/**
 * Convert date range preset to ISO date strings for API.
 * Backend export expects { from, to } as date strings.
 */
export function dateRangeToFromTo(dateRange: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);

  switch (dateRange) {
    case 'yesterday':
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case '7d':
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case 'today':
    default:
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export const exportFinanceReport = async (payload: {
  entityId?: string;
  dateRange: string;
  format: string;
  scope: string[];
}): Promise<void> => {
  const { from, to } = dateRangeToFromTo(payload.dateRange);
  const resolvedFormat = payload.format || 'pdf';
  const body = {
    entityId: resolveFinanceEntityId(payload.entityId),
    dateRange: { from, to },
    format: resolvedFormat,
    scope: payload.scope,
  };

  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.finance.export}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, `Export failed: ${response.status}`));
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const isFile = contentType.includes('application/octet-stream') ||
    contentType.includes('text/csv') ||
    contentType.includes('text/html') ||
    contentType.includes('application/pdf');

  if (isFile) {
    const blob = await response.blob();
    const cd = response.headers.get('Content-Disposition');
    const match = cd?.match(/filename="?([^";\n]+)"?/);
    const filename = match?.[1] ?? `finance-report-${new Date().toISOString().split('T')[0]}.${resolvedFormat}`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return;
  }

  const json = await response.json();
  const data = json.success ? json.data : json;
  if (data?.url) {
    window.open(data.url, '_blank');
  }
};
