import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../utils/apiRequest';

export type ApprovalType = 'order_exception' | 'vehicle_request' | 'document_approval' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalSummary {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  date: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  reason?: string;
  requestedBy: string;
  requestedById: string;
  requesterRole?: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  metadata?: {
    orderId?: string;
    vehicleId?: string;
    [key: string]: any;
  };
}

/**
 * Backend API response types
 */
interface ApiApprovalResponse {
  approvals: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Transform backend data
 */
function transformTimestamp(timestamp: string | Date): string {
  return typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString();
}

function transformApproval(apiApproval: any): ApprovalRequest {
  return {
    id: apiApproval.id,
    type: apiApproval.type as ApprovalType,
    title: apiApproval.title,
    description: apiApproval.description,
    reason: apiApproval.reason,
    requestedBy: apiApproval.requestedBy,
    requestedById: apiApproval.requestedById,
    requesterRole: apiApproval.requesterRole,
    status: apiApproval.status as ApprovalStatus,
    createdAt: transformTimestamp(apiApproval.createdAt),
    updatedAt: apiApproval.updatedAt ? transformTimestamp(apiApproval.updatedAt) : undefined,
    approvedBy: apiApproval.approvedBy,
    approvedById: apiApproval.approvedById,
    approvedAt: apiApproval.approvedAt ? transformTimestamp(apiApproval.approvedAt) : undefined,
    rejectionReason: apiApproval.rejectionReason,
    metadata: apiApproval.metadata || {},
  };
}

/**
 * Get approval summary
 */
export async function getApprovalSummary(date?: string): Promise<ApprovalSummary> {
  const queryParams = new URLSearchParams();
  if (date) queryParams.append('date', date);
  const endpoint = queryParams.toString()
    ? `${API_ENDPOINTS.approvals.summary}?${queryParams.toString()}`
    : API_ENDPOINTS.approvals.summary;
  const result = await apiRequest<ApprovalSummary>(endpoint, {}, 'Approvals API');
  return {
    ...result,
    date: transformTimestamp(result.date || new Date().toISOString()).split('T')[0],
  };
}

/**
 * List approval queue
 */
export async function listApprovals(filters?: {
  status?: ApprovalStatus;
  type?: ApprovalType;
  requestedBy?: string;
  page?: number;
  limit?: number;
}): Promise<ApprovalRequest[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status !== undefined && filters?.status !== '') {
    queryParams.append('status', String(filters.status));
  }
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.requestedBy) queryParams.append('requestedBy', filters.requestedBy);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `${API_ENDPOINTS.approvals.queue}?${queryString}` : API_ENDPOINTS.approvals.queue;

  const response = await apiRequest<ApiApprovalResponse>(endpoint, {}, 'Approvals API');

  let list: any[] = [];
  if (Array.isArray(response)) {
    list = response;
  } else if (response?.approvals && Array.isArray(response.approvals)) {
    list = response.approvals;
  } else if (response?.data && Array.isArray(response.data)) {
    list = response.data;
  }

  return list.map(transformApproval);
}

/**
 * Create approval request
 */
export async function createApprovalRequest(data: {
  type: ApprovalType;
  title: string;
  description: string;
  reason: string;
  metadata?: any;
}): Promise<ApprovalRequest> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.approvals.queue,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    'Approvals API'
  );
  return transformApproval(result);
}

/**
 * Get approval by ID
 */
export async function getApprovalById(id: string): Promise<ApprovalRequest> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.approvals.queueItem(id),
    {},
    'Approvals API'
  );
  return transformApproval(result);
}

/**
 * Approve request
 */
export async function approveRequest(id: string, notes?: string): Promise<ApprovalRequest> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.approvals.approve(id),
    { method: 'POST', body: JSON.stringify({ notes: notes || '' }) },
    'Approvals API'
  );
  return transformApproval(result);
}

/**
 * Reject request
 */
export async function rejectRequest(id: string, reason: string, notes?: string): Promise<ApprovalRequest> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.approvals.reject(id),
    { method: 'POST', body: JSON.stringify({ reason, notes: notes || '' }) },
    'Approvals API'
  );
  return transformApproval(result);
}

/**
 * Batch approve requests
 */
export async function batchApprove(approvalIds: string[], notes?: string): Promise<{
  approved: number;
  failed: number;
  results: Array<{ approvalId: string; status: 'approved' | 'failed'; error?: string }>;
}> {
  return apiRequest<{
    approved: number;
    failed: number;
    results: Array<{ approvalId: string; status: 'approved' | 'failed'; error?: string }>;
  }>(
    API_ENDPOINTS.approvals.batchApprove,
    { method: 'POST', body: JSON.stringify({ approvalIds, notes: notes || '' }) },
    'Approvals API'
  );
}
