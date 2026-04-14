import { apiRequest } from '@/api/apiClient';

export type AppTarget = 'picker' | 'customer' | 'rider';
export type DocType = 'terms' | 'privacy';
export type ContentFormat = 'plain' | 'html' | 'markdown';

export interface LegalDocument {
  _id: string;
  type: DocType;
  appTarget: AppTarget;
  version: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  contentFormat: ContentFormat;
  content: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalConfig {
  loginLegal: {
    preamble: string;
    terms: { label: string; type: 'in_app' | 'url'; url: string | null };
    privacy: { label: string; type: 'in_app' | 'url'; url: string | null };
    connector: string;
  };
}

export interface CreateLegalDocBody {
  type: DocType;
  version: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  contentFormat: ContentFormat;
  content: string;
  isCurrent: boolean;
}

// Base paths per app target
const BASE: Record<AppTarget, string> = {
  picker:   '/picker/admin/legal',
  customer: '/customer/admin/legal',
  rider:    '/rider/admin/legal',
};

export async function listLegalDocs(
  app: AppTarget,
  type?: DocType
): Promise<LegalDocument[]> {
  const query = type ? `?type=${type}` : '';
  const res = await apiRequest<{ success: boolean; data: LegalDocument[] }>(
    `${BASE[app]}/documents${query}`
  );
  return res.data;
}

export async function createLegalDoc(
  app: AppTarget,
  body: CreateLegalDocBody
): Promise<LegalDocument> {
  const res = await apiRequest<{ success: boolean; data: LegalDocument }>(
    `${BASE[app]}/documents`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return res.data;
}

export async function updateLegalDoc(
  app: AppTarget,
  id: string,
  body: Partial<CreateLegalDocBody>
): Promise<LegalDocument> {
  const res = await apiRequest<{ success: boolean; data: LegalDocument }>(
    `${BASE[app]}/documents/${id}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  return res.data;
}

export async function deleteLegalDoc(
  app: AppTarget,
  id: string
): Promise<void> {
  await apiRequest(`${BASE[app]}/documents/${id}`, { method: 'DELETE' });
}

export async function setCurrentLegalDoc(
  app: AppTarget,
  id: string
): Promise<LegalDocument> {
  const res = await apiRequest<{ success: boolean; data: LegalDocument }>(
    `${BASE[app]}/documents/${id}/set-current`,
    { method: 'POST' }
  );
  return res.data;
}
