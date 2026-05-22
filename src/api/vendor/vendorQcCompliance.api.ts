import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

export type QCResult = 'Pass' | 'Fail' | 'Pending';
export type AuditType = 'Full Audit' | 'Follow-up' | 'Routine' | 'Complaint-based' | 'Certification';
export type CertificateStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Pending Renewal';
export type CheckType =
  | 'Visual'
  | 'Temperature'
  | 'Packaging'
  | 'Labeling'
  | 'Weight'
  | 'Chemical'
  | 'Microbiological';

export interface QCCheck {
  id: string;
  checkId: string;
  batchId: string;
  product: string;
  vendor: string;
  vendorId?: string;
  checkType: CheckType;
  result: QCResult;
  inspector?: string;
  date?: string;
  status?: 'Pending' | 'Approved' | 'Appealed' | 'Rejected';
  stage?: 'Review' | 'Reported' | 'Closed';
}

export interface Audit {
  id: string;
  auditId: string;
  vendor: string;
  vendorId?: string;
  date: string;
  auditType: AuditType;
  result: string;
  score: number;
}

export interface Certificate {
  id: string;
  certificateType: string;
  vendor: string;
  vendorId?: string;
  issuedDate: string;
  expiryDate: string;
  status: CertificateStatus;
  daysToExpiry: number;
  licenseNumber?: string;
}

export interface TemperatureCompliance {
  id: string;
  shipmentId: string;
  product: string;
  vendor: string;
  vendorId?: string;
  requirement: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  compliant: boolean;
}

