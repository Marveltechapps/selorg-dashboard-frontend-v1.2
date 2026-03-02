/**
 * Merch Catalog API
 * Uses real backend APIs only.
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch/catalog';

export interface SKU {
  id: string;
  sku: string;
  code?: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  stock?: number;
  visibility?: Record<string, string>;
  tags?: string[];
  imageUrl?: string;
  status?: 'active' | 'inactive';
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  skus: string[];
  status: 'active' | 'inactive' | string;
  type?: string;
  tags?: string[];
  imageUrl?: string;
  region?: string;
  owner?: string;
  updatedAt?: string;
}

function mapApiSkuToFrontend(api: any): SKU {
  return {
    id: String(api._id ?? api.id ?? ''),
    sku: api.code ?? api.sku ?? String(api._id ?? api.id ?? ''),
    code: api.code ?? api.sku,
    name: api.name ?? '',
    category: api.category ?? 'Uncategorized',
    brand: api.brand ?? 'Generic',
    price: Number(api.sellingPrice ?? api.basePrice ?? api.price ?? 0),
    stock: Number(api.stock ?? 0),
    visibility: api.visibility ?? { 'North America': 'Hidden', 'Europe (West)': 'Hidden', 'APAC': 'Hidden' },
    tags: api.tags ?? [],
    imageUrl: api.imageUrl,
    status: api.status ?? 'active',
  };
}

function mapApiCollectionToFrontend(api: any): Collection {
  const skuIds = (api.skus ?? []).map((s: any) =>
    typeof s === 'object' && (s._id ?? s.id) ? String(s._id ?? s.id) : String(s)
  );
  return {
    id: String(api._id ?? api.id ?? ''),
    name: api.name ?? '',
    description: api.description ?? '',
    skus: skuIds,
    status: api.status ?? 'Draft',
    type: api.type,
    tags: api.tags ?? [],
    imageUrl: api.imageUrl,
    region: api.region ?? 'North America',
    owner: api.owner,
    updatedAt: api.updatedAt ? new Date(api.updatedAt).toLocaleDateString() : undefined,
  };
}

/**
 * Get SKUs
 */
export async function getSKUs(params?: {
  category?: string;
  status?: string;
}): Promise<{ success: boolean; data: SKU[] }> {
  const queryString = params
    ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString()
    : '';
  const url = queryString ? `${BASE_PATH}/skus?${queryString}` : `${BASE_PATH}/skus`;
  const response = await apiRequest<{ success: boolean; count?: number; data: any[] }>(url);
  const raw = response?.data ?? [];
  const data = Array.isArray(raw) ? raw.map(mapApiSkuToFrontend) : [];
  return { success: true, data };
}

/**
 * Create SKU
 */
export async function createSKU(data: Partial<SKU> & { code?: string; sku?: string; name: string; category: string }): Promise<{ success: boolean; data: SKU }> {
  const payload = {
    code: data.code ?? data.sku ?? `SKU-${Date.now()}`,
    name: data.name,
    category: data.category,
    brand: data.brand ?? 'Generic',
    sellingPrice: data.price ?? 0,
    stock: data.stock ?? 0,
    visibility: data.visibility ?? { 'North America': 'Hidden', 'Europe (West)': 'Hidden', 'APAC': 'Hidden' },
    tags: data.tags ?? [],
    imageUrl: data.imageUrl,
  };
  const response = await apiRequest<{ success: boolean; data: any }>(`${BASE_PATH}/skus`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const created = response?.data;
  return { success: true, data: created ? mapApiSkuToFrontend(created) : mapApiSkuToFrontend({ ...payload, _id: 'new' }) };
}

/**
 * Update SKU
 */
export async function updateSKU(id: string, data: Partial<SKU>): Promise<{ success: boolean; data: SKU }> {
  const payload: Record<string, any> = {};
  if (data.code != null) payload.code = data.code;
  if (data.sku != null) payload.code = data.sku;
  if (data.name != null) payload.name = data.name;
  if (data.category != null) payload.category = data.category;
  if (data.brand != null) payload.brand = data.brand;
  if (data.price != null) payload.sellingPrice = data.price;
  if (data.stock != null) payload.stock = data.stock;
  if (data.visibility != null) payload.visibility = data.visibility;
  if (data.tags != null) payload.tags = data.tags;
  if (data.imageUrl != null) payload.imageUrl = data.imageUrl;

  const response = await apiRequest<{ success: boolean; data: any }>(`${BASE_PATH}/skus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const updated = response?.data;
  return { success: true, data: updated ? mapApiSkuToFrontend(updated) : mapApiSkuToFrontend({ _id: id, ...payload }) };
}

/**
 * Delete SKU
 */
export async function deleteSKU(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/skus/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get collections
 */
export async function getCollections(): Promise<{ success: boolean; data: Collection[] }> {
  const response = await apiRequest<{ success: boolean; count?: number; data: any[] }>(`${BASE_PATH}/collections`);
  const raw = response?.data ?? [];
  const data = Array.isArray(raw) ? raw.map(mapApiCollectionToFrontend) : [];
  return { success: true, data };
}

/**
 * Create collection
 */
export async function createCollection(data: Omit<Collection, 'id'>): Promise<{ success: boolean; data: Collection }> {
  const payload = {
    name: data.name,
    description: data.description ?? '',
    type: data.type ?? 'Seasonal',
    status: data.status ?? 'Draft',
    tags: data.tags ?? [],
    skus: Array.isArray(data.skus) ? data.skus : [],
    imageUrl: data.imageUrl,
    region: data.region ?? 'North America',
    owner: data.owner ?? 'You',
  };
  const response = await apiRequest<{ success: boolean; data: any }>(`${BASE_PATH}/collections`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const created = response?.data;
  return { success: true, data: created ? mapApiCollectionToFrontend(created) : mapApiCollectionToFrontend({ ...payload, _id: 'new' }) };
}

/**
 * Update collection
 */
export async function updateCollection(id: string, data: Partial<Collection>): Promise<{ success: boolean; data: Collection }> {
  const payload: Record<string, any> = {};
  if (data.name != null) payload.name = data.name;
  if (data.description != null) payload.description = data.description;
  if (data.type != null) payload.type = data.type;
  if (data.status != null) payload.status = data.status;
  if (data.tags != null) payload.tags = data.tags;
  if (data.skus != null) payload.skus = data.skus;
  if (data.imageUrl != null) payload.imageUrl = data.imageUrl;
  if (data.region != null) payload.region = data.region;

  const response = await apiRequest<{ success: boolean; data: any }>(`${BASE_PATH}/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const updated = response?.data;
  return { success: true, data: updated ? mapApiCollectionToFrontend(updated) : mapApiCollectionToFrontend({ _id: id, ...payload }) };
}

/**
 * Delete collection
 */
export async function deleteCollection(id: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE_PATH}/collections/${id}`, {
    method: 'DELETE',
  });
}

export const catalogApi = {
  getSKUs,
  createSKU,
  updateSKU,
  deleteSKU,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
};
