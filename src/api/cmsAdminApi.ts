/**
 * CMS Admin API - Pages, Collections, Media
 * Routes under /api/v1/customer/admin/cms
 */
import { apiRequest } from './apiClient';

const PREFIX = '/customer/admin/cms';

export interface AdminCmsOverview {
  success: boolean;
  counts: { skus: number; pages: number; banners: number; collections: number };
  issues?: Record<string, number>;
}

export interface AdminCmsUploadResult {
  success: boolean;
  counts: Record<string, number>;
  errors: Array<{ sheet?: string; row?: number; message: string }>;
}

export interface Page {
  _id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  blocks: unknown[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  type: 'manual' | 'rule-based';
  productIds?: string[];
  rules?: Record<string, unknown>;
  sortBy?: string;
  isActive?: boolean;
}

export interface Media {
  _id: string;
  url: string;
  type: 'image' | 'video';
  altText?: string;
}

export async function fetchCmsOverview(): Promise<AdminCmsOverview> {
  return apiRequest<AdminCmsOverview>(`${PREFIX}/overview`);
}

export async function uploadSkuMaster(file: File, overwrite: boolean): Promise<AdminCmsUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('overwrite', String(overwrite));
  return apiRequest<AdminCmsUploadResult>(`${PREFIX}/upload/sku-master`, {
    method: 'POST',
    body: formData,
  });
}

export async function uploadCmsPages(file: File): Promise<AdminCmsUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<AdminCmsUploadResult>(`${PREFIX}/upload/cms-pages`, {
    method: 'POST',
    body: formData,
  });
}

export async function fetchPages(): Promise<Page[]> {
  const res = await apiRequest<Page[]>(`${PREFIX}/pages`);
  return Array.isArray(res) ? res : [];
}

export async function getPage(id: string): Promise<Page | null> {
  return apiRequest<Page>(`${PREFIX}/pages/${id}`);
}

export async function createPage(body: { slug: string; title?: string; status?: string; blocks?: unknown[] }): Promise<Page> {
  return apiRequest<Page>(`${PREFIX}/pages`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updatePage(id: string, body: Partial<Page>): Promise<Page> {
  return apiRequest<Page>(`${PREFIX}/pages/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deletePage(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/pages/${id}`, { method: 'DELETE' });
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await apiRequest<Collection[]>(`${PREFIX}/collections`);
  return Array.isArray(res) ? res : [];
}

export async function createCollection(body: Partial<Collection>): Promise<Collection> {
  return apiRequest<Collection>(`${PREFIX}/collections`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateCollection(id: string, body: Partial<Collection>): Promise<Collection> {
  return apiRequest<Collection>(`${PREFIX}/collections/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteCollection(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/collections/${id}`, { method: 'DELETE' });
}

export async function fetchMedia(): Promise<Media[]> {
  const res = await apiRequest<Media[]>(`${PREFIX}/media`);
  return Array.isArray(res) ? res : [];
}

export async function createMedia(body: { url: string; type?: string; altText?: string }): Promise<Media> {
  return apiRequest<Media>(`${PREFIX}/media`, { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteMedia(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/media/${id}`, { method: 'DELETE' });
}