export interface VendorRating {
  id: string;
  vendor: string;
  vendorId?: string;
  overallRating: number;
  qcPassRate: number;
  complianceScore: number;
  auditScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface QcOverview {
  batchesCheckedToday: number;
  passedToday: number;
  failedToday: number;
  pendingToday: number;
  passRateToday: number;
  last7Days: { total: number; passed: number; failed: number; passRate: number };
  failuresRequiringAction: number;
  criticalFailures: number;
  majorFailures: number;
}

export interface QcComplianceBundle {
  overview: QcOverview | null;
  checks: QCCheck[];
  audits: Audit[];
  certificates: Certificate[];
  temperatures: TemperatureCompliance[];
  ratings: VendorRating[];
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAuthToken() || ''}`,
  };
}

function extractData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as T[];
    if (Array.isArray(p.items)) return p.items as T[];
  }
  return [];
}

function mapQcStatus(status: unknown): QCCheck['status'] {
  const s = String(status ?? '').toLowerCase();
  if (['approved', 'passed', 'pass'].includes(s)) return 'Approved';
  if (['rejected', 'failed', 'fail'].includes(s)) return 'Rejected';
  if (s === 'appealed') return 'Appealed';
  return 'Pending';
}

function mapQcResult(item: Record<string, unknown>): QCResult {
  const r = String(item.result ?? '');
  if (r === 'Pass' || r === 'Fail' || r === 'Pending') return r;
  const s = String(item.status ?? '').toLowerCase();
  if (['approved', 'passed', 'pass'].includes(s)) return 'Pass';
  if (['rejected', 'failed', 'fail'].includes(s)) return 'Fail';
  return 'Pending';
}

export function mapQcCheckFromApi(item: Record<string, unknown>): QCCheck {
  return {
    id: String(item._id ?? item.id ?? ''),
    checkId: String(item.checkId ?? item.id ?? `QC-${String(item._id ?? '').slice(-6)}`),
    batchId: String(item.batchId ?? 'N/A'),
    product: String(item.product ?? item.productName ?? 'Unknown'),
    vendor: String(item.vendor ?? item.vendorName ?? item.vendorId ?? 'Unknown'),
    vendorId: item.vendorId != null ? String(item.vendorId) : undefined,
    checkType: (item.checkType as CheckType) || 'Visual',
    result: mapQcResult(item),
    inspector: String(item.inspector ?? item.inspectorName ?? item.inspectorId ?? 'N/A'),
    date: item.createdAt
      ? new Date(String(item.createdAt)).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : undefined,
    status: mapQcStatus(item.status),
    stage: (item.stage as QCCheck['stage']) || 'Review',
  };
}

function mapCertStatus(raw: unknown, daysToExpiry: number): CertificateStatus {
  const s = String(raw ?? 'valid').toLowerCase();
  if (s === 'expired') return 'Expired';
  if (s === 'pending_renewal') return 'Pending Renewal';
  if (s === 'expiring_soon' || (daysToExpiry > 0 && daysToExpiry <= 30)) return 'Expiring Soon';
  return 'Valid';
}

export function mapCertificateFromApi(c: Record<string, unknown>): Certificate {
  const daysToExpiry =
    typeof c.daysToExpiry === 'number'
      ? c.daysToExpiry
      : c.expiresAt
        ? Math.ceil((new Date(String(c.expiresAt)).getTime() - Date.now()) / 86400000)
        : 0;
  return {
    id: String(c._id ?? c.id ?? ''),
    certificateType: String(c.certificateType ?? c.type ?? 'Certificate'),
    vendor: String(c.vendor ?? c.vendorName ?? c.vendorId ?? 'Unknown'),
    vendorId: c.vendorId != null ? String(c.vendorId) : undefined,
    issuedDate: c.issuedAt
      ? new Date(String(c.issuedAt)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A',
    expiryDate: c.expiresAt
      ? new Date(String(c.expiresAt)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A',
    status: mapCertStatus(c.status, daysToExpiry),
    daysToExpiry,
    licenseNumber: c.licenseNumber != null ? String(c.licenseNumber) : undefined,
  };
}

export function mapAuditFromApi(a: Record<string, unknown>): Audit {
  const auditType = String(a.auditType ?? 'Routine');
  const allowed: AuditType[] = ['Full Audit', 'Follow-up', 'Routine', 'Complaint-based', 'Certification'];
  return {
    id: String(a._id ?? a.id ?? ''),
    auditId: String(a.auditId ?? a.id ?? ''),
    vendor: String(a.vendor ?? a.vendorName ?? a.vendorId ?? 'N/A'),
    vendorId: a.vendorId != null ? String(a.vendorId) : undefined,
    date: a.date != null ? String(a.date) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    auditType: (allowed.includes(auditType as AuditType) ? auditType : 'Routine') as AuditType,
    result: String(a.result ?? 'Pending'),
    score: Number(a.score ?? 0),
  };
}

export function mapTemperatureFromApi(t: Record<string, unknown>): TemperatureCompliance {
  return {
    id: String(t._id ?? t.id ?? ''),
    shipmentId: String(t.shipmentId ?? 'N/A'),
    product: String(t.product ?? t.productName ?? 'Unknown'),
    vendor: String(t.vendor ?? t.vendorName ?? t.vendorId ?? 'Unknown'),
    vendorId: t.vendorId != null ? String(t.vendorId) : undefined,
    requirement: String(t.requirement ?? 'N/A'),
    avgTemp: Number(t.avgTemp ?? 0),
    minTemp: Number(t.minTemp ?? 0),
    maxTemp: Number(t.maxTemp ?? 0),
    compliant: t.compliant !== false,
  };
}

export function mapRatingFromApi(r: Record<string, unknown>): VendorRating {
  return {
    id: String(r._id ?? r.id ?? r.vendorId ?? ''),
    vendor: String(r.vendor ?? r.vendorName ?? r.vendorId ?? 'Unknown'),
    vendorId: r.vendorId != null ? String(r.vendorId) : undefined,
    overallRating: Number(r.overallRating ?? 0),
    qcPassRate: Number(r.qcPassRate ?? 0),
    complianceScore: Number(r.complianceScore ?? 0),
    auditScore: Number(r.auditScore ?? 0),
    trend: (r.trend as VendorRating['trend']) || 'stable',
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = String(body?.message ?? body?.error ?? message);
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function loadQcComplianceDashboard(): Promise<QcComplianceBundle> {
  const base = API_CONFIG.baseURL;
  const [overviewResp, checksResp, auditsResp, certsResp, tempResp, ratingsResp] = await Promise.all([
    requestJson<{ data?: QcOverview }>(`${base}${API_ENDPOINTS.vendor.qc.overview}`).catch(() => ({ data: null })),
    requestJson<Record<string, unknown>>(`${base}${API_ENDPOINTS.vendor.qc.list}?page=1&perPage=50`),
    requestJson<Record<string, unknown>>(`${base}/vendor/qc-compliance/audits`),
    requestJson<Record<string, unknown>>(`${base}/vendor/qc-compliance/certificates`),
    requestJson<Record<string, unknown>>(`${base}/vendor/qc-compliance/temperature`),
    requestJson<Record<string, unknown>>(`${base}/vendor/qc-compliance/ratings`),
  ]);

  const overview =
    overviewResp && typeof overviewResp === 'object' && overviewResp.data
      ? overviewResp.data
      : null;

  return {
    overview,
    checks: extractData<Record<string, unknown>>(checksResp).map(mapQcCheckFromApi),
    audits: extractData<Record<string, unknown>>(auditsResp).map(mapAuditFromApi),
    certificates: extractData<Record<string, unknown>>(certsResp).map(mapCertificateFromApi),
    temperatures: extractData<Record<string, unknown>>(tempResp).map(mapTemperatureFromApi),
    ratings: extractData<Record<string, unknown>>(ratingsResp).map(mapRatingFromApi),
  };
}

export async function reloadQcChecks(): Promise<QCCheck[]> {
  const resp = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.qc.list}?page=1&perPage=50`
  );
  return extractData<Record<string, unknown>>(resp).map(mapQcCheckFromApi);
}

