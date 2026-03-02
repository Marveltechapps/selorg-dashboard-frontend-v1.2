/**
 * Customer App Admin API
 * CRUD for customer app home content: categories, banners, config, sections, lifestyle, promoblocks, products.
 * All routes require dashboard admin JWT and are under /api/v1/customer/admin/home
 * Home payload (read-only) is at /customer/home for preview.
 */
import { apiRequest } from './apiClient';

const PREFIX = '/customer/admin/home';
const HOME_PAYLOAD_PREFIX = '/customer/home';

/** Same shape as customer app receives from GET /api/v1/customer/home */
export interface CustomerHomePayload {
  config: HomeConfig | null;
  categories: Category[];
  heroBanners: Banner[];
  midBanners: Banner[];
  sections: Record<string, { title?: string; products: unknown[] }>;
  lifestyle: LifestyleItem[];
  promoBlocks: Record<string, { imageUrl?: string; link?: string }>;
  defaultAddress?: unknown;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  isActive?: boolean;
  order?: number;
  parentId?: string | null;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  _id: string;
  slot: string;
  imageUrl: string;
  link?: string;
  title?: string;
  isActive?: boolean;
  order?: number;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionDefinition {
  key: string;
  label: string;
}

export interface HomeConfig {
  _id?: string;
  key: string;
  heroVideoUrl?: string;
  searchPlaceholder?: string;
  deliveryTypeLabel?: string;
  categorySectionTitle?: string;
  organicTagline?: string;
  organicIconUrl?: string;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  /** Section keys with display labels for admin UI. */
  sectionDefinitions?: SectionDefinition[];
  /** Ordered category IDs to show on home (from catalog). */
  categoryIds?: string[];
}

export interface HomeSection {
  _id: string;
  sectionKey: string;
  title?: string;
  productIds?: string[];
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LifestyleItem {
  _id: string;
  /** Display title; backend may use `name` as the stored field */
  title?: string;
  name?: string;
  imageUrl?: string;
  link?: string;
  blockKey?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoBlock {
  _id: string;
  blockKey: string;
  imageUrl?: string;
  link?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  discount?: string;
  quantity?: string;
  description?: string;
  variants?: Array<{ sku?: string; size?: string; price?: number; originalPrice?: number }>;
  categoryId?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
}
interface OneResponse<T> {
  success: boolean;
  data: T;
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  const res = await apiRequest<ListResponse<Category>>(`${PREFIX}/categories`);
  return res.data ?? [];
}
export async function createCategory(body: Partial<Category>): Promise<Category> {
  const res = await apiRequest<OneResponse<Category>>(`${PREFIX}/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateCategory(id: string, body: Partial<Category>): Promise<Category> {
  const res = await apiRequest<OneResponse<Category>>(`${PREFIX}/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteCategory(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/categories/${id}`, { method: 'DELETE' });
}

// Banners
export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiRequest<ListResponse<Banner>>(`${PREFIX}/banners`);
  return res.data ?? [];
}
export async function createBanner(body: Partial<Banner>): Promise<Banner> {
  const res = await apiRequest<OneResponse<Banner>>(`${PREFIX}/banners`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateBanner(id: string, body: Partial<Banner>): Promise<Banner> {
  const res = await apiRequest<OneResponse<Banner>>(`${PREFIX}/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteBanner(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/banners/${id}`, { method: 'DELETE' });
}

// Home config (full CRUD)
export async function fetchHomeConfig(): Promise<HomeConfig | null> {
  const res = await apiRequest<OneResponse<HomeConfig | null>>(`${PREFIX}/config`);
  return res.data ?? null;
}
export async function listHomeConfigs(): Promise<HomeConfig[]> {
  const res = await apiRequest<ListResponse<HomeConfig>>(`${PREFIX}/config/list`);
  return res.data ?? [];
}
export async function upsertHomeConfig(body: Partial<HomeConfig>): Promise<HomeConfig> {
  const res = await apiRequest<OneResponse<HomeConfig>>(`${PREFIX}/config`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateHomeConfig(body: Partial<HomeConfig>): Promise<HomeConfig> {
  const res = await apiRequest<OneResponse<HomeConfig>>(`${PREFIX}/config`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteHomeConfig(): Promise<void> {
  await apiRequest(`${PREFIX}/config`, { method: 'DELETE' });
}

/** Section definition (key + label + order) for the home section list. Managed in Section list tab. */
export interface HomeSectionDefinitionItem {
  _id: string;
  key: string;
  label: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchSectionDefinitions(): Promise<HomeSectionDefinitionItem[]> {
  const res = await apiRequest<ListResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions`);
  return res.data ?? [];
}
export async function createSectionDefinition(body: { key: string; label?: string; order?: number }): Promise<HomeSectionDefinitionItem> {
  const res = await apiRequest<OneResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateSectionDefinition(id: string, body: { label?: string; order?: number }): Promise<HomeSectionDefinitionItem> {
  const res = await apiRequest<OneResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteSectionDefinition(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/section-definitions/${id}`, { method: 'DELETE' });
}

// Sections
export async function fetchSections(): Promise<HomeSection[]> {
  const res = await apiRequest<ListResponse<HomeSection>>(`${PREFIX}/sections`);
  return res.data ?? [];
}
export async function createSection(body: Partial<HomeSection>): Promise<HomeSection> {
  const res = await apiRequest<OneResponse<HomeSection>>(`${PREFIX}/sections`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateSection(id: string, body: Partial<HomeSection>): Promise<HomeSection> {
  const res = await apiRequest<OneResponse<HomeSection>>(`${PREFIX}/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteSection(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/sections/${id}`, { method: 'DELETE' });
}

// Lifestyle
export async function fetchLifestyle(): Promise<LifestyleItem[]> {
  const res = await apiRequest<ListResponse<LifestyleItem>>(`${PREFIX}/lifestyle`);
  return res.data ?? [];
}
export async function createLifestyle(body: Partial<LifestyleItem>): Promise<LifestyleItem> {
  const res = await apiRequest<OneResponse<LifestyleItem>>(`${PREFIX}/lifestyle`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateLifestyle(id: string, body: Partial<LifestyleItem>): Promise<LifestyleItem> {
  const res = await apiRequest<OneResponse<LifestyleItem>>(`${PREFIX}/lifestyle/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteLifestyle(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/lifestyle/${id}`, { method: 'DELETE' });
}

// Promo blocks
export async function fetchPromoBlocks(): Promise<PromoBlock[]> {
  const res = await apiRequest<ListResponse<PromoBlock>>(`${PREFIX}/promoblocks`);
  return res.data ?? [];
}
export async function createPromoBlock(body: Partial<PromoBlock>): Promise<PromoBlock> {
  const res = await apiRequest<OneResponse<PromoBlock>>(`${PREFIX}/promoblocks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updatePromoBlock(id: string, body: Partial<PromoBlock>): Promise<PromoBlock> {
  const res = await apiRequest<OneResponse<PromoBlock>>(`${PREFIX}/promoblocks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deletePromoBlock(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/promoblocks/${id}`, { method: 'DELETE' });
}

// Products
export async function fetchProducts(): Promise<Product[]> {
  const res = await apiRequest<ListResponse<Product>>(`${PREFIX}/products`);
  return res.data ?? [];
}
export async function createProduct(body: Partial<Product>): Promise<Product> {
  const res = await apiRequest<OneResponse<Product>>(`${PREFIX}/products`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function updateProduct(id: string, body: Partial<Product>): Promise<Product> {
  const res = await apiRequest<OneResponse<Product>>(`${PREFIX}/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteProduct(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/products/${id}`, { method: 'DELETE' });
}

/** Fetch the same home payload the customer app receives (for dashboard preview). */
export async function fetchCustomerHomePayload(): Promise<CustomerHomePayload> {
  const res = await apiRequest<{ success: boolean; data: CustomerHomePayload }>(HOME_PAYLOAD_PREFIX);
  return res.data;
}
