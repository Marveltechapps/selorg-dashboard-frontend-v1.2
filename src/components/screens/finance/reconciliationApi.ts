import { apiRequest } from '@/api/apiClient';

const FINANCE_RECON = '/finance/reconciliation';

export interface SettlementSummaryItem {
  id: string;
  gateway: string;
  matchedAmount: number;
  pendingAmount: number;
  mismatchAmount: number;
  status: "matched" | "pending" | "mismatch";
  matchPercent: number;
  lastRunAt: string;
}

export interface ReconciliationException {
  id: string;
  title: string;
  sourceType: "gateway" | "bank" | "internal";
  gateway?: string;
  amount: number;
  currency: string;
  status: "open" | "in_review" | "resolved" | "ignored";
  reasonCode: string;
  createdAt: string;
  details?: string;
  suggestedAction?: "investigate" | "resolve" | "write_off" | "retry_match";
}

export interface ReconciliationRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "failed";
  period: { from: string; to: string };
  gateways: string[];
}

/** Format date as YYYY-MM-DD for backend */
function toDateString(date: string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export const fetchReconSummary = async (date: string): Promise<SettlementSummaryItem[]> => {
  const dateStr = toDateString(date);
  const res = await apiRequest<{ success: boolean; data: SettlementSummaryItem[] }>(
    `${FINANCE_RECON}/summary?date=${encodeURIComponent(dateStr)}`
  );
  return res.data ?? [];
};

export const fetchExceptions = async (status: string = "open"): Promise<ReconciliationException[]> => {
  const res = await apiRequest<{ success: boolean; data: ReconciliationException[] }>(
    `${FINANCE_RECON}/exceptions?status=${encodeURIComponent(status)}`
  );
  return res.data ?? [];
};

export const runReconciliation = async (date: string, gateways: string[]): Promise<ReconciliationRun> => {
  const dateStr = toDateString(date);
  const res = await apiRequest<{ success: boolean; data: ReconciliationRun }>(
    `${FINANCE_RECON}/run`,
    {
      method: 'POST',
      body: JSON.stringify({ date: dateStr, gateways }),
    }
  );
  return res.data;
};

export const fetchRunStatus = async (id: string): Promise<ReconciliationRun> => {
  const res = await apiRequest<{ success: boolean; data: ReconciliationRun }>(
    `${FINANCE_RECON}/runs/${id}`
  );
  return res.data;
};

export const investigateException = async (id: string): Promise<ReconciliationException> => {
  const res = await apiRequest<{ success: boolean; data: ReconciliationException }>(
    `${FINANCE_RECON}/exceptions/${id}/investigate`,
    { method: 'POST' }
  );
  return res.data;
};

/** resolutionType must be one of: investigate, resolve, write_off, retry_match */
export const resolveException = async (
  id: string,
  resolutionType: string,
  note?: string
): Promise<ReconciliationException> => {
  const res = await apiRequest<{ success: boolean; data: ReconciliationException }>(
    `${FINANCE_RECON}/exceptions/${id}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({ resolutionType, note }),
    }
  );
  return res.data;
};

export const getGatewayDetails = async (gatewayId: string): Promise<SettlementSummaryItem | null> => {
  const res = await apiRequest<{ success: boolean; data: SettlementSummaryItem }>(
    `${FINANCE_RECON}/gateways/${encodeURIComponent(gatewayId)}`
  );
  return res.data ?? null;
};
