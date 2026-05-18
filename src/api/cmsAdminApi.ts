/**
 * CMS Admin API - Pages, Collections, Media
 * Routes under /api/v1/customer/admin/cms
 */
import { apiRequest } from './apiClient';

const PREFIX = '/customer/admin/cms';

/** Excel .xlsx filter for `<input type="file" />` — extension + OOXML MIME improves Safari/Chrome picker behavior vs `.xlsx` alone. */
export const XLSX_FILE_ACCEPT =
  '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface AdminCmsOverview {
  success: boolean;
  counts: { skus: number; pages: number; banners: number; collections: number };
  issues?: Record<string, number>;
}

export interface AdminCmsUploadResult {
  success: boolean;
  counts: Record<string, any>;
  warnings?: Array<{ sheet?: string; row?: number; message: string }>;
  errors: Array<{ sheet?: string; row?: number; message: string }>;
}

export interface ContentHubImportRun {
  _id: string;
  source?: string;
  uploadedBy?: string | null;
  file?: { originalName?: string; mimeType?: string; sizeBytes?: number };
  overwrite?: boolean;
  success?: boolean;
  durationMs?: number;
  counts?: Record<string, any>;
  warnings?: Array<{ sheet?: string; row?: number; message: string }>;
  errors?: Array<{ sheet?: string; row?: number; message: string }>;
  createdAt?: string;
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

export interface Banner {
  _id: string;
  bannerId?: string;
  name: string;
  imageUrl?: string;
  bannerType?: string;
  sectionCode?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeSection {
  _id: string;
  sectionKey: string;
  sectionType?: string;
  label?: string;
  bannerIds?: string[];
  categoryIds?: string[];
  videoUrl?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Button {
  _id: string;
  buttonId?: string;
  name: string;
  label?: string;
  type?: 'nav' | 'action' | 'link' | 'section' | 'other';
  action?: string;
  icon?: string;
  imageUrl?: string;
  sectionCode?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
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

export async function uploadContentHubMaster(file: File, overwrite = true): Promise<AdminCmsUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('overwrite', String(overwrite));
  return apiRequest<AdminCmsUploadResult>(`${PREFIX}/upload/content-hub-master`, {
    method: 'POST',
    body: formData,
  });
}

export async function fetchContentHubImportHistory(limit = 20): Promise<ContentHubImportRun[]> {
  const res = await apiRequest<{ success: boolean; data: ContentHubImportRun[] }>(
    `${PREFIX}/import-history/content-hub?limit=${encodeURIComponent(String(limit))}`
  );
  return Array.isArray(res?.data) ? res.data : [];
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

// --- Banners CRUD ---

export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiRequest<Banner[]>(`${PREFIX}/banners`);
  return Array.isArray(res) ? res : [];
}

export async function createBanner(body: Partial<Banner>): Promise<Banner> {
  return apiRequest<Banner>(`${PREFIX}/banners`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateBanner(id: string, body: Partial<Banner>): Promise<Banner> {
  return apiRequest<Banner>(`${PREFIX}/banners/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteBanner(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/banners/${id}`, { method: 'DELETE' });
}

// --- Home Sections CRUD ---

export async function fetchHomeSections(): Promise<HomeSection[]> {
  const res = await apiRequest<HomeSection[]>(`${PREFIX}/home-sections`);
  return Array.isArray(res) ? res : [];
}

export async function createHomeSection(body: Partial<HomeSection>): Promise<HomeSection> {
  return apiRequest<HomeSection>(`${PREFIX}/home-sections`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateHomeSection(id: string, body: Partial<HomeSection>): Promise<HomeSection> {
  return apiRequest<HomeSection>(`${PREFIX}/home-sections/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteHomeSection(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/home-sections/${id}`, { method: 'DELETE' });
}

// --- Buttons CRUD ---

export async function fetchButtons(): Promise<Button[]> {
  const res = await apiRequest<Button[]>(`${PREFIX}/buttons`);
  return Array.isArray(res) ? res : [];
}

export async function createButton(body: Partial<Button>): Promise<Button> {
  return apiRequest<Button>(`${PREFIX}/buttons`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateButton(id: string, body: Partial<Button>): Promise<Button> {
  return apiRequest<Button>(`${PREFIX}/buttons/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteButton(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/buttons/${id}`, { method: 'DELETE' });
}
