import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { ApprovalHistoryEntry, DocumentStatus, DocumentType, HrDashboardSummary, Rider, RiderDocument } from "./types";
import { logger } from '../../../../utils/logger';
import { getAuthToken } from '../../../../contexts/AuthContext';

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
  trainingProgress?: {
    modulesCompleted: number;
    totalModules: number;
    progressPercentage: number;
  };
  appAccess: "enabled" | "disabled";
  deviceAssigned: boolean;
  deviceId?: string | null;
  deviceType?: string | null;
  hubName?: string | null;
  createdAt?: string | null; // Added for days active calculation
  /** Server-computed; days since createdAt while status is onboarding */
  onboardingDaysActive?: number | null;
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
  documents?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** Unwrap `{ success, data }` envelopes from apiEnvelopeMiddleware. */
function unwrapEnvelope<T>(json: unknown): T {
  if (!json || typeof json !== 'object') return json as T;
  const o = json as Record<string, unknown>;
  if (o.success === true && o.data !== undefined && o.data !== null) {
    return o.data as T;
  }
  return json as T;
}

function extractDocumentList(response: unknown): ApiDocument[] {
  const payload = unwrapEnvelope<ApiListResponse<ApiDocument> | ApiDocument[]>(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.documents)) return payload.documents;
  return [];
}

function extractRiderList(response: unknown): ApiRider[] {
  const payload = unwrapEnvelope<ApiListResponse<ApiRider> | ApiRider[]>(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.riders)) return payload.riders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function listMeta(response: unknown, listLength: number): { total: number } {
  const outer = response as Record<string, unknown> | null;
  const payload = unwrapEnvelope<ApiListResponse<unknown>>(response);
  const pagination = outer?.pagination as { total?: number } | null | undefined;
  const total =
    (typeof payload?.total === 'number' ? payload.total : undefined) ??
    (typeof pagination?.total === 'number' ? pagination.total : undefined) ??
    listLength;
  return { total };
}

/**
 * Helper function to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const token = getAuthToken();
  
  logger.apiRequest('HRAPI', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
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
      const message =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error?.error === 'string' && error.error) ||
        (typeof error?.error?.message === 'string' && error.error.message) ||
        `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    logger.apiSuccess('HRAPI', data);
    return data;
  } catch (error) {
    logger.apiError('HRAPI', url, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running.`);
    }
    throw error;
  }
}

/**
 * Helper to safely convert a value to an ISO date string
 */
function safeDateIso(value: any, fallback?: string): string | undefined {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return fallback;
    return date.toISOString();
  } catch {
    return fallback;
  }
}

/**
 * Transform backend rider to frontend rider
 */
