import { apiRequest } from '@/api/apiClient';

export type TaskType = "refund" | "invoice" | "vendor_payment" | "large_payment" | "adjustment";
export type TaskStatus = "pending" | "approved" | "rejected";

export interface ApprovalTask {
  id: string;
  type: TaskType;
  description: string;
  details?: string;
  amount: number;
  currency: string;
  requesterName: string;
  requesterRole: string;
  createdAt: string;
  status: TaskStatus;
  approverName?: string;
  approvedAt?: string;
  relatedIds?: {
    orderId?: string;
    invoiceId?: string;
    vendorId?: string;
    customerId?: string;
  };
  notes?: string;
}

export interface ApprovalSummary {
  refundRequestsCount: number;
  invoiceApprovalsCount: number;
  approvedTodayCount: number;
}

export interface ApprovalDecisionPayload {
  decision: "approve" | "reject";
  note?: string;
}

const BASE = '/finance';

export const fetchApprovalSummary = async (): Promise<ApprovalSummary> => {
  const response = await apiRequest<{ success: boolean; data: ApprovalSummary }>(
    `${BASE}/approvals/summary`
  );
  return response.data;
};

export const fetchApprovalTasks = async (
  status: TaskStatus = 'pending',
  type?: string,
  minAmount?: number
): Promise<ApprovalTask[]> => {
  const params = new URLSearchParams();
  params.append('status', status);
  if (type && type !== 'all') params.append('type', type);
  if (minAmount != null) params.append('minAmount', String(minAmount));
  const response = await apiRequest<{ success: boolean; data: ApprovalTask[] }>(
    `${BASE}/approvals/tasks?${params.toString()}`
  );
  return response.data ?? [];
};

export const fetchTaskDetails = async (id: string): Promise<ApprovalTask | null> => {
  const response = await apiRequest<{ success: boolean; data: ApprovalTask }>(
    `${BASE}/approvals/tasks/${id}`
  );
  return response.data ?? null;
};

export const submitTaskDecision = async (
  id: string,
  payload: ApprovalDecisionPayload
): Promise<ApprovalTask> => {
  const response = await apiRequest<{ success: boolean; data: ApprovalTask }>(
    `${BASE}/approvals/tasks/${id}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return response.data;
};
