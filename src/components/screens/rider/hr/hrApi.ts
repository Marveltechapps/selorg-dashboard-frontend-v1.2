import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { ApprovalHistoryEntry, DocumentStatus, DocumentType, HrDashboardSummary, Rider, RiderDocument } from "./types";
import { logger } from '../../../../utils/logger';

/**
 * API Response Types (from backend)
 */
interface ApiRider {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "onboarding" | "active" | "suspended";
  onboardingStatus: "invited" | "docs_pending" | "under_review" | "approved";
  trainingStatus: "not_started" | "in_progress" | "completed";
  appAccess: "enabled" | "disabled";
  deviceAssigned: boolean;
  deviceId?: string | null;
  deviceType?: string | null;
  createdAt?: string | null; // Added for days active calculation
  contract: {
    startDate: string;
    endDate: string;
    renewalDue: boolean;
    status?: 'active' | 'expired' | 'pending_renewal' | 'terminated';
  };
  compliance: {
    isCompliant: boolean;
    lastAuditDate: string;
    policyViolationsCount: number;
    lastViolationReason?: string | null;
  };
  suspension?: {
    isSuspended: boolean;
    reason?: string | null;
    since?: string | null;
  };
}

interface ApiDocument {
  id: string;
  riderId: string;
  riderName: string;
  documentType: DocumentType;
  submittedAt: string;
  expiresAt?: string | null;
  status: DocumentStatus;
  rejectionReason?: string | null;
  reviewer?: string | null;
  reviewedAt?: string | null;
  fileUrl: string;
}

interface ApiListResponse<T> {
  data?: T[];
  riders?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/**
 * Helper function to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  logger.apiRequest('HRAPI', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    logger.apiResponse('HRAPI', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[HR API] Error response:`, errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || 'Request failed' };
      }
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.apiSuccess('HRAPI', data);
    return data;
  } catch (error) {
    logger.apiError('HRAPI', url, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running on port 3001.`);
    }
    throw error;
  }
}

/**
 * Transform backend rider to frontend rider
 */
function transformRider(apiRider: ApiRider): Rider {
  return {
    id: apiRider.id,
    name: apiRider.name,
    phone: apiRider.phone,
    email: apiRider.email,
    status: apiRider.status,
    onboardingStatus: apiRider.onboardingStatus,
    trainingStatus: apiRider.trainingStatus,
    appAccess: apiRider.appAccess,
    deviceAssigned: apiRider.deviceAssigned,
    createdAt: apiRider.createdAt || undefined, // Backend returns ISO string format
    contract: {
      startDate: apiRider.contract.startDate, // Backend returns YYYY-MM-DD format
      endDate: apiRider.contract.endDate, // Backend returns YYYY-MM-DD format
      renewalDue: apiRider.contract.renewalDue,
      status: apiRider.contract.status || (apiRider.contract.renewalDue ? 'pending_renewal' : 'active'),
    },
    compliance: {
      isCompliant: apiRider.compliance.isCompliant,
      lastAuditDate: apiRider.compliance.lastAuditDate, // Backend returns YYYY-MM-DD format
      policyViolationsCount: apiRider.compliance.policyViolationsCount,
      lastViolationReason: apiRider.compliance.lastViolationReason || undefined,
    },
    suspension: apiRider.suspension ? {
      isSuspended: apiRider.suspension.isSuspended,
      reason: apiRider.suspension.reason || undefined,
      since: apiRider.suspension.since ? (
        typeof apiRider.suspension.since === 'string' 
          ? apiRider.suspension.since 
          : new Date(apiRider.suspension.since).toISOString()
      ) : undefined,
    } : undefined,
  };
}

/**
 * Transform backend document to frontend document
 */
function transformDocument(apiDoc: ApiDocument): RiderDocument {
  return {
    id: apiDoc.id,
    riderId: apiDoc.riderId,
    riderName: apiDoc.riderName,
    documentType: apiDoc.documentType,
    submittedAt: typeof apiDoc.submittedAt === 'string' 
      ? apiDoc.submittedAt 
      : new Date(apiDoc.submittedAt).toISOString(),
    expiresAt: apiDoc.expiresAt ? (
      typeof apiDoc.expiresAt === 'string' 
        ? apiDoc.expiresAt 
        : new Date(apiDoc.expiresAt).toISOString()
    ) : undefined,
    status: apiDoc.status,
    rejectionReason: apiDoc.rejectionReason || undefined,
    reviewer: apiDoc.reviewer || undefined,
    reviewedAt: apiDoc.reviewedAt ? (
      typeof apiDoc.reviewedAt === 'string' 
        ? apiDoc.reviewedAt 
        : new Date(apiDoc.reviewedAt).toISOString()
    ) : undefined,
    fileUrl: apiDoc.fileUrl,
  };
}

/**
 * Real API implementation with mock fallbacks
 */
export async function fetchHrSummary(): Promise<HrDashboardSummary> {
  const data = await apiRequest<HrDashboardSummary>(API_ENDPOINTS.hr.summary);
  return {
    pendingVerifications: data?.pendingVerifications ?? 0,
    expiredDocuments: data?.expiredDocuments ?? 0,
    activeCompliantRiders: data?.activeCompliantRiders ?? 0,
  };
}

export async function fetchDocuments(params: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: RiderDocument[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.type) queryParams.append('documentType', params.type);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `${API_ENDPOINTS.hr.documents}?${queryString}` : API_ENDPOINTS.hr.documents;
  const response = await apiRequest<ApiListResponse<ApiDocument>>(endpoint);
  const documents = response?.data ?? [];
  return { data: documents.map(transformDocument), total: response?.total ?? documents.length };
}

export async function fetchRiderDetails(riderId: string): Promise<Rider | null> {
  try {
    const data = await apiRequest<ApiRider>(API_ENDPOINTS.hr.rider(riderId));
    return transformRider(data);
  } catch (error) {
    console.error(`[HR API] Error fetching rider ${riderId}:`, error);
    return null;
  }
}

export async function fetchDocumentDetails(documentId: string): Promise<RiderDocument | null> {
  try {
    const data = await apiRequest<ApiDocument>(API_ENDPOINTS.hr.document(documentId));
    return transformDocument(data);
  } catch (error) {
    console.error(`[HR API] Error fetching document ${documentId}:`, error);
    return null;
  }
}

export async function approveDocument(docId: string, notes?: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.hr.document(docId), { method: 'PUT', body: JSON.stringify({ action: 'approve', notes: notes || null }) });
}

