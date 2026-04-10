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

/** Blocks inside a tappable inline banner’s sub-page (no further nesting). */
export type BannerLeafContentItem = {
  _id?: string;
  type: 'banner' | 'video' | 'image' | 'text' | 'products';
  order?: number;
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  productIds?: string[];
  link?: string;
  isNavigable?: boolean;
};

export interface BannerContentItem extends BannerLeafContentItem {
  /** Sub-page header when opening this tappable block */
  blockTitle?: string;
  /** Same layout as main landing: hero = imageUrl, then these blocks */
  nestedContentItems?: BannerLeafContentItem[];
}

export interface Banner {
  _id: string;
  /** Banner type: placement lane (Hero/Large/Info → top; Small/Mid/Category → in-feed). */
  slot: string;
  presentationMode?: 'single' | 'carousel';
  /** When false, home banner is display-only */
  isNavigable?: boolean;
  imageUrl: string;
  link?: string;
  redirectType?: string | null;
  redirectValue?: string | null;
  title?: string;
  isActive?: boolean;
  order?: number;
  categoryId?: string;
  /** Schedule: banner only visible between these dates */
  startDate?: string | null;
  endDate?: string | null;
  /** When redirectType is 'banner', tapping shows landing page with these items */
  contentItems?: BannerContentItem[];
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
  redirectType?: string | null;
  redirectValue?: string | null;
  blockKey?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoBlock {
  _id: string;
  blockKey: string;
  type?: 'greens_banner' | 'section_image' | 'fullwidth_image';
  imageUrl?: string;
  link?: string;
  redirectType?: string | null;
  redirectValue?: string | null;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  description?: string | {
    about?: string;
    nutrition?: string;
    originOfPlace?: string;
    healthBenefits?: string;
    raw?: string;
  };
  classification?: 'Style' | 'Variant';
  hierarchyCode?: string;
  size?: string;
  tag?: string;
  images?: string[];
  imageUrl?: string;
  additionalImages?: string[];
  price: number;
  mrp?: number;
  baseCost?: number;
  originalPrice?: number;
  costPrice?: number;
  taxPercent?: number;
  gstRate?: number;
  taxCategory?: string;
  taxBreakup?: {
    sgstPercent?: number;
    cgstPercent?: number;
    igstPercent?: number;
    cessPercent?: number;
    sgstAmount?: number;
    cgstAmount?: number;
    igstAmount?: number;
    cessAmount?: number;
    priceInclGst?: number;
  };
  discount?: string;
  quantity?: string;
  stockQuantity?: number;
  fixedStock?: number;
  lowStockThreshold?: number;
  thresholdAlertRequired?: boolean;
  thresholdQty?: number;
  backOrderAllowed?: boolean;
  backOrderQty?: number;
  brand?: string;
  brandCode?: string;
  categoryId?: string;
  subcategoryId?: string;
  status?: string;
  featured?: boolean;
  qcRequired?: boolean;
  variants?: Array<{ sku?: string; size?: string; price?: number; originalPrice?: number }>;
  attributes?: Record<string, unknown>;
  tags?: string[];
  serialTracking?: boolean;
  stackable?: boolean;
  hazardous?: boolean;
  poisonous?: boolean;
  skuRotation?: string;
  rotateBy?: string;
  isActive?: boolean;
  order?: number;
  // Mastersheet / enrichment structured fields.
  associatedClientName?: string;
  styleAttributes?: string;
  style?: string;
  skuSource?: string;
  colour?: string;
  material?: string;
  upcEan?: string;
  washAndCare?: string;
  shippingAndReturns?: string;
  lottableValidation?: string;
  recvValidationCode?: string;
  pickingInstructions?: string;
  shippingInstructions?: string;
  shippingCharges?: number;
  handlingCharges?: number;
  isArsApplicable?: boolean;
  followStyle?: string;
  arsCalculationMethod?: string;
  modelStock?: number;
  imageDescriptions?: string[];
  isUniqueBarcode?: boolean;
  dimensions?: {
    heightCm?: number;
    lengthCm?: number;
    widthCm?: number;
    cube?: number;
    weightKg?: number;
  };
  shelfLife?: {
    value?: number;
    type?: string;
    total?: number;
    onReceiving?: number;
    onPicking?: number;
  };
  meta?: {
    title?: string;
    keywords?: string;
    description?: string;
  };
  udf?: {
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    udf6?: string;
    udf7?: string;
    udf8?: string;
    udf9?: string;
    udf10?: string;
  };
  similarProducts?: string;
  budf8?: string;
  /** SKU Master columns not mapped to a typed field (header → value) */
  additionalImportedFields?: Record<string, string>;
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

/** Section definition (key + label + order + type + collectionId + type-specific fields) for the home section list. */
export interface HomeSectionDefinitionItem {
  _id: string;
  key: string;
  label: string;
  order: number;
  type?: string;
  collectionId?: string;
  taglineText?: string;
  categoryIds?: string[];
  bannerId?: string;
  /** Ordered banner Mongo IDs (Main / Sub). Preferred over bannerId. */
  bannerIds?: string[];
  /** single = one picker; multiple = N pickers */
  bannerSelectionMode?: 'single' | 'multiple';
  /** Banner Main / Sub: multi-slide carousel vs single static image */
  useCarousel?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Collection (for section list picker) */
export interface CollectionOption {
  _id: string;
  name: string;
  slug: string;
}

export async function fetchSectionDefinitions(): Promise<HomeSectionDefinitionItem[]> {
  const res = await apiRequest<ListResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions`);
  return res.data ?? [];
}
export async function createSectionDefinition(body: {
  key?: string;
  label?: string;
  order?: number;
  type?: string;
  collectionId?: string;
  taglineText?: string;
  categoryIds?: string[];
  bannerId?: string;
  bannerIds?: string[];
  bannerSelectionMode?: 'single' | 'multiple';
  useCarousel?: boolean;
}): Promise<HomeSectionDefinitionItem> {
  const res = await apiRequest<OneResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function fetchCollectionsForHome(): Promise<CollectionOption[]> {
  const res = await apiRequest<CollectionOption[] | { data?: CollectionOption[] }>(`/customer/admin/cms/collections`);
  return Array.isArray(res) ? res : (res as { data?: CollectionOption[] })?.data ?? [];
}
export async function updateSectionDefinition(
  id: string,
  body: {
    label?: string;
    order?: number;
    collectionId?: string;
    taglineText?: string;
    categoryIds?: string[];
    bannerId?: string;
    bannerIds?: string[];
    bannerSelectionMode?: 'single' | 'multiple';
    useCarousel?: boolean;
  }
): Promise<HomeSectionDefinitionItem> {
  const res = await apiRequest<OneResponse<HomeSectionDefinitionItem>>(`${PREFIX}/section-definitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data;
}
export async function deleteSectionDefinition(id: string): Promise<void> {
  await apiRequest(`${PREFIX}/section-definitions/${id}`, { method: 'DELETE' });
}
export async function reorderSectionDefinitions(orderedIds: string[]): Promise<void> {
  await apiRequest(`${PREFIX}/section-definitions/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
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
export async function patchSectionProducts(id: string, productIds: string[]): Promise<HomeSection> {
  const res = await apiRequest<OneResponse<HomeSection>>(`${PREFIX}/sections/${id}/products`, {
    method: 'PATCH',
    body: JSON.stringify({ productIds }),
  });
  return res.data;
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
export async function reorderLifestyle(orderedIds: string[]): Promise<void> {
  await apiRequest(`${PREFIX}/lifestyle/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
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
export async function reorderPromoBlocks(orderedIds: string[]): Promise<void> {
  await apiRequest(`${PREFIX}/promoblocks/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
}

// Products
export async function fetchProducts(): Promise<Product[]> {
  const res = await apiRequest<ListResponse<Product>>(`${PREFIX}/products`);
  return res.data ?? [];
}
export async function fetchProductsByQuery(params: {
  search?: string;
  status?: 'active' | 'inactive' | 'draft' | 'all';
  classification?: 'Style' | 'Variant' | 'All';
  categoryId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Product[]> {
  const qp = new URLSearchParams();
  if (params.search?.trim()) qp.set('search', params.search.trim());
  if (params.status && params.status !== 'all') qp.set('status', params.status);
  if (params.classification && params.classification !== 'All') qp.set('classification', params.classification);
  if (params.categoryId) qp.set('categoryId', params.categoryId);
  if (params.page != null) qp.set('page', String(params.page));
  if (params.limit != null) qp.set('limit', String(params.limit));
  const url = qp.toString() ? `${PREFIX}/products?${qp.toString()}` : `${PREFIX}/products`;
  const res = await apiRequest<ListResponse<Product>>(url);
  return res.data ?? [];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchProductsByQueryPaged(params: {
  search?: string;
  status?: 'active' | 'inactive' | 'draft' | 'all';
  classification?: 'Style' | 'Variant' | 'All';
  featured?: 'true' | 'false' | 'all';
  categoryId?: string;
  subcategoryId?: string;
  stock?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
  brand?: string;
  priceMin?: number | string;
  priceMax?: number | string;
  gstMin?: number | string;
  gstMax?: number | string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Product[]; meta: PaginationMeta }> {
  const qp = new URLSearchParams();
  if (params.search?.trim()) qp.set('search', params.search.trim());
  if (params.status && params.status !== 'all') qp.set('status', params.status);
  if (params.classification && params.classification !== 'All') qp.set('classification', params.classification);
  if (params.featured && params.featured !== 'all') qp.set('featured', params.featured);
  if (params.categoryId) qp.set('categoryId', params.categoryId);
  if (params.subcategoryId) qp.set('subcategoryId', params.subcategoryId);
  if (params.stock && params.stock !== 'all') qp.set('stock', params.stock);
  if (params.brand?.trim()) qp.set('brand', params.brand.trim());
  if (params.priceMin != null && String(params.priceMin).trim() !== '') qp.set('priceMin', String(params.priceMin));
  if (params.priceMax != null && String(params.priceMax).trim() !== '') qp.set('priceMax', String(params.priceMax));
  if (params.gstMin != null && String(params.gstMin).trim() !== '') qp.set('gstMin', String(params.gstMin));
  if (params.gstMax != null && String(params.gstMax).trim() !== '') qp.set('gstMax', String(params.gstMax));
  if (params.page != null) qp.set('page', String(params.page));
  if (params.limit != null) qp.set('limit', String(params.limit));

  const url = qp.toString() ? `${PREFIX}/products?${qp.toString()}` : `${PREFIX}/products`;
  const res = await apiRequest<{ success: boolean; data: Product[]; meta?: PaginationMeta }>(url);
  return {
    data: res.data ?? [],
    meta:
      res.meta ??
      ({
        total: res.data?.length ?? 0,
        page: params.page ?? 1,
        limit: params.limit ?? (res.data?.length ?? 0),
        totalPages: 1,
      } as PaginationMeta),
  };
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
export async function updateProductStatus(id: string, isActive: boolean): Promise<Product> {
  const res = await apiRequest<OneResponse<Product>>(`${PREFIX}/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}
export async function bulkUpdateProductStatus(ids: string[], isActive: boolean): Promise<number> {
  const res = await apiRequest<{ success: boolean; count: number }>(`${PREFIX}/products/bulk-status`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, isActive }),
  });
  return res.count ?? 0;
}

/** Fetch the same home payload the customer app receives (for dashboard preview). */
export async function fetchCustomerHomePayload(): Promise<CustomerHomePayload> {
  const res = await apiRequest<{ success: boolean; data: CustomerHomePayload }>(HOME_PAYLOAD_PREFIX);
  return res.data;
}

/** Fetch bootstrap-based preview (matches what the app actually sees from bootstrap). */
export async function fetchBootstrapPreview(): Promise<CustomerHomePayload> {
  const res = await apiRequest<{ success: boolean; data: CustomerHomePayload }>(`${PREFIX}/preview`);
  return res.data;
}
