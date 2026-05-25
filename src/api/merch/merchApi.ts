/**
 * Merch API
 * Comprehensive merch & promo dashboard API client
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch';

export interface OverviewMetricCard {
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
}

export interface OverviewStatsDisplay {
  activeCampaigns: OverviewMetricCard;
  promoUplift: OverviewMetricCard;
  priceChanges: OverviewMetricCard;
  stockConflicts: OverviewMetricCard;
}

export interface MerchStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPromotions: number;
  revenueImpact: number;
  stockConflicts: number;
}

export interface MerchOverviewCampaign {
  id: string;
  name: string;
  type: string;
  status: 'Active' | 'Scheduled' | 'Ending Soon' | 'Expired' | 'Paused' | 'Draft' | string;
  uplift: string;
  redemption: string;
  startDate: string;
  endDate: string;
  tagline?: string;
  period?: string;
  target?: string;
  scope?: string;
  owner?: { name: string; initial: string };
  kpi?: { label?: string; value?: string; trend?: string };
  endsAt?: string;
  raw?: Record<string, unknown>;
}

function formatStatValue(v: unknown): string {
  if (v == null || v === '') return '0';
  return String(v);
}

/** Maps GET /merch/overview/stats payload to UI metric cards. */
export function mapOverviewStatsFromApi(data: Record<string, unknown> | null | undefined): OverviewStatsDisplay {
  const ac = (data?.activeCampaigns ?? {}) as Record<string, unknown>;
  const pu = (data?.promoUplift ?? {}) as Record<string, unknown>;
  const pc = (data?.priceChanges ?? {}) as Record<string, unknown>;
  const sc = (data?.stockConflicts ?? {}) as Record<string, unknown>;
  return {
    activeCampaigns: {
      value: formatStatValue(ac.value),
      trend: typeof ac.trend === 'string' ? ac.trend : '0 ending soon',
      trendUp: ac.trendUp !== false,
    },
    promoUplift: {
      value: formatStatValue(pu.value ?? '0%'),
      trend: typeof pu.trend === 'string' ? pu.trend : 'vs last month',
      trendUp: pu.trendUp !== false,
    },
    priceChanges: {
      value: formatStatValue(pc.value),
      subValue: typeof pc.subValue === 'string' ? pc.subValue : 'Pending',
      trend: typeof pc.trend === 'string' ? pc.trend : 'Needs approval',
      trendUp: pc.trendUp === true,
    },
    stockConflicts: {
      value: formatStatValue(sc.value),
      trend: typeof sc.trend === 'string' ? sc.trend : 'High Priority',
      trendUp: sc.trendUp === true,
    },
  };
}

export function resolveDisplayStatus(
  status: string,
  endsAt?: string | Date | null
): MerchOverviewCampaign['status'] {
  const s = status || 'Draft';
  if (s === 'Stopped' || s === 'Ended' || s === 'Archived') return 'Expired';
  if (s === 'Active' && endsAt) {
    const end = new Date(endsAt);
    if (!Number.isNaN(end.getTime())) {
      const days = (end.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (days >= 0 && days <= 3) return 'Ending Soon';
    }
  }
  if (s === 'Active') return 'Active';
  if (s === 'Scheduled') return 'Scheduled';
  if (s === 'Paused') return 'Paused';
  if (s === 'Draft') return 'Draft';
  return s;
}

/** Maps a campaign document from GET /merch/campaigns to overview table rows. */
export function mapOverviewCampaignFromApi(c: Record<string, unknown>): MerchOverviewCampaign {
  const id = String(c._id ?? c.id ?? '');
  const period = String(c.period ?? '');
  const parts = period.split(/\s*[-–]\s*/);
  const kpi = c.kpi as { value?: string; label?: string; trend?: string } | undefined;
  const perf = c.performance as { uplift?: number; orders?: number } | undefined;
  let uplift = '-';
  if (kpi?.value) {
    uplift = String(kpi.value).startsWith('+') ? String(kpi.value) : `+${kpi.value}`;
  } else if (perf?.uplift != null) {
    uplift = `+${perf.uplift}%`;
  }
  const orders = typeof perf?.orders === 'number' ? perf.orders : 0;
  const endsAt = c.endsAt != null ? String(c.endsAt) : undefined;
  const status = resolveDisplayStatus(String(c.status ?? 'Draft'), endsAt);

  return {
    id,
    name: String(c.name ?? ''),
    type: String(c.type ?? 'Promo'),
    status,
    uplift,
    redemption: orders > 0 ? `${orders.toLocaleString()} uses` : '0 uses',
    startDate: parts[0]?.trim() || '—',
    endDate: parts[1]?.trim() || '—',
    tagline: c.tagline != null ? String(c.tagline) : undefined,
    period,
    target: c.target != null ? String(c.target) : undefined,
    scope: c.scope != null ? String(c.scope) : undefined,
    owner: c.owner as MerchOverviewCampaign['owner'],
    kpi,
    endsAt,
    raw: c,
  };
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  products: string[];
  performance?: {
    orders: number;
    revenue: number;
    uplift: number;
  };
}

export interface StockConflict {
  id: string;
  sku: string;
  productName: string;
  conflictType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
}

export interface PromoUplift {
  id: string;
  campaignId: string;
  sku: string;
  uplift: number;
  baselineSales: number;
  promoSales: number;
  revenue: number;
}

export interface PriceChange {
  id: string;
  sku: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changeType: 'increase' | 'decrease';
  reason: string;
  effectiveDate: string;
}

/**
 * Get merch stats
 */
export async function getMerchStats(): Promise<{ success: boolean; data: OverviewStatsDisplay | MerchStats }> {
  return apiRequest(`${BASE_PATH}/overview/stats`);
}

export interface PerformanceReportKpis {
  totalRevenue: string;
  uplift: string;
  activeCampaigns: string;
  avgDiscount: string;
}

export interface PerformanceReportCampaign {
  id: string;
  name: string;
  revenue: string;
  uplift: string;
  roi: string;
}

export async function getPerformanceReport(params: {
  dateRange?: string;
  region?: string;
  channel?: string;
  campaignType?: string;
}): Promise<{
  success: boolean;
  data: { kpis: PerformanceReportKpis; campaigns: PerformanceReportCampaign[] };
}> {
  const qs = new URLSearchParams();
  if (params.dateRange) qs.set('dateRange', params.dateRange);
  if (params.region) qs.set('region', params.region);
  if (params.channel) qs.set('channel', params.channel);
  if (params.campaignType) qs.set('campaignType', params.campaignType);
  const query = qs.toString();
  const url = query
    ? `${BASE_PATH}/overview/performance-report?${query}`
    : `${BASE_PATH}/overview/performance-report`;
  return apiRequest(url);
}

/** Seed campaigns, uplift, conflicts, and pending price changes for overview demos. */
export async function seedMerchOverview(): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`${BASE_PATH}/overview/seed`, { method: 'POST' });
}

