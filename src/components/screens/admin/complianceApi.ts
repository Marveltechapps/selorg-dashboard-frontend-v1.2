import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface ComplianceDocument {
  id: string;
  name: string;
  type: 'certificate' | 'policy' | 'license' | 'audit' | 'report' | 'agreement';
  category: 'data-protection' | 'financial' | 'operational' | 'legal' | 'security' | 'tax';
  status: 'valid' | 'expiring-soon' | 'expired' | 'pending-renewal' | 'under-review';
  uploadedAt: string;
  expiresAt: string | null;
  fileSize: string;
  version: string;
  uploadedBy: string;
  description: string;
  tags: string[];
  acknowledged: boolean;
  acknowledgedBy?: string[];
  lastUpdated?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  certNumber: string;
  type: 'ISO' | 'PCI-DSS' | 'SOC2' | 'GDPR' | 'HIPAA' | 'Other';
  status: 'active' | 'expiring-soon' | 'expired' | 'pending';
  issuedDate: string;
  expiryDate: string;
  scope: string;
  auditedBy: string;
  nextAudit: string;
  score?: number;
  attachments: number;
}

export interface AuditRecord {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'regulatory' | 'third-party';
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed';
  scheduledDate: string;
  completedDate?: string;
  auditor: string;
  auditorOrg: string;
  scope: string[];
  findings: AuditFinding[];
  overallScore?: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
}

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'accepted-risk';
  assignedTo: string;
  dueDate: string;
}

export interface Policy {
  id: string;
  name: string;
  category: 'privacy' | 'security' | 'hr' | 'operational' | 'financial' | 'legal';
  version: string;
  status: 'active' | 'draft' | 'under-review' | 'archived';
  effectiveDate: string;
  reviewDate: string;
  owner: string;
  approvedBy: string;
  description: string;
  requiresAcknowledgment: boolean;
  acknowledgmentRate: number;
  totalEmployees: number;
  acknowledgedEmployees: number;
}

export interface ComplianceMetrics {
  overallScore: number;
  totalDocuments: number;
  validDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  activeCertifications: number;
  completedAudits: number;
  openFindings: number;
  criticalFindings: number;
  policyCompliance: number;
}

export interface ViolationAlert {
  id: string;
  type: 'expiry' | 'audit-failure' | 'policy-violation' | 'data-breach' | 'regulatory';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedArea: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  assignedTo: string;
}

// --- API Functions ---
// All data from real backend. No mock fallbacks. Empty arrays/zero metrics on empty DB.

export async function fetchDocuments(): Promise<ComplianceDocument[]> {
  const response = await apiRequest<{ success: boolean; data: ComplianceDocument[] }>('/admin/compliance/documents');
  return response.data ?? [];
}

export async function fetchCertifications(): Promise<Certification[]> {
  const response = await apiRequest<{ success: boolean; data: Certification[] }>('/admin/compliance/certifications');
  return response.data ?? [];
}

export async function fetchAudits(): Promise<AuditRecord[]> {
  const response = await apiRequest<{ success: boolean; data: AuditRecord[] }>('/admin/compliance/audits');
  return response.data ?? [];
}

export async function fetchPolicies(): Promise<Policy[]> {
  const response = await apiRequest<{ success: boolean; data: Policy[] }>('/admin/compliance/policies');
  return response.data ?? [];
}

export async function fetchMetrics(): Promise<ComplianceMetrics> {
  const response = await apiRequest<{ success: boolean; data: ComplianceMetrics }>('/admin/compliance/metrics');
  return response.data ?? {
    overallScore: 0,
    totalDocuments: 0,
    validDocuments: 0,
    expiringDocuments: 0,
    expiredDocuments: 0,
    activeCertifications: 0,
    completedAudits: 0,
    openFindings: 0,
    criticalFindings: 0,
    policyCompliance: 0,
  };
}

export async function fetchViolations(): Promise<ViolationAlert[]> {
  const response = await apiRequest<{ success: boolean; data: ViolationAlert[] }>('/admin/compliance/violations');
  return response.data ?? [];
}

export async function uploadDocument(doc: Partial<ComplianceDocument> & { file?: File }): Promise<ComplianceDocument> {
  const formData = new FormData();
  if (doc.file) {
    formData.append('file', doc.file);
  }
  formData.append('name', doc.name || '');
  formData.append('type', doc.type || 'policy');
  formData.append('category', doc.category || 'legal');
  formData.append('description', doc.description || '');

  const response = await apiRequest<{ success: boolean; data: ComplianceDocument }>('/admin/compliance/documents', {
    method: 'POST',
    body: formData,
  });
  return response.data;
}

export async function scheduleAudit(audit: Partial<AuditRecord>): Promise<AuditRecord> {
  const response = await apiRequest<{ success: boolean; data: AuditRecord }>('/admin/compliance/audits', {
    method: 'POST',
    body: JSON.stringify(audit),
  });
  return response.data;
}

export async function updateFindingStatus(auditId: string, findingId: string, status: string): Promise<void> {
  await apiRequest(`/admin/compliance/audits/${auditId}/findings/${findingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function acknowledgePolicy(policyId: string): Promise<void> {
  await apiRequest(`/admin/compliance/policies/${policyId}/acknowledge`, {
    method: 'POST',
  });
}

export async function generateComplianceReport(): Promise<{ url: string }> {
  const response = await apiRequest<{ success: boolean; data: Record<string, unknown> }>('/admin/compliance/reports/generate', {
    method: 'POST',
  });
  const reportData = response.data ?? {};
  const json = JSON.stringify(reportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { url };
}
