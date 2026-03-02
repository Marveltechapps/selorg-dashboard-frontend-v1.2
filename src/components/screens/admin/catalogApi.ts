import { apiRequest } from '@/api/apiClient';

const PREFIX = '/customer/admin/home';

// --- Type Definitions ---

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  subcategory: string;
  subcategoryId: string;
  brand: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  imageUrl: string;
  images: string[];
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  attributes: {
    weight?: string;
    dimensions?: string;
    color?: string;
    size?: string;
    material?: string;
    expiryDays?: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  imageUrl: string;
  productCount: number;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: string;
  /** On home, when user taps this category: product:id, category:id, https://..., or ScreenName:param=val. Empty = open CategoryProducts. */
  link?: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: string[];
  usageCount: number;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

function mapBackendAttribute(raw: any): ProductAttribute {
  return {
    id: raw._id,
    name: raw.name || '',
    type: raw.type || 'text',
    options: raw.options || [],
    usageCount: 0,
  };
}

// --- Helper Functions ---

export function getStockStatus(product: Product): StockStatus {
  if (product.stockQuantity === 0) return 'out_of_stock';
  if (product.stockQuantity <= product.lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

/**
 * Resolve category and subcategory names to IDs for bulk import.
 * Returns { categoryId, subcategoryId } - null if not found.
 */
export function resolveCategoryIds(
  categories: Category[],
  categoryName: string,
  subcategoryName: string
): { categoryId: string | null; subcategoryId: string | null } {
  const catName = (categoryName || '').trim();
  const subName = (subcategoryName || '').trim();
  if (!catName) return { categoryId: null, subcategoryId: null };
  const catLower = catName.toLowerCase();
  const subLower = subName.toLowerCase();
  const topLevel = categories.filter((c) => !c.parentId);
  const subcats = categories.filter((c) => c.parentId);
  const cat = topLevel.find((c) => c.name.toLowerCase() === catLower || c.slug.toLowerCase() === catLower);
  if (!cat) return { categoryId: null, subcategoryId: null };
  const categoryId = cat.id;
  if (!subName) return { categoryId, subcategoryId: null };
  const sub = subcats.find(
    (c) =>
      c.parentId === categoryId &&
      (c.name.toLowerCase() === subLower || c.slug.toLowerCase() === subLower)
  );
  return { categoryId, subcategoryId: sub ? sub.id : null };
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FetchProductsParams {
  categoryId?: string;
  status?: string;
  stock?: 'in_stock' | 'low_stock' | 'out_of_stock';
  page?: number;
  limit?: number;
  search?: string;
}

export interface FetchProductsResult {
  data: Product[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}
interface OneResponse<T> {
  success: boolean;
  data: T;
}

// --- Data Mapping ---

function mapBackendCategory(raw: any): Category {
  return {
    id: raw._id,
    name: raw.name || '',
    slug: raw.slug || '',
    parentId: raw.parentId || null,
    description: raw.description || '',
    imageUrl: raw.imageUrl || '',
    productCount: raw.productCount || 0,
    status: raw.isActive === false ? 'inactive' : 'active',
    sortOrder: raw.order || 0,
    createdAt: raw.createdAt || '',
    link: raw.link || undefined,
  };
}

function mapBackendProduct(raw: any): Product {
  const categoryObj = raw.categoryId;
  const subcategoryObj = raw.subcategoryId;
  const categoryName = typeof categoryObj === 'object' && categoryObj ? categoryObj.name : '';
  const categoryIdStr = typeof categoryObj === 'object' && categoryObj ? categoryObj._id : (categoryObj || '');
  const subcategoryName = typeof subcategoryObj === 'object' && subcategoryObj ? subcategoryObj.name : '';
  const subcategoryIdStr = typeof subcategoryObj === 'object' && subcategoryObj ? subcategoryObj._id : (subcategoryObj || '');

  return {
    id: raw._id,
    sku: raw.sku || '',
    name: raw.name || '',
    description: raw.description || '',
    category: categoryName,
    categoryId: categoryIdStr,
    subcategory: subcategoryName,
    subcategoryId: subcategoryIdStr,
    brand: raw.brand || '',
    price: raw.price || 0,
    costPrice: raw.costPrice || 0,
    stockQuantity: raw.stockQuantity || 0,
    lowStockThreshold: raw.lowStockThreshold || 10,
    imageUrl: raw.imageUrl || (raw.images?.[0] || ''),
    images: raw.images || [],
    status: raw.status || (raw.isActive === false ? 'inactive' : 'active'),
    featured: raw.featured || false,
    attributes: raw.attributes || {},
    tags: raw.tags || [],
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    createdBy: raw.createdBy || '',
  };
}

// --- API Functions ---

export async function fetchProducts(params?: FetchProductsParams): Promise<Product[] | FetchProductsResult> {
  const queryParams = new URLSearchParams();
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params?.stock && params.stock !== 'all') queryParams.append('stock', params.stock);
  if (params?.page != null) queryParams.append('page', String(params.page));
  if (params?.limit != null) queryParams.append('limit', String(params.limit));
  if (params?.search && params.search.trim()) queryParams.append('search', params.search.trim());
  const qs = queryParams.toString();
  const url = qs ? `${PREFIX}/products?${qs}` : `${PREFIX}/products`;
  const response = await apiRequest<ListResponse<any>>(url);
  const products = (response.data || []).map(mapBackendProduct);
  if (response.meta) {
    return { data: products, meta: response.meta };
  }
  return products;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiRequest<ListResponse<any>>(`${PREFIX}/categories`);
  return (response.data || []).map(mapBackendCategory);
}

export async function fetchAttributes(): Promise<ProductAttribute[]> {
  const response = await apiRequest<ListResponse<any>>(`${PREFIX}/attributes`);
  return (response.data || []).map(mapBackendAttribute);
}

export async function createAttribute(data: Partial<ProductAttribute>): Promise<ProductAttribute> {
  const body: any = {
    name: data.name,
    type: data.type || 'text',
    options: data.options || [],
  };
  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/attributes`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBackendAttribute(response.data);
}

export async function updateAttribute(id: string, data: Partial<ProductAttribute>): Promise<ProductAttribute> {
  const body: any = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.type !== undefined) body.type = data.type;
  if (data.options !== undefined) body.options = data.options;
  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/attributes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapBackendAttribute(response.data);
}

export async function deleteAttribute(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/attributes/${id}`, { method: 'DELETE' });
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const body: any = {
    name: data.name,
    sku: data.sku,
    description: data.description,
    brand: data.brand,
    price: data.price,
    costPrice: data.costPrice,
    stockQuantity: data.stockQuantity,
    lowStockThreshold: data.lowStockThreshold,
    imageUrl: data.imageUrl,
    images: data.images || (data.imageUrl ? [data.imageUrl] : []),
    status: data.status,
    featured: data.featured,
    attributes: data.attributes,
    tags: data.tags,
  };
  if (data.categoryId) body.categoryId = data.categoryId;
  if (data.subcategoryId) body.subcategoryId = data.subcategoryId;

  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/products`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBackendProduct(response.data);
}

const PRODUCT_UPDATE_KEYS = [
  'name', 'sku', 'description', 'brand', 'price', 'costPrice', 'originalPrice',
  'stockQuantity', 'lowStockThreshold', 'imageUrl', 'images', 'status', 'featured',
  'attributes', 'tags', 'categoryId', 'subcategoryId',
] as const;

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const body: Record<string, unknown> = {};
  for (const key of PRODUCT_UPDATE_KEYS) {
    const v = (data as Record<string, unknown>)[key];
    if (v === undefined) continue;
    body[key] = key === 'subcategoryId' ? (v || null) : v;
  }

  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapBackendProduct(response.data);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/products/${id}`, { method: 'DELETE' });
}

/** Publish product (draft → active) and sync to downstream (Warehouse → Dark Store → Customer App). */
export async function publishProduct(id: string): Promise<Product> {
  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/products/${id}/publish`, {
    method: 'POST',
  });
  return mapBackendProduct(response.data);
}

/** Upload product image to S3; returns the public URL. */
export async function uploadProductImage(base64Data: string): Promise<string> {
  const response = await apiRequest<{ success: boolean; data: { url: string } }>(
    `${PREFIX}/upload-product-image`,
    { method: 'POST', body: JSON.stringify({ image: base64Data }) }
  );
  return response.data.url;
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const body: any = {
    name: data.name,
    slug: data.slug,
    description: data.description || '',
    imageUrl: data.imageUrl || '',
    isActive: data.status !== 'inactive',
    parentId: data.parentId || null,
  };

  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBackendCategory(response.data);
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const body: any = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.slug !== undefined) body.slug = data.slug;
  if (data.description !== undefined) body.description = data.description;
  if (data.imageUrl !== undefined) body.imageUrl = data.imageUrl;
  if (data.status !== undefined) body.isActive = data.status === 'active';
  if (data.parentId !== undefined) body.parentId = data.parentId || null;

  const response = await apiRequest<OneResponse<any>>(`${PREFIX}/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapBackendCategory(response.data);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/categories/${id}`, { method: 'DELETE' });
}

const BULK_UPDATE_KEYS = [
  ...PRODUCT_UPDATE_KEYS,
  'stockIncrement', // optional: add/subtract from stockQuantity
] as const;

export async function bulkUpdateProducts(ids: string[], updates: Partial<Product> & { stockIncrement?: number }): Promise<number> {
  if (!ids?.length) return 0;
  const body: Record<string, unknown> = {};
  for (const key of BULK_UPDATE_KEYS) {
    const v = (updates as Record<string, unknown>)[key];
    if (v === undefined) continue;
    body[key] = key === 'subcategoryId' ? (v || null) : v;
  }
  if (Object.keys(body).length === 0) return 0;
  const response = await apiRequest<{ success: boolean; count: number }>(`${PREFIX}/products/bulk`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, updates: body }),
  });
  return response.count ?? 0;
}

export async function bulkImportProducts(_csvData: string): Promise<BulkImportResult> {
  throw new Error('Not implemented');
}

export async function exportProducts(_format: 'csv' | 'excel'): Promise<string> {
  throw new Error('Not implemented');
}