export type QcCrudTab = 'qc' | 'audits' | 'certs' | 'temp' | 'ratings';

async function mutateJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  return requestJson<T>(url, {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function createQCCheck(payload: Record<string, unknown>) {
  const data = await mutateJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.qc.create}`, 'POST', payload);
  return mapQcCheckFromApi(data as Record<string, unknown>);
}

export async function updateQCCheckApi(id: string, payload: Record<string, unknown>) {
  const data = await mutateJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.qc.update(id)}`, 'PATCH', payload);
  return mapQcCheckFromApi((data as { data?: unknown }).data ? (data as { data: Record<string, unknown> }).data : data);
}

export async function deleteQCCheck(id: string) {
  await mutateJson(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.qc.update(id)}`, 'DELETE');
}

export async function createAudit(payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(`${API_CONFIG.baseURL}/vendor/qc-compliance/audits`, 'POST', payload);
  return mapAuditFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function updateAudit(id: string, payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(`${API_CONFIG.baseURL}/vendor/qc-compliance/audits/${id}`, 'PATCH', payload);
  return mapAuditFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function deleteAudit(id: string) {
  await mutateJson(`${API_CONFIG.baseURL}/vendor/qc-compliance/audits/${id}`, 'DELETE');
}

export async function createCertificate(payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(
    `${API_CONFIG.baseURL}/vendor/qc-compliance/certificates`,
    'POST',
    payload
  );
  return mapCertificateFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function updateCertificateApi(id: string, payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(
    `${API_CONFIG.baseURL}/vendor/qc-compliance/certificates/${id}`,
    'PATCH',
    payload
  );
  return mapCertificateFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function deleteCertificateApi(id: string) {
  await mutateJson(`${API_CONFIG.baseURL}/vendor/qc-compliance/certificates/${id}`, 'DELETE');
}

export async function createTemperature(payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(`${API_CONFIG.baseURL}/vendor/qc-compliance/temperature`, 'POST', payload);
  return mapTemperatureFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function updateTemperature(id: string, payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(`${API_CONFIG.baseURL}/vendor/qc-compliance/temperature/${id}`, 'PATCH', payload);
  return mapTemperatureFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function deleteTemperature(id: string) {
  await mutateJson(`${API_CONFIG.baseURL}/vendor/qc-compliance/temperature/${id}`, 'DELETE');
}

export async function recalculateRating(vendorId: string) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(
    `${API_CONFIG.baseURL}/vendor/qc-compliance/ratings/${vendorId}/recalculate`,
    'POST',
    {}
  );
  return mapRatingFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function updateRating(vendorId: string, payload: Record<string, unknown>) {
  const resp = await mutateJson<{ data?: Record<string, unknown> }>(
    `${API_CONFIG.baseURL}/vendor/qc-compliance/ratings/${vendorId}`,
    'PATCH',
    payload
  );
  return mapRatingFromApi(resp.data || (resp as unknown as Record<string, unknown>));
}

export async function deleteRating(vendorId: string) {
  await mutateJson(`${API_CONFIG.baseURL}/vendor/qc-compliance/ratings/${vendorId}`, 'DELETE');
}

export function createLabelForTab(tab: QcCrudTab): string {
  switch (tab) {
    case 'qc':
      return 'QC Check';
    case 'audits':
      return 'Audit';
    case 'certs':
      return 'Certificate';
    case 'temp':
      return 'Temperature Record';
    case 'ratings':
      return 'Vendor Rating';
    default:
      return 'Record';
  }
}