export async function rejectDocument(docId: string, reason: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.hr.document(docId), { method: 'PUT', body: JSON.stringify({ action: 'reject', rejectionReason: reason }) });
}

export async function markDocumentResubmitted(docId: string): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.hr.document(docId),
    {
      method: 'PUT',
      body: JSON.stringify({
        action: 'request_resubmission',
        rejectionReason: 'Please resubmit with updated information',
      }),
    }
  );
}

export async function onboardRider(data: Partial<Rider> & { name?: string; email?: string; phone?: string }): Promise<Rider> {
  const response = await apiRequest<ApiRider>(API_ENDPOINTS.hr.riders, { method: 'POST', body: JSON.stringify(data) });
  return transformRider(response);
}

export async function fetchAllRiders(): Promise<Rider[]> {
  const response = await apiRequest<ApiListResponse<ApiRider>>(`${API_ENDPOINTS.hr.riders}?limit=100`);
  const riders = response?.riders ?? response?.data ?? [];
  return riders.map(transformRider);
}

export async function updateRiderAccess(riderId: string, access: "enabled" | "disabled"): Promise<void> {
  await apiRequest(API_ENDPOINTS.hr.access(riderId), { method: 'PUT', body: JSON.stringify({ appAccess: access }) });
}

export async function updateRiderTraining(riderId: string): Promise<void> {
  await apiRequest(`${API_ENDPOINTS.hr.training}/${riderId}`, { method: 'PUT', body: JSON.stringify({ notes: 'Training completed' }) });
}

export async function sendReminderToRider(riderId: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest<{ success: boolean; message: string; riderName: string }>(API_ENDPOINTS.hr.remindRider(riderId), { method: 'POST' });
}

export async function renewContract(riderId: string): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.hr.renewContract(riderId),
    {
      method: 'POST',
    }
  );
}

export async function updateContract(riderId: string, contractData: {
  startDate?: string;
  endDate?: string;
  renewalDue?: boolean;
}): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.hr.contract(riderId),
    {
      method: 'PUT',
      body: JSON.stringify(contractData),
    }
  );
}

export async function terminateContract(riderId: string, reason?: string): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.hr.terminateContract(riderId),
    {
      method: 'POST',
      body: JSON.stringify({
        reason: reason || 'Contract terminated by admin',
      }),
    }
  );
}