/**
 * Get stock conflicts
 */
export async function getStockConflicts(): Promise<{ success: boolean; data: StockConflict[] }> {
  return apiRequest(`${BASE_PATH}/overview/conflicts`);
}

/**
 * Create stock conflict
 */
export async function createStockConflict(
  data: Omit<StockConflict, 'id' | 'createdAt'>
): Promise<{ success: boolean; data: StockConflict }> {
  return apiRequest(`${BASE_PATH}/overview/conflicts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get promo uplift
 */
export async function getPromoUplift(): Promise<{ success: boolean; data: PromoUplift[] }> {
  return apiRequest(`${BASE_PATH}/overview/uplift`);
}

/**
 * Create promo uplift
 */
export async function createPromoUplift(
  data: Omit<PromoUplift, 'id'>
): Promise<{ success: boolean; data: PromoUplift }> {
  return apiRequest(`${BASE_PATH}/overview/uplift`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get price changes
 */
export async function getPriceChanges(): Promise<{ success: boolean; data: PriceChange[] }> {
  return apiRequest(`${BASE_PATH}/overview/price-changes`);
}

/**
 * Create price change
 */
export async function createPriceChange(
  data: Omit<PriceChange, 'id'>
): Promise<{ success: boolean; data: PriceChange }> {
  return apiRequest(`${BASE_PATH}/overview/price-changes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get campaigns
 */
export interface GetCampaignsParams {
  status?: string;
  type?: string;
  scope?: string;
  /** na | eu | apac */
  region?: string;
  /** discount | flash | bundle | loyalty | bogo | clearance */
  typeFilter?: string;
  /** When true, returns Active + Scheduled campaigns only */
  running?: boolean | string;
}

export async function getCampaigns(
  params?: GetCampaignsParams
): Promise<{ success: boolean; data: Campaign[]; count?: number }> {
  const entries: [string, string][] = [];
  if (params) {
    if (params.status != null) entries.push(['status', String(params.status)]);
    if (params.type != null) entries.push(['type', String(params.type)]);
    if (params.scope != null) entries.push(['scope', String(params.scope)]);
    if (params.region != null) entries.push(['region', String(params.region)]);
    if (params.typeFilter != null) entries.push(['typeFilter', String(params.typeFilter)]);
    if (params.running === true || params.running === 'true') entries.push(['running', 'true']);
  }
  const queryString = entries.length ? new URLSearchParams(entries).toString() : '';
  const url = queryString ? `${BASE_PATH}/campaigns?${queryString}` : `${BASE_PATH}/campaigns`;
  return apiRequest(url);
}

/**
 * Get campaign by ID
 */
export async function getCampaign(id: string): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`);
}

/**
 * Create campaign
 */
export async function createCampaign(
  data: Omit<Campaign, 'id' | 'performance'>
): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update campaign
 */
export async function updateCampaign(
  id: string,
  data: Partial<Campaign>
): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id: string): Promise<{ success: boolean; data?: unknown }> {
  return apiRequest(`${BASE_PATH}/campaigns/${id}`, {
    method: 'DELETE',
  });
}

/** Create campaign with full wizard payload (rules, region, performance, etc.) */
export async function createMerchCampaign(
  data: Record<string, unknown>
): Promise<{ success: boolean; data: Campaign }> {
  return apiRequest(`${BASE_PATH}/campaigns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