function fallbackOnboardingDaysFromCreated(
  createdAt: string | null | undefined,
  status: ApiRider["status"]
): number | undefined {
  if (status !== "onboarding" || !createdAt) return undefined;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return undefined;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function transformRider(apiRider: ApiRider): Rider {
  const today = new Date().toISOString().split('T')[0];
  const contract = apiRider.contract ?? {
    startDate: today,
    endDate: today,
    renewalDue: false,
  };
  const compliance = apiRider.compliance ?? {
    isCompliant: true,
    lastAuditDate: today,
    policyViolationsCount: 0,
  };
  const onboardingDaysActive =
    typeof apiRider.onboardingDaysActive === "number"
      ? apiRider.onboardingDaysActive
      : fallbackOnboardingDaysFromCreated(apiRider.createdAt, apiRider.status);
  return {
    id: apiRider.id,
    name: apiRider.name,
    phone: apiRider.phone,
    email: apiRider.email,
    hubName: apiRider.hubName || undefined,
    status: apiRider.status,
    onboardingStatus: apiRider.onboardingStatus,
    trainingStatus: apiRider.trainingStatus,
    trainingProgress: apiRider.trainingProgress,
    appAccess: apiRider.appAccess,
    deviceAssigned: apiRider.deviceAssigned,
    onboardingDaysActive,
    createdAt: apiRider.createdAt || undefined, // Backend returns ISO string format
    contract: {
      startDate: contract.startDate,
      endDate: contract.endDate,
      renewalDue: contract.renewalDue ?? false,
      status: contract.status || (contract.renewalDue ? 'pending_renewal' : 'active'),
    },
    compliance: {
      isCompliant: compliance.isCompliant,
      lastAuditDate: compliance.lastAuditDate,
      policyViolationsCount: compliance.policyViolationsCount ?? 0,
      lastViolationReason: compliance.lastViolationReason || undefined,
    },
    suspension: apiRider.suspension ? {
      isSuspended: apiRider.suspension.isSuspended,
      reason: apiRider.suspension.reason || undefined,
      since: safeDateIso(apiRider.suspension.since),
    } : undefined,
  };
}

/**
 * Transform backend document to frontend document
 */
function transformDocument(apiDoc: ApiDocument): RiderDocument {
  const defaultIso = new Date().toISOString();
  return {
    id: apiDoc.id,
    riderId: apiDoc.riderId,
    riderName: apiDoc.riderName,
    documentType: apiDoc.documentType,
    submittedAt: safeDateIso(apiDoc.submittedAt, defaultIso) as string,
    expiresAt: safeDateIso(apiDoc.expiresAt),
    status: apiDoc.status,
    rejectionReason: apiDoc.rejectionReason || undefined,
    reviewer: apiDoc.reviewer || undefined,
    reviewedAt: safeDateIso(apiDoc.reviewedAt),
    fileUrl: apiDoc.fileUrl,
  };
}

/**
 * Real API implementation with mock fallbacks
 */
export async function fetchHrSummary(): Promise<HrDashboardSummary> {
  const raw = await apiRequest<HrDashboardSummary>(API_ENDPOINTS.hr.summary);
  const data = unwrapEnvelope<HrDashboardSummary>(raw);
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
  const documents = extractDocumentList(response);
  const { total } = listMeta(response, documents.length);
  return { data: documents.map(transformDocument), total };
}

export async function fetchRiderDetails(riderId: string): Promise<Rider | null> {
  try {
    const raw = await apiRequest<ApiRider>(API_ENDPOINTS.hr.rider(riderId));
    return transformRider(unwrapEnvelope<ApiRider>(raw));
  } catch (error) {
    console.error(`[HR API] Error fetching rider ${riderId}:`, error);
    return null;
  }
}

export async function fetchDocumentDetails(documentId: string): Promise<RiderDocument | null> {
  try {
    const raw = await apiRequest<ApiDocument>(API_ENDPOINTS.hr.document(documentId));
    return transformDocument(unwrapEnvelope<ApiDocument>(raw));
  } catch (error) {
    console.error(`[HR API] Error fetching document ${documentId}:`, error);
    return null;
  }
}

export async function fetchDocumentDownloadUrl(documentId: string): Promise<string> {
  const raw = await apiRequest<{ fileUrl?: string }>(API_ENDPOINTS.hr.documentDownload(documentId));
  const data = unwrapEnvelope<{ fileUrl?: string }>(raw);
  if (!data?.fileUrl) {
    throw new Error('Document file is unavailable for download');
  }
  return data.fileUrl;
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
  const raw = await apiRequest<ApiRider>(API_ENDPOINTS.hr.riders, { method: 'POST', body: JSON.stringify(data) });
  return transformRider(unwrapEnvelope<ApiRider>(raw));
}

export async function fetchAllRiders(): Promise<Rider[]> {
  const response = await apiRequest<ApiListResponse<ApiRider>>(`${API_ENDPOINTS.hr.riders}?limit=100`);
  return extractRiderList(response).map(transformRider);
}

export async function updateRiderAccess(riderId: string, access: "enabled" | "disabled"): Promise<void> {
  await apiRequest(API_ENDPOINTS.hr.access(riderId), { method: 'PUT', body: JSON.stringify({ appAccess: access }) });
}

export async function updateRiderTraining(riderId: string): Promise<void> {
  await apiRequest(`${API_ENDPOINTS.hr.training}/${riderId}`, { method: 'PUT', body: JSON.stringify({ notes: 'Training completed' }) });
}

export async function sendReminderToRider(riderId: string): Promise<{ success: boolean; message: string }> {
  const raw = await apiRequest<{ success: boolean; message: string; riderName: string }>(
    API_ENDPOINTS.hr.remindRider(riderId),
    { method: 'POST' }
  );
  return unwrapEnvelope<{ success: boolean; message: string; riderName: string }>(raw);
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
