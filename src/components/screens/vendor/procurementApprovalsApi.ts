import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

export type ProcurementTaskType = "vendor_onboarding" | "purchase_order" | "contract_renewal" | "price_change" | "payment_release";
export type ProcurementTaskStatus = "pending" | "approved" | "rejected";
export type ProcurementTaskPriority = "high" | "normal" | "low";

export interface ProcurementApprovalTask {
  id: string;
  type: ProcurementTaskType;
  description: string;
  details?: string;
  requesterName: string;
  requesterRole: string;
  valueAmount?: number;
  currency?: string;
  createdAt: string;
  status: ProcurementTaskStatus;
  priority: ProcurementTaskPriority;
  relatedIds?: {
    vendorId?: string;
    poNumber?: string;
    contractId?: string;
  };
  rejectionReason?: string;
  decisionNote?: string;
  approvedAt?: string;
}

export interface ProcurementApprovalSummary {
  pendingRequestsCount: number;
  approvedTodayCount: number;
  rejectedTodayCount: number;
}

export interface ProcurementApprovalDecision {
  decision: "approve" | "reject";
  note?: string;
  reason?: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`,
  };
}

export const fetchProcurementSummary = async (): Promise<ProcurementApprovalSummary> => {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.approvals.summary}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to fetch approval summary' }));
    throw new Error(err.message || err.error || 'Failed to fetch approval summary');
  }

  const data = await response.json();
  return {
    pendingRequestsCount: data.pendingRequestsCount ?? 0,
    approvedTodayCount: data.approvedTodayCount ?? 0,
    rejectedTodayCount: data.rejectedTodayCount ?? 0,
  };
};

export const fetchProcurementTasks = async (
  status: ProcurementTaskStatus = 'pending',
  type?: string,
  minValue?: number
): Promise<ProcurementApprovalTask[]> => {
  const params = new URLSearchParams();
  params.set('status', status);
  if (type && type !== 'all') params.set('type', type);
  if (minValue != null && minValue > 0) params.set('minValue', String(minValue));

  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.approvals.tasks}?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to fetch approval tasks' }));
    throw new Error(err.message || err.error || 'Failed to fetch approval tasks');
  }

  const data = await response.json();
  const rawTasks = Array.isArray(data) ? data : (data.tasks ?? data.items ?? []);
  return rawTasks.map((t: Record<string, unknown>) => ({
    ...t,
    id: (t.id ?? t._id ?? '').toString(),
  })) as ProcurementApprovalTask[];
};

export const fetchTaskDetails = async (id: string): Promise<ProcurementApprovalTask | null> => {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.approvals.taskById(id)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to fetch task details' }));
    throw new Error(err.message || err.error || 'Failed to fetch task details');
  }

  const t = await response.json();
  return { ...t, id: (t.id ?? t._id ?? '').toString() } as ProcurementApprovalTask;
};

export const submitTaskDecision = async (
  id: string,
  payload: ProcurementApprovalDecision
): Promise<ProcurementApprovalTask> => {
  const body: Record<string, unknown> = { decision: payload.decision };
  if (payload.note) body.note = payload.note;
  if (payload.reason) body.reason = payload.reason;
  if (payload.decision === 'reject' && !payload.reason) {
    body.reason = 'other';
  }

  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.approvals.submitDecision(id)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to submit decision' }));
    throw new Error(err.message || err.error || 'Failed to submit decision');
  }

  return response.json();
};
