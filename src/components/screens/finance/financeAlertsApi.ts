import { apiRequest } from '@/api/apiClient';

export type AlertType =
  | "gateway_failure_rate"
  | "high_value_txn"
  | "settlement_mismatch"
  | "sla_breach"
  | "risk_fraud"
  | "other";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type AlertStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export interface FinanceAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  createdAt: string;
  lastUpdatedAt: string;
  status: AlertStatus;
  source: {
    gateway?: string;
    txnId?: string;
    batchId?: string;
    metrics?: {
      failureRatePercent?: number;
      thresholdPercent?: number;
      amount?: number;
    };
  };
  suggestedActions: string[];
}

export interface AlertActionPayload {
  actionType: "check_gateway" | "review_txn" | "reconcile" | "acknowledge" | "dismiss" | "resolve" | "add_note";
  metadata?: Record<string, unknown>;
}

const BASE = '/finance';

export const fetchAlerts = async (status: AlertStatus | 'all' = 'open'): Promise<FinanceAlert[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const response = await apiRequest<{ success: boolean; data: FinanceAlert[] }>(
    `${BASE}/alerts${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data ?? [];
};

export const fetchAlertDetails = async (id: string): Promise<FinanceAlert | null> => {
  const response = await apiRequest<{ success: boolean; data: FinanceAlert }>(`${BASE}/alerts/${id}`);
  return response.data ?? null;
};

export const performAlertAction = async (
  id: string,
  payload: AlertActionPayload
): Promise<FinanceAlert> => {
  const response = await apiRequest<{ success: boolean; data: FinanceAlert }>(
    `${BASE}/alerts/${id}/action`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return response.data;
};

export const clearResolvedAlerts = async (): Promise<void> => {
  await apiRequest(`${BASE}/alerts/clear-resolved`, {
    method: 'POST',
  });
};
