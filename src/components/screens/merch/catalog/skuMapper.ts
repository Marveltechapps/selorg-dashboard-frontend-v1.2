import type { Region, SKU, SKUVisibilityStatus } from './types';

export const CATALOG_REGIONS: Region[] = ['North America', 'Europe (West)', 'APAC'];

const DEFAULT_VISIBILITY: Record<Region, SKUVisibilityStatus> = {
  'North America': 'Hidden',
  'Europe (West)': 'Hidden',
  APAC: 'Hidden',
};

export function normalizeVisibility(raw: unknown): Record<Region, SKUVisibilityStatus> {
  const src =
    raw && typeof raw === 'object' && 'toObject' in (raw as object)
      ? (raw as { toObject: () => Record<string, string> }).toObject()
      : (raw as Record<string, string> | null);

  return {
    'North America': src?.['North America'] === 'Visible' ? 'Visible' : 'Hidden',
    'Europe (West)': src?.['Europe (West)'] === 'Visible' ? 'Visible' : 'Hidden',
    APAC: src?.APAC === 'Visible' ? 'Visible' : 'Hidden',
  };
}

export function mapApiSkuToCatalogSku(api: Record<string, unknown>): SKU {
  return {
    id: String(api._id ?? api.id ?? ''),
    code: String(api.code ?? api.sku ?? ''),
    name: String(api.name ?? ''),
    category: String(api.category ?? 'Uncategorized'),
    brand: String(api.brand ?? 'Generic'),
    price: Number(api.sellingPrice ?? api.basePrice ?? api.price ?? 0),
    promoPrice: api.promoPrice != null ? Number(api.promoPrice) : undefined,
    stock: Number(api.stock ?? 0),
    visibility: normalizeVisibility(api.visibility),
    imageUrl: api.imageUrl != null ? String(api.imageUrl) : undefined,
    tags: Array.isArray(api.tags) ? (api.tags as string[]) : [],
  };
}
