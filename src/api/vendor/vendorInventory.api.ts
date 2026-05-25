import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';
import {
  extractList,
  mapAgingAlertFromApi,
  mapAgingInventoryFromApi,
  mapKpiFromApi,
  mapStockItemFromApi,
  mapStockoutFromApi,
  type AgingAlert,
  type AgingInventory,
  type InventoryKPI,
  type StockItem,
  type Stockout,
} from './vendorInventoryMappers';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAuthToken() || ''}`,
  };
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await res.json();
    message = String(body?.message ?? body?.error ?? message);
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!res.ok) await parseError(res, `Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export interface VendorInventoryBundle {
  vendorName: string;
  stock: StockItem[];
  agingAlerts: AgingAlert[];
  agingInventory: AgingInventory[];
  stockouts: Stockout[];
  kpis: InventoryKPI[];
}

export async function loadVendorInventory(vendorId: string): Promise<VendorInventoryBundle> {
  const [stockResp, alertsResp, stockoutsResp, agingResp, kpisResp] = await Promise.all([
    requestJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.stock(vendorId)}?limit=200`),
    requestJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.agingAlerts(vendorId)}`),
    requestJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.stockouts(vendorId)}`),
    requestJson<Record<string, unknown>>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.agingInventory(vendorId)}?daysThreshold=30`),
    requestJson<{ kpis?: unknown[]; vendorName?: string }>(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.kpis(vendorId)}`),
  ]);

  const vendorName = String(
    stockResp.vendorName ?? alertsResp.vendorName ?? stockoutsResp.vendorName ?? 'Vendor'
  );

  return {
    vendorName,
    stock: extractList<Record<string, unknown>>(stockResp).map((r) => mapStockItemFromApi(r)),
    agingAlerts: extractList<Record<string, unknown>>(alertsResp).map((r) =>
      mapAgingAlertFromApi(r, vendorName)
    ),
    stockouts: extractList<Record<string, unknown>>(stockoutsResp).map((r) =>
      mapStockoutFromApi(r, vendorName)
    ),
    agingInventory: extractList<Record<string, unknown>>(agingResp).map(mapAgingInventoryFromApi),
    kpis: Array.isArray(kpisResp.kpis)
      ? kpisResp.kpis.map((k) => mapKpiFromApi(k as Record<string, unknown>))
      : [],
  };
}


export type SupplyPerformanceTone = 'good' | 'warning' | 'critical' | 'neutral';

export interface SupplyPerformanceItem {
  id: string;
  label: string;
  value: string;
  group: string;
  tone?: SupplyPerformanceTone;
}

export interface SupplyPerformancePayload {
  vendorId: string;
  vendorName: string;
  generatedAt: string;
  deliveryTimelinessPct: number | null;
  slaCompliancePct: number | null;
  hub: Record<string, unknown>;
  items: SupplyPerformanceItem[];
  kpis?: unknown[];
}

export async function loadSupplyPerformance(vendorId: string): Promise<SupplyPerformancePayload> {
  return requestJson<SupplyPerformancePayload>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.supplyPerformance(vendorId)}`
  );
}

export async function getKPIs(vendorId: string) {
  const data = await requestJson<{ kpis: unknown[] }>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.kpis(vendorId)}`
  );
  return { kpis: (data.kpis || []).map((k) => mapKpiFromApi(k as Record<string, unknown>)) };
}

export async function listVendorStock(vendorId: string): Promise<StockItem[]> {
  const data = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.stock(vendorId)}?limit=200`
  );
  return extractList<Record<string, unknown>>(data).map(mapStockItemFromApi);
}

export async function getHubAgingAlerts(): Promise<{ items: AgingAlert[]; total: number }> {
  const data = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.hubAgingAlerts}`
  );
  const vendorName = String(data.vendorName ?? 'Hub');
  const items = extractList<Record<string, unknown>>(data).map((r) => mapAgingAlertFromApi(r, vendorName));
  return { total: Number(data.total ?? items.length), items };
}

export async function getAgingAlerts(vendorId: string, vendorName?: string): Promise<AgingAlert[]> {
  const data = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.agingAlerts(vendorId)}`
  );
  const name = vendorName || String(data.vendorName ?? 'Vendor');
  return extractList<Record<string, unknown>>(data).map((r) => mapAgingAlertFromApi(r, name));
}

export async function getStockouts(vendorId: string, vendorName?: string): Promise<Stockout[]> {
  const data = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.stockouts(vendorId)}`
  );
  const name = vendorName || String(data.vendorName ?? 'Vendor');
  return extractList<Record<string, unknown>>(data).map((r) => mapStockoutFromApi(r, name));
}

export async function getAgingInventory(vendorId: string, daysThreshold = 30): Promise<AgingInventory[]> {
  const data = await requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.agingInventory(vendorId)}?daysThreshold=${daysThreshold}`
  );
  return extractList<Record<string, unknown>>(data).map(mapAgingInventoryFromApi);
}

export interface GlobalAlertsQuery {
  status?: string;
  priority?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GlobalAlertsResponse {
  alerts?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  limit?: number;
}

/** Hub-wide / shared operational alerts (used by Vendor Alerts screen). */
export async function getGlobalAlerts(params: GlobalAlertsQuery = {}): Promise<GlobalAlertsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.priority) qs.set('priority', params.priority);
  if (params.type) qs.set('type', params.type);
  if (params.search) qs.set('search', params.search);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return requestJson<GlobalAlertsResponse>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.alerts.list}${suffix}`
  );
}

export async function triggerInventorySync(vendorId: string) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.sync(vendorId)}`,
    { method: 'POST', body: JSON.stringify({}) }
  );
}

export async function reconcileInventory(vendorId: string, body: { items: Array<{ sku: string; expectedQty: number; reportedQty: number; notes?: string }> }) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.reconcile(vendorId)}`,
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export async function acknowledgeAlert(vendorId: string, alertId: string, body?: { note?: string }) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.ackAlert(vendorId, alertId)}`,
    { method: 'POST', body: JSON.stringify(body || {}) }
  );
}

export async function bulkReorder(vendorId: string, payload?: { stockoutIds?: string[] }) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.bulkReorder(vendorId)}`,
    { method: 'POST', body: JSON.stringify(payload || {}) }
  );
}

export async function alertAllVendors(vendorId: string, payload?: { message?: string }) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.alertAll(vendorId)}`,
    { method: 'POST', body: JSON.stringify(payload || {}) }
  );
}

export async function initiateReturn(
  vendorId: string,
  itemId: string,
  body?: { reason?: string }
) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.returnInventory(vendorId, itemId)}`,
    { method: 'POST', body: JSON.stringify(body || {}) }
  );
}

export async function initiateLiquidation(
  vendorId: string,
  itemId: string,
  body?: { discountPercent?: number }
) {
  return requestJson<Record<string, unknown>>(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.inventory.liquidateInventory(vendorId, itemId)}`,
    { method: 'POST', body: JSON.stringify(body || { discountPercent: 30 }) }
  );
}

export const vendorInventoryApi = {
  getGlobalAlerts,
  loadSupplyPerformance,
  loadVendorInventory,
  getKPIs,
  listVendorStock,
  getStock: listVendorStock,
  getHubAgingAlerts,
  getAgingAlerts,
  getStockouts,
  getAgingInventory,
  triggerInventorySync,
  reconcileInventory,
  acknowledgeAlert,
  bulkReorder,
  alertAllVendors,
  initiateReturn,
  initiateLiquidation,
};

export default vendorInventoryApi;
