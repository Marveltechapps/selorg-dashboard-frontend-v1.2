export type VarianceStatus = 'Matched' | 'Discrepancy' | 'Excess';
export type AgingPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type StockoutSeverity = 'Critical' | 'High' | 'Medium';

export interface StockItem {
  id: string;
  sku: string;
  product: string;
  batchId: string;
  warehouse: string;
  systemQty: number;
  physicalQty: number;
  unit: string;
  variance: number;
  variancePercent: number;
  status: VarianceStatus;
}

export interface AgingAlert {
  id: string;
  product: string;
  batchId: string;
  vendor: string;
  expiryDate: string;
  daysToExpiry: number;
  priority: AgingPriority;
  quantity: number;
  unit: string;
  value: number;
  acknowledged?: boolean;
  vendorId?: string;
  inventoryItemId?: string;
  agingDays?: number;
  message?: string;
  source?: string;
}

export interface AgingInventory {
  id: string;
  sku: string;
  product: string;
  batchId: string;
  warehouse: string;
  quantity: number;
  unit: string;
  daysInStock: number;
  expiryDate: string;
  daysToExpiry: number;
  status: string;
}

export interface Stockout {
  id: string;
  sku: string;
  product: string;
  vendor: string;
  lastStock: string;
  daysOut: number;
  affectedStores: number;
  impact: number;
  severity: StockoutSeverity;
  reorderInitiated?: boolean;
  alerted?: boolean;
}

export interface InventoryKPI {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendValue: string;
  trendDirection: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  color: string;
  bgColor: string;
  subMetrics: { label: string; value: string }[];
}

function computeVariance(systemQty: number, physicalQty: number) {
  const variance = physicalQty - systemQty;
  const variancePercent = systemQty ? Math.round((variance / systemQty) * 100) : 0;
  let status: VarianceStatus = 'Matched';
  if (variance < 0) status = 'Discrepancy';
  else if (variance > 0) status = 'Excess';
  return { variance, variancePercent, status };
}

function mapSeverityToPriority(severity: unknown): AgingPriority {
  const s = String(severity ?? '').toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'high') return 'High';
  if (s === 'medium') return 'Medium';
  return 'Low';
}

export function extractList<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as T[];
    if (Array.isArray(r.data)) return r.data as T[];
  }
  return [];
}

export function mapStockItemFromApi(raw: Record<string, unknown>): StockItem {
  const systemQty = Number(raw.quantity ?? raw.systemQty ?? 0);
  const physicalQty = Number(raw.physicalQty ?? raw.reportedQty ?? systemQty);
  const { variance, variancePercent, status } = computeVariance(systemQty, physicalQty);
  const sku = String(raw.sku ?? '');
  return {
    id: String(raw._id ?? raw.id ?? sku),
    sku,
    product: String(raw.name ?? raw.product ?? (raw.productName ?? sku) || 'Item'),
    batchId: String((raw.batchId ?? sku) || '—'),
    warehouse: String(raw.location ?? raw.warehouse ?? 'Chennai Hub'),
    systemQty,
    physicalQty,
    unit: String(raw.unit ?? 'units'),
    variance,
    variancePercent,
    status,
  };
}

export function mapAgingAlertFromApi(raw: Record<string, unknown>, vendorName = '—'): AgingAlert {
  const expiry =
    raw.expiryDate != null ? new Date(String(raw.expiryDate)).toLocaleDateString() : '—';
  const daysToExpiry =
    typeof raw.daysToExpiry === 'number'
      ? raw.daysToExpiry
      : raw.expiryDate
        ? Math.max(0, Math.ceil((new Date(String(raw.expiryDate)).getTime() - Date.now()) / 86400000))
        : 0;
  return {
    id: String(raw._id ?? raw.id ?? raw.alertId ?? ''),
    product: String(raw.productName ?? raw.title ?? raw.product ?? 'Product'),
    batchId: String(raw.batchId ?? raw.alertId ?? '—'),
    vendor: vendorName,
    expiryDate: expiry,
    daysToExpiry,
    priority: mapSeverityToPriority(raw.severity ?? raw.priority),
    quantity: Number(raw.quantity ?? 0),
    unit: String(raw.unit ?? 'units'),
    value: Number(raw.value ?? 0),
    acknowledged: Boolean(raw.acknowledged),
    vendorId: raw.vendorId != null ? String(raw.vendorId) : undefined,
    inventoryItemId: raw.inventoryItemId != null ? String(raw.inventoryItemId) : undefined,
    agingDays: raw.agingDays != null ? Number(raw.agingDays) : undefined,
    message: raw.message != null ? String(raw.message) : undefined,
    source: raw.source != null ? String(raw.source) : undefined,
  };
}

export function mapAgingInventoryFromApi(raw: Record<string, unknown>): AgingInventory {
  const expiry =
    raw.expiryDate != null ? new Date(String(raw.expiryDate)).toLocaleDateString() : '—';
  const daysToExpiry =
    typeof raw.daysToExpiry === 'number'
      ? raw.daysToExpiry
      : raw.expiryDate
        ? Math.ceil((new Date(String(raw.expiryDate)).getTime() - Date.now()) / 86400000)
        : 0;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    sku: String(raw.sku ?? ''),
    product: String(raw.product ?? raw.name ?? raw.sku ?? 'Item'),
    batchId: String(raw.batchId ?? raw.sku ?? '—'),
    warehouse: String(raw.warehouse ?? raw.location ?? '—'),
    quantity: Number(raw.quantity ?? 0),
    unit: String(raw.unit ?? 'units'),
    daysInStock: Number(raw.daysInStock ?? raw.agingDays ?? 0),
    expiryDate: expiry,
    daysToExpiry,
    status: String(raw.status ?? 'Safe'),
  };
}

export function mapStockoutFromApi(raw: Record<string, unknown>, vendorName = '—'): Stockout {
  const sev = String(raw.priority ?? raw.severity ?? 'High');
  let severity: StockoutSeverity = 'High';
  if (sev.toLowerCase().includes('crit')) severity = 'Critical';
  else if (sev.toLowerCase().includes('med')) severity = 'Medium';
  const last = raw.lastStockDate ?? raw.lastUpdated ?? raw.lastStock;
  const lastStock = last != null ? new Date(String(last)).toLocaleDateString() : '—';
  return {
    id: String(raw._id ?? raw.id ?? ''),
    sku: String(raw.sku ?? ''),
    product: String(raw.product ?? raw.name ?? raw.sku ?? 'Item'),
    vendor: String(raw.vendor ?? vendorName),
    lastStock,
    daysOut: Number(raw.daysOutOfStock ?? raw.daysOut ?? 0),
    affectedStores: Number(raw.affectedStores ?? 1),
    impact: Number(raw.impact ?? raw.estimatedImpact ?? 0),
    severity,
  };
}

export function mapKpiFromApi(raw: Record<string, unknown>): InventoryKPI {
  return {
    id: String(raw.id ?? ''),
    label: String(raw.label ?? ''),
    value: String(raw.value ?? '0'),
    trend: String(raw.trend ?? ''),
    trendValue: String(raw.trendValue ?? ''),
    trendDirection: (raw.trendDirection as InventoryKPI['trendDirection']) ?? 'stable',
    status: (raw.status as InventoryKPI['status']) ?? 'good',
    color: String(raw.color ?? '#6B7280'),
    bgColor: String(raw.bgColor ?? '#F3F4F6'),
    subMetrics: Array.isArray(raw.subMetrics) ? (raw.subMetrics as { label: string; value: string }[]) : [],
  };
}
