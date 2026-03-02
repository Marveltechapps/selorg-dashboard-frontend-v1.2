import { API_CONFIG, API_ENDPOINTS } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

export type ReportType = "revenue_growth" | "cash_flow" | "expense_breakdown" | "pnl";
export type Granularity = "month" | "quarter";

export interface RevenueGrowthPoint {
  date: string;
  totalRevenue: number;
  recurringRevenue: number;
  newRevenue: number;
  churnAmount: number;
}

export interface CashFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  projected?: number;
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  color?: string;
}

export interface ExpenseBreakdownPoint {
  date: string;
  categories: ExpenseCategory[];
}

export interface AnalyticsExportRequest {
  metric: ReportType;
  from: string;
  to: string;
  format: "pdf" | "xlsx";
  details?: "summary" | "detailed";
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken() || '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Convert date range preset (e.g. last_12_months) to from/to date strings.
 */
export function dateRangeToFromTo(dateRange: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);

  switch (dateRange) {
    case 'last_month':
      from.setMonth(from.getMonth() - 1);
      break;
    case 'last_quarter':
      from.setMonth(from.getMonth() - 3);
      break;
    case 'last_3_months':
      from.setMonth(from.getMonth() - 3);
      break;
    case 'last_6_months':
      from.setMonth(from.getMonth() - 6);
      break;
    case 'last_12_months':
    case 'last_year':
      from.setMonth(from.getMonth() - 12);
      break;
    case 'ytd':
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    default:
      from.setMonth(from.getMonth() - 12);
      break;
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export const fetchRevenueGrowth = async (
  dateRange?: string,
  _to?: string,
  granularity: Granularity = 'month'
): Promise<RevenueGrowthPoint[]> => {
  const { from, to } = dateRangeToFromTo(dateRange ?? 'last_12_months');
  const params = new URLSearchParams({ from, to, granularity });
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.analytics.revenueGrowth}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch revenue growth: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return Array.isArray(data) ? data : [];
};

export const fetchCashFlow = async (
  dateRange?: string,
  _to?: string,
  granularity: Granularity = 'month'
): Promise<CashFlowPoint[]> => {
  const { from, to } = dateRangeToFromTo(dateRange ?? 'last_12_months');
  const params = new URLSearchParams({ from, to, granularity });
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.analytics.cashFlow}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch cash flow: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return Array.isArray(data) ? data : [];
};

export const fetchExpenseBreakdown = async (
  dateRange?: string,
  _to?: string,
  granularity: Granularity = 'month'
): Promise<ExpenseBreakdownPoint[]> => {
  const { from, to } = dateRangeToFromTo(dateRange ?? 'last_12_months');
  const params = new URLSearchParams({ from, to, granularity });
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.finance.analytics.expenseBreakdown}?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch expense breakdown: ${response.status}`);
  }
  const json = await response.json();
  const data = json.success ? json.data : json;
  return Array.isArray(data) ? data : [];
};

export const exportAnalyticsReport = async (req: AnalyticsExportRequest): Promise<void> => {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.finance.analytics.export}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
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
    const filename = match?.[1] ?? `P&L_Report_${req.from}_${req.to}.${req.format}`;
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
