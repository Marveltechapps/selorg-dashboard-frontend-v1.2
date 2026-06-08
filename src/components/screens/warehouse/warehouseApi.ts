import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  const err = await response.json().catch(() => ({} as any));
  const details = err?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const fieldMsgs = details
      .map((d: { field?: string; message?: string }) =>
        d.field ? `${d.field}: ${d.message}` : d.message
      )
      .filter(Boolean)
      .join('; ');
    if (fieldMsgs) return new Error(fieldMsgs);
  }
  const message =
    (typeof err?.message === 'string' && err.message) ||
    (typeof err?.error === 'string' && err.error) ||
    (typeof err?.error?.message === 'string' && err.error.message) ||
    fallbackMessage;
  return new Error(message);
}

/** Normalize `{ success, data }` and legacy bare payloads. */
function extractPayload<T>(result: unknown): T {
  if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>)) {
    return (result as { data: T }).data;
  }
  return result as T;
}

function extractList(result: unknown): unknown[] {
  const payload = extractPayload<unknown>(result);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['items', 'rows', 'list', 'checks', 'roster']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}
export interface WarehouseMetrics {
  inboundQueue: number;
  outboundQueue: number;
  inventoryHealth: number;
  criticalAlerts: number;
  capacityUtilization: {
    bins: number;
    coldStorage: number;
    stage?: number;
    ambient: number;
  };
}

export interface PicklistFlow {
  id: string;
  orderId: string;
  customer: string;
  items: number;
  priority: string;
  status: string;
  zone: string;
  updatedAt?: string;
}

const DEFAULT_METRICS: WarehouseMetrics = {
  inboundQueue: 0,
  outboundQueue: 0,
  inventoryHealth: 0,
  criticalAlerts: 0,
  capacityUtilization: { bins: 0, coldStorage: 0, stage: 0, ambient: 0 },
};

export async function fetchWarehouseMetrics(): Promise<WarehouseMetrics> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.metrics}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch warehouse metrics');
  const result = await response.json();
  const data = extractPayload<WarehouseMetrics>(result);
  if (!data || typeof data !== 'object' || !('inboundQueue' in data)) return DEFAULT_METRICS;
  return data;
}

export async function fetchOrderFlow(): Promise<PicklistFlow[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.orderFlow}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch order flow');
  const result = await response.json();
  const data = extractList(result);
  return data.map((entry: any, index: number) => ({
    id: entry.id ?? entry.orderId ?? entry.order_id ?? `flow-${index}`,
    orderId: entry.orderId ?? entry.order_id ?? entry.id ?? `N/A-${index + 1}`,
    customer: entry.customer ?? entry.customerName ?? entry.customer_name ?? '',
    items: Number.isFinite(Number(entry.items))
      ? Number(entry.items)
      : (Array.isArray(entry.items) ? entry.items.length : 0),
    priority: entry.priority ?? 'standard',
    status: entry.status ?? 'pending',
    zone: entry.zone ?? 'General',
    updatedAt: entry.updatedAt,
  }));
}

export interface WarehouseDailyReport {
  date: string;
  stats: {
    totalGRNsProcessed: number;
    totalOrdersPicked: number;
    totalItemsAdjusted: number;
    qcPassRate: string;
    activeStaff: number;
  };
  topPerformers: { name: string; tasks: number }[];
}

export interface WarehouseOperationsView {
  lastUpdate: string;
  operationalStatus: 'healthy' | 'warning' | 'critical';
  statusMessage: string;
  metrics: WarehouseMetrics;
  orderFlow: {
    total: number;
    byStatus: { picking: number; pending: number; dispatching: number };
    recent: PicklistFlow[];
  };
  zones: { id: string; name: string; utilization: number; total: number; occupied: number }[];
  equipmentStatus: Record<string, { total: number; active: number; maintenance: number }>;
  openExceptions: number;
  activeStaff: number;
}

export async function fetchDailyReport(date?: string): Promise<WarehouseDailyReport> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.dailyReport}${query}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch daily report');
  const result = await response.json();
  return extractPayload<WarehouseDailyReport>(result);
}

export async function fetchOperationsView(): Promise<WarehouseOperationsView> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.operationsView}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch operations view');
  const result = await response.json();
  const data = extractPayload<WarehouseOperationsView>(result);
  if (
    !data ||
    typeof data !== 'object' ||
    !data.metrics ||
    typeof data.metrics.inboundQueue !== 'number' ||
    !data.orderFlow ||
    typeof data.orderFlow.total !== 'number'
  ) {
    throw new Error('Invalid operations view data from server');
  }
  return {
    ...data,
    zones: Array.isArray(data.zones) ? data.zones : [],
    equipmentStatus: data.equipmentStatus && typeof data.equipmentStatus === 'object' ? data.equipmentStatus : {},
    orderFlow: {
      ...data.orderFlow,
      recent: Array.isArray(data.orderFlow.recent)
        ? data.orderFlow.recent.map((o, i) => ({
            id: o.id ?? o.orderId ?? `flow-${i}`,
            orderId: o.orderId ?? '—',
            customer: o.customer ?? '',
            items: Number.isFinite(Number(o.items)) ? Number(o.items) : 0,
            priority: o.priority ?? 'standard',
            status: o.status ?? 'pending',
            zone: o.zone ?? '',
          }))
        : [],
      byStatus: {
        pending: data.orderFlow.byStatus?.pending ?? 0,
        picking: data.orderFlow.byStatus?.picking ?? 0,
        dispatching: data.orderFlow.byStatus?.dispatching ?? 0,
      },
    },
  };
}

export function downloadDailyReportCsv(report: WarehouseDailyReport): void {
  const rows: (string | number)[][] = [
    ['Warehouse Daily Report', `Date: ${report.date}`],
    [''],
    ['Metric', 'Value'],
    ['GRNs Processed', report.stats.totalGRNsProcessed],
    ['Orders Picked', report.stats.totalOrdersPicked],
    ['Inventory Adjustments', report.stats.totalItemsAdjusted],
    ['QC Pass Rate', report.stats.qcPassRate],
    ['Active Staff', report.stats.activeStaff],
    [''],
    ['Top Performers', 'Tasks Completed'],
    ...report.topPerformers.map((p) => [p.name || 'Unknown', p.tasks ?? 0]),
  ];
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `warehouse-daily-report-${report.date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function downloadOperationsViewCsv(view: WarehouseOperationsView): void {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString();
  const m = view.metrics;
  const rows: (string | number)[][] = [
    ['Warehouse Operations View', `Date: ${today}`, `Time: ${time}`],
    ['Status', view.operationalStatus, view.statusMessage],
    [''],
    ['=== LIVE METRICS ==='],
    ['Inbound Queue', m.inboundQueue],
    ['Outbound Queue', m.outboundQueue],
    ['Inventory Health', `${m.inventoryHealth}%`],
    ['Critical Alerts', m.criticalAlerts],
    ['Open Exceptions', view.openExceptions],
    ['Active Staff', view.activeStaff],
    [''],
    ['=== ORDER FLOW ==='],
    ['Total Active', view.orderFlow.total],
    ['Picking', view.orderFlow.byStatus.picking],
    ['Pending', view.orderFlow.byStatus.pending],
    ['Dispatching', view.orderFlow.byStatus.dispatching],
    [''],
    ['Order ID', 'Destination', 'Status', 'Items'],
    ...view.orderFlow.recent.map((o) => [o.orderId, o.customer, o.status, o.items]),
    [''],
    ['=== ZONE UTILIZATION ==='],
    ['Zone', 'Utilization %', 'Occupied', 'Total'],
    ...view.zones.map((z) => [z.name, z.utilization, z.occupied, z.total]),
  ];
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `warehouse-operations-view-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function fetchWarehouseAnalytics(): Promise<any> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.analytics}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch warehouse analytics');
  const result = await response.json();
  const data = result.data ?? result;
  if (!data || typeof data !== 'object') {
    return {
      weeklyData: [],
      storageData: [],
      inventoryData: [],
      metrics: {},
    };
  }
  const weeklyData = Array.isArray(data.weeklyData) ? data.weeklyData : [];
  const storageData = Array.isArray(data.storageData) ? data.storageData : [];
  const inventoryData = Array.isArray(data.inventoryData) ? data.inventoryData : [];
  const metrics = data.metrics && typeof data.metrics === 'object' ? data.metrics : {};
  return { weeklyData, storageData, inventoryData, metrics };
}

// --- Inbound Ops ---

export interface GRN {
  id: string;
  poNumber: string;
  vendor: string;
  status: 'pending' | 'in-progress' | 'discrepancy' | 'completed';
  timestamp: string;
  items?: number;
  dockId?: string;
}

export interface DockActiveGrn extends GRN {
  discrepancyNotes?: string;
  discrepancyType?: string;
}

export interface DockSlot {
  id: string;
  name: string;
  status: 'active' | 'empty' | 'offline';
  truck?: string;
  vendor?: string;
  eta?: string;
  grnId?: string;
  activeGrn?: DockActiveGrn | null;
}

export interface InboundSummary {
  pendingGRNs: number;
  inProgressGRNs: number;
  putawayPendingItems: number;
  putawayPendingGrns: number;
  dockTotal: number;
  dockActive: number;
  dockUtilizationPercent: number;
}

function normalizeGrnStatus(status: unknown): GRN['status'] {
  const s = String(status ?? 'pending').toLowerCase().replace(/_/g, '-');
  if (s === 'in_progress' || s === 'inprogress' || s === 'counting') return 'in-progress';
  if (s === 'discrepancy' || s === 'issue') return 'discrepancy';
  if (s === 'completed' || s === 'complete' || s === 'done') return 'completed';
  return 'pending';
}

function mapGrnFromApi(g: Record<string, unknown>): GRN {
  const businessId = typeof g.id === 'string' && g.id.trim() ? g.id.trim() : '';
  const fallbackId = g._id != null ? String(g._id) : '';
  const ts = g.timestamp ?? g.createdAt ?? g.updatedAt;
  return {
    id: businessId || fallbackId,
    poNumber: String(g.poNumber ?? ''),
    vendor: String(g.vendor ?? ''),
    status: normalizeGrnStatus(g.status),
    timestamp: ts
      ? (typeof ts === 'string' ? ts : new Date(ts as string | number | Date).toISOString())
      : new Date().toISOString(),
    items: Number(g.items ?? 0),
    dockId: typeof g.dockId === 'string' && g.dockId.trim() ? g.dockId.trim() : undefined,
  };
}

function mapDockActiveGrn(g: Record<string, unknown> | null | undefined): DockActiveGrn | null {
  if (!g || typeof g !== 'object' || !g.id) return null;
  const base = mapGrnFromApi(g);
  return {
    ...base,
    discrepancyNotes:
      typeof g.discrepancyNotes === 'string' ? g.discrepancyNotes : undefined,
    discrepancyType:
      typeof g.discrepancyType === 'string' ? g.discrepancyType : undefined,
  };
}

function mapDockFromApi(d: Record<string, unknown>): DockSlot {
  return {
    id: typeof d.id === 'string' && d.id.trim() ? d.id.trim() : String(d._id ?? ''),
    name: String(d.name ?? ''),
    status: (d.status === 'active' || d.status === 'offline' ? d.status : 'empty') as DockSlot['status'],
    truck: d.truck != null ? String(d.truck) : undefined,
    vendor: d.vendor != null ? String(d.vendor) : undefined,
    eta: d.eta != null ? String(d.eta) : undefined,
    grnId: typeof d.grnId === 'string' && d.grnId.trim() ? d.grnId.trim() : undefined,
    activeGrn: mapDockActiveGrn(
      d.activeGrn && typeof d.activeGrn === 'object'
        ? (d.activeGrn as Record<string, unknown>)
        : undefined
    ),
  };
}

export async function fetchInboundSummary(): Promise<InboundSummary> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.summary}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch inbound summary');
  const result = await response.json();
  const data = extractPayload<InboundSummary>(result);
  return {
    pendingGRNs: data?.pendingGRNs ?? 0,
    inProgressGRNs: data?.inProgressGRNs ?? 0,
    putawayPendingItems: data?.putawayPendingItems ?? 0,
    putawayPendingGrns: data?.putawayPendingGrns ?? 0,
    dockTotal: data?.dockTotal ?? 0,
    dockActive: data?.dockActive ?? 0,
    dockUtilizationPercent: data?.dockUtilizationPercent ?? 0,
  };
}

export async function fetchGRNs(opts?: { queueOnly?: boolean }): Promise<GRN[]> {
  const qs = opts?.queueOnly ? '?limit=100&queueOnly=true' : '?limit=100';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.grns}${qs}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch GRNs');
  const result = await response.json();
  const list = extractList(result);
  return list.map((g) => mapGrnFromApi(g as Record<string, unknown>));
}

export async function fetchGRNById(id: string): Promise<GRN & { discrepancyNotes?: string; discrepancyType?: string }> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.grnById(encodeURIComponent(id))}`,
    { headers: authHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch GRN details');
  const result = await response.json();
  const g = extractPayload<Record<string, unknown>>(result);
  return {
    ...mapGrnFromApi(g),
    discrepancyNotes: typeof g.discrepancyNotes === 'string' ? g.discrepancyNotes : undefined,
    discrepancyType: typeof g.discrepancyType === 'string' ? g.discrepancyType : undefined,
  };
}

export async function createGRN(data: Partial<GRN>): Promise<GRN> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.createGrn}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to create GRN');
  const result = await response.json();
  const raw = extractPayload<Record<string, unknown>>(result);
  return mapGrnFromApi(raw && typeof raw === 'object' ? raw : {});
}

export async function startGRN(
  id: string,
  options?: { dockId?: string; truck?: string; eta?: string }
): Promise<{ grn: GRN; dock: DockSlot }> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.startGrn(encodeURIComponent(id))}`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify(options ?? {}) }
  );
  if (!response.ok) throw await parseApiError(response, 'Failed to start GRN');
  const result = await response.json();
  const data = extractPayload<{ grn?: Record<string, unknown>; dock?: Record<string, unknown> }>(result);
  return {
    grn: mapGrnFromApi(data?.grn && typeof data.grn === 'object' ? data.grn : {}),
    dock: mapDockFromApi(data?.dock && typeof data.dock === 'object' ? data.dock : {}),
  };
}

export async function completeGRN(id: string): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.completeGrn(encodeURIComponent(id))}`,
    { method: 'POST', headers: authHeaders() }
  );
  if (!response.ok) throw await parseApiError(response, 'Failed to complete GRN');
}

export async function logGRNDiscrepancy(id: string, data: { notes?: string; type?: string }): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.logDiscrepancy(encodeURIComponent(id))}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to log discrepancy');
}

/** Sort GRNs for the processing queue (active work first, completed last). */
export function sortGrnsForQueue(grns: GRN[]): GRN[] {
  const order: Record<GRN['status'], number> = {
    pending: 0,
    'in-progress': 1,
    discrepancy: 2,
    completed: 3,
  };
  return [...grns].sort((a, b) => {
    const oa = order[a.status] ?? 99;
    const ob = order[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (a.status === 'completed') return tb - ta;
    return ta - tb;
  });
}

export async function fetchDocks(): Promise<DockSlot[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.docks}?limit=50`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch docks');
  const result = await response.json();
  const list = extractList(result);
  return list.map((d) => mapDockFromApi(d as Record<string, unknown>));
}

export async function updateDock(
  id: string,
  data: Partial<Pick<DockSlot, 'status' | 'truck' | 'vendor' | 'eta'>>
): Promise<DockSlot> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.updateDock(encodeURIComponent(id))}`,
    { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }
  );
  if (!response.ok) throw await parseApiError(response, 'Failed to update dock');
  const result = await response.json();
  const d = extractPayload<Record<string, unknown>>(result);
  return mapDockFromApi(d && typeof d === 'object' ? d : { id });
}

export async function exportInboundGrnsCsv(): Promise<string> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.exportGrns}?limit=500`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to export GRNs');
  const result = await response.json();
  const data = extractPayload<{ csv?: string }>(result);
  return typeof data?.csv === 'string' ? data.csv : '';
}

// --- Outbound Ops ---

export interface PickerAssignment {
  id: string;
  pickerId?: string;
  pickerName?: string;
  name?: string;
  status: string;
  currentOrders?: number;
  activeOrders?: number;
  completedToday?: number;
  pickRate?: number;
  zone?: string;
}

export interface PicklistOrder {
  id: string;
  orderId: string;
  customer: string;
  items: number;
  priority: 'urgent' | 'high' | 'standard';
  status: 'pending' | 'assigned' | 'picking' | 'completed';
  picker?: string;
  zone?: string;
}

export interface BatchOrder {
  id: string;
  batchId: string;
  orderCount: number;
  totalItems: number;
  picker: string;
  status: 'preparing' | 'picking' | 'completed';
  progress: number;
}

export interface MultiOrderPick {
  id: string;
  pickId: string;
  orders: string[];
  sku: string;
  productName: string;
  location: string;
  totalQty: number;
  pickedQty: number;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface RouteOptimization {
  id: string;
  routeId: string;
  picker: string;
  stops: number;
  distance: string;
  estimatedTime: string;
  status: 'planned' | 'active' | 'completed';
  efficiency: number;
}

// ... Outbound Ops Functions ...

function normalizePicklistOrder(raw: unknown, index: number): PicklistOrder {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items = Number(p.items);
  const itemCount = Number.isFinite(items) && items > 0
    ? items
    : Number(p.items_count) || 0;
  const priorityRaw = String(p.priority ?? 'standard').toLowerCase();
  const priority: PicklistOrder['priority'] =
    priorityRaw === 'urgent' || priorityRaw === 'high' ? 'urgent'
    : priorityRaw === 'medium' ? 'high'
    : 'standard';
  const statusRaw = String(p.status ?? 'pending').toLowerCase();
  const status: PicklistOrder['status'] =
    statusRaw === 'queued' ? 'pending'
    : statusRaw === 'inprogress' || statusRaw === 'in-progress' ? 'picking'
    : (['pending', 'assigned', 'picking', 'completed'].includes(statusRaw)
      ? statusRaw as PicklistOrder['status']
      : 'pending');

  return {
    id: String(p.id ?? p.picklist_id ?? `picklist-${index}`),
    orderId: String(p.orderId ?? p.order_id ?? p.id ?? ''),
    customer: String(p.customer ?? p.customerName ?? p.customer_name ?? '').trim(),
    items: itemCount,
    priority,
    status,
    picker: typeof p.picker === 'string' ? p.picker : (typeof p.picker_id === 'string' ? p.picker_id : undefined),
    zone: typeof p.zone === 'string' ? p.zone : undefined,
  };
}

export async function fetchPicklists(): Promise<PicklistOrder[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.picklists}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch picklists');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list.map(normalizePicklistOrder) : [];
}

export async function assignPickerToOrder(id: string, pickerName: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.assignPicker(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ pickerName, pickerId: pickerName })
  });
  if (!response.ok) throw new Error('Failed to assign picker');
}

export async function fetchPickers(): Promise<PickerAssignment[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.pickers}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch pickers');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((p: any) => {
    const activeOrders = p.activeOrders ?? p.currentOrders ?? 0;
    const rawStatus = (p.status ?? 'ACTIVE').toString().toLowerCase();
    const status = rawStatus === 'active' ? (activeOrders > 0 ? 'busy' : 'available') : rawStatus;
    return {
      id: p.pickerId ?? p.id,
      pickerId: p.pickerId ?? p.id,
      pickerName: p.pickerName ?? p.name,
      status,
      activeOrders,
      completedToday: p.completedToday ?? 0,
      pickRate: p.pickRate ?? 0,
      zone: p.zone ?? 'Main Zone',
    };
  });
}

export async function fetchBatches(): Promise<BatchOrder[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.batches}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch batches');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((b: any) => ({
    id: b.id ?? b.batchId,
    batchId: b.batchId ?? b.id,
    orderCount: b.orderCount ?? 0,
    totalItems: b.totalItems ?? b.itemCount ?? 0,
    picker: b.picker ?? b.pickerId ?? 'Unassigned',
    status: b.status === 'in-progress' ? 'picking' : b.status === 'pending' ? 'preparing' : b.status ?? 'preparing',
    progress: b.progress ?? 0,
  }));
}

export async function createBatch(data: any): Promise<BatchOrder> {
  const payload = {
    zone: data?.zone ?? 'Zone A',
    status: 'pending',
    ...data,
  };
  if (payload.status === 'preparing') payload.status = 'pending';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.batches}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to create batch');
  const result = await response.json();
  const batch = result.data ?? result;
  return {
    id: batch.id ?? batch.batchId,
    batchId: batch.batchId ?? batch.id,
    orderCount: batch.orderCount ?? (batch.orders?.length ?? 0),
    totalItems: batch.totalItems ?? batch.itemCount ?? 0,
    picker: batch.picker ?? batch.pickerId ?? 'Unassigned',
    status: batch.status === 'pending' ? 'preparing' : batch.status === 'in-progress' ? 'picking' : batch.status ?? 'preparing',
    progress: batch.progress ?? 0,
  };
}

// ... Inventory & Storage Functions ...

export async function createCycleCount(data: Partial<CycleCount>): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.createCycleCount}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create cycle count');
}

export async function fetchMultiOrderPicks(): Promise<MultiOrderPick[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.consolidatedPicks}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch multi-order picks');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((m: any) => ({
    id: m.id ?? m.pickId ?? `m-${Date.now()}`,
    pickId: m.pickId ?? m.id,
    orders: Array.isArray(m.orders) ? m.orders : [],
    sku: m.sku ?? '',
    productName: m.productName ?? m.product ?? '',
    location: m.location ?? m.zone ?? '',
    totalQty: m.totalQty ?? m.totalQuantity ?? 0,
    pickedQty: m.pickedQty ?? m.pickedQuantity ?? 0,
    status: m.status ?? 'pending',
  }));
}

export async function fetchRoutes(): Promise<RouteOptimization[]> {
  const path = API_ENDPOINTS.outbound.routesActive ?? '/warehouse/outbound/routes/active/map';
  const response = await fetch(`${API_CONFIG.baseURL}${path}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch routes');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((r: any) => ({
    id: r.id ?? r.routeId,
    routeId: r.routeId ?? r.id,
    picker: r.picker ?? 'Unassigned',
    stops: r.stops ?? 0,
    distance: r.distance ?? '0m',
    estimatedTime: r.estimatedTime ?? '0 mins',
    status: r.status ?? 'planned',
    efficiency: r.efficiency ?? 0,
  }));
}

export async function optimizeRoute(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.routeMap(id)}`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error('Failed to optimize route');
}

// --- Inventory & Storage ---

export interface StorageLocation {
  id: string;
  aisle: string;
  rack: number;
  shelf?: number;
  zone?: string;
  status: 'occupied' | 'empty' | 'restricted';
  sku?: string;
  quantity?: number;
}

export interface InventorySummary {
  totalBins: number;
  occupiedBins: number;
  totalSKUs: number;
  stockValue: number;
  cycleCountsInProgress: number;
  highPriorityAlerts: number;
}

export interface InventoryMetaStaff {
  id: string;
  name: string;
  role: string;
  zone?: string | null;
  status?: string;
}

export interface InventoryMetaZone {
  id: string;
  name: string;
  code?: string | null;
}

export interface InventoryMeta {
  zones: InventoryMetaZone[];
  staff: InventoryMetaStaff[];
  adjustmentTypes: string[];
}

function formatDateValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function formatTimestamp(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeStorageLocation(raw: Record<string, unknown>): StorageLocation {
  const aisle = String(raw.aisle ?? raw.zone ?? '');
  const rack = typeof raw.rack === 'number' ? raw.rack : parseInt(String(raw.rack ?? '1'), 10) || 1;
  const shelf = typeof raw.shelf === 'number' ? raw.shelf : parseInt(String(raw.shelf ?? '1'), 10) || 1;
  const id =
    (typeof raw.id === 'string' && raw.id.trim()) ||
    `${aisle}-${String(rack).padStart(2, '0')}-${String(shelf).padStart(2, '0')}`;
  const statusRaw = String(raw.status ?? 'empty').toLowerCase();
  const status: StorageLocation['status'] =
    statusRaw === 'occupied' || statusRaw === 'restricted' ? statusRaw : 'empty';

  return {
    id,
    aisle,
    rack,
    shelf,
    zone: typeof raw.zone === 'string' ? raw.zone : undefined,
    status,
    sku: typeof raw.sku === 'string' && raw.sku.trim() ? raw.sku : undefined,
    quantity: typeof raw.quantity === 'number' ? raw.quantity : undefined,
  };
}

function normalizeInventoryItem(raw: Record<string, unknown>): InventoryItem {
  return {
    id: String(raw.id ?? raw._id ?? raw.sku ?? ''),
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? raw.name ?? raw.sku ?? 'Unknown'),
    category: String(raw.category ?? 'General'),
    currentStock: typeof raw.currentStock === 'number' ? raw.currentStock : 0,
    minStock: typeof raw.minStock === 'number' ? raw.minStock : 0,
    maxStock: typeof raw.maxStock === 'number' ? raw.maxStock : 0,
    location: String(raw.location ?? '—'),
    lastUpdated: formatTimestamp(raw.lastUpdated ?? raw.updatedAt),
    value: typeof raw.value === 'number' ? raw.value : 0,
  };
}

function normalizeAdjustment(raw: Record<string, unknown>): Adjustment {
  return {
    id: String(raw.id ?? raw._id ?? ''),
    type: String(raw.type ?? 'Manual Correction'),
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? raw.sku ?? ''),
    change: typeof raw.change === 'number' ? raw.change : 0,
    reason: String(raw.reason ?? ''),
    user: String(raw.user ?? 'System'),
    timestamp: formatTimestamp(raw.timestamp ?? raw.createdAt),
  };
}

function normalizeCycleCount(raw: Record<string, unknown>): CycleCount {
  const statusRaw = String(raw.status ?? 'scheduled').toLowerCase().replace('_', '-');
  const status: CycleCount['status'] =
    statusRaw === 'in-progress' || statusRaw === 'inprogress'
      ? 'in-progress'
      : statusRaw === 'completed'
        ? 'completed'
        : 'scheduled';

  return {
    id: String(raw.id ?? raw._id ?? raw.countId ?? ''),
    countId: String(raw.countId ?? raw.id ?? ''),
    zone: String(raw.zone ?? ''),
    assignedTo: String(raw.assignedTo ?? ''),
    scheduledDate: formatDateValue(raw.scheduledDate),
    status,
    itemsTotal: typeof raw.itemsTotal === 'number' ? raw.itemsTotal : 0,
    itemsCounted: typeof raw.itemsCounted === 'number' ? raw.itemsCounted : 0,
    discrepancies: typeof raw.discrepancies === 'number' ? raw.discrepancies : 0,
  };
}

function normalizeInternalTransfer(raw: Record<string, unknown>): InternalTransfer {
  const statusRaw = String(raw.status ?? 'pending').toLowerCase().replace('_', '-');
  const status: InternalTransfer['status'] =
    statusRaw === 'in-transit' || statusRaw === 'intransit'
      ? 'in-transit'
      : statusRaw === 'completed'
        ? 'completed'
        : 'pending';

  return {
    id: String(raw.id ?? raw._id ?? raw.transferId ?? ''),
    transferId: String(raw.transferId ?? raw.id ?? ''),
    fromLocation: String(raw.fromLocation ?? ''),
    toLocation: String(raw.toLocation ?? ''),
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? raw.sku ?? ''),
    quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
    status,
    initiatedBy: String(raw.initiatedBy ?? 'System'),
    timestamp: formatTimestamp(raw.timestamp ?? raw.createdAt),
  };
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.summary}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch inventory summary');
  const result = await response.json();
  const data = extractPayload<InventorySummary>(result);
  return {
    totalBins: data?.totalBins ?? 0,
    occupiedBins: data?.occupiedBins ?? 0,
    totalSKUs: data?.totalSKUs ?? 0,
    stockValue: data?.stockValue ?? 0,
    cycleCountsInProgress: data?.cycleCountsInProgress ?? 0,
    highPriorityAlerts: data?.highPriorityAlerts ?? 0,
  };
}

function normalizeInventoryMetaZone(raw: unknown): InventoryMetaZone | null {
  if (typeof raw === 'string' && raw.trim()) {
    const name = raw.trim();
    return { id: name, name };
  }
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  const name = typeof z.name === 'string' ? z.name.trim() : '';
  if (!name) return null;
  const id =
    (typeof z.id === 'string' && z.id.trim()) ||
    (typeof z._id === 'string' && z._id.trim()) ||
    name;
  return {
    id,
    name,
    code: typeof z.code === 'string' ? z.code : null,
  };
}

export async function fetchInventoryMeta(): Promise<InventoryMeta> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.meta}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch inventory metadata');
  const result = await response.json();
  const data = extractPayload<InventoryMeta>(result);
  const zones = Array.isArray(data?.zones)
    ? data.zones.map(normalizeInventoryMetaZone).filter((z): z is InventoryMetaZone => z != null)
    : [];
  return {
    zones,
    staff: Array.isArray(data?.staff) ? data.staff : [],
    adjustmentTypes: Array.isArray(data?.adjustmentTypes) ? data.adjustmentTypes : [],
  };
}

export async function createReorderRequest(data: {
  sku: string;
  quantity: number;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  alertId?: string;
  productName?: string;
}): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.createReorder}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to create reorder request');
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  location: string;
  lastUpdated: string;
  value: number;
}

export interface Adjustment {
  id: string;
  type: string;
  sku: string;
  productName: string;
  change: number;
  reason: string;
  user: string;
  timestamp: string;
}

export interface CycleCount {
  id: string;
  countId: string;
  zone: string;
  assignedTo: string;
  scheduledDate: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  itemsTotal: number;
  itemsCounted: number;
  discrepancies: number;
}

export interface InternalTransfer {
  id: string;
  transferId: string;
  fromLocation: string;
  toLocation: string;
  sku: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'in-transit' | 'completed';
  initiatedBy: string;
  timestamp: string;
}

export interface StockAlert {
  id: string;
  type: 'low-stock' | 'overstock' | 'expiring' | 'out-of-stock';
  sku: string;
  productName: string;
  currentLevel: number;
  threshold: number;
  priority: 'high' | 'medium' | 'low';
}

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.items}?limit=500`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch inventory items');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeInventoryItem(item as Record<string, unknown>));
}

export async function fetchStorageLocations(): Promise<StorageLocation[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.locations}?limit=500`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch storage locations');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeStorageLocation(item as Record<string, unknown>));
}

export async function fetchAdjustments(): Promise<Adjustment[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.adjustments}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch adjustments');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeAdjustment(item as Record<string, unknown>));
}

export async function createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.createAdjustment}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create adjustment');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function fetchCycleCounts(): Promise<CycleCount[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.cycleCounts}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch cycle counts');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeCycleCount(item as Record<string, unknown>));
}

export async function startCycleCount(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.startCycleCount(id)}`, { method: 'PUT', headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to start cycle count');
}

export async function completeCycleCount(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.completeCycleCount(id)}`, { method: 'PUT', headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to complete cycle count');
}

export async function fetchInternalTransfers(): Promise<InternalTransfer[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.transfers}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch internal transfers');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeInternalTransfer(item as Record<string, unknown>));
}

export async function createInternalTransfer(data: Partial<InternalTransfer>): Promise<InternalTransfer> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.createTransfer}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create internal transfer');
  const result = await response.json();
  return result.data ?? result;
}

export async function updateTransferStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.updateTransferStatus(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update transfer status');
}

function normalizeStockAlert(raw: Record<string, unknown>): StockAlert {
  const severity = typeof raw.severity === 'string' ? raw.severity : undefined;
  const priorityRaw = typeof raw.priority === 'string' ? raw.priority : undefined;
  const priority: StockAlert['priority'] =
    priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
      ? priorityRaw
      : severity === 'critical'
        ? 'high'
        : severity === 'warning'
          ? 'medium'
          : 'low';

  const currentLevel =
    typeof raw.currentLevel === 'number'
      ? raw.currentLevel
      : typeof raw.current_count === 'number'
        ? raw.current_count
        : typeof raw.currentStock === 'number'
          ? raw.currentStock
          : 0;

  const threshold = typeof raw.threshold === 'number' ? raw.threshold : 0;
  const typeRaw = typeof raw.type === 'string' ? raw.type : undefined;
  const type: StockAlert['type'] =
    typeRaw === 'low-stock' ||
    typeRaw === 'overstock' ||
    typeRaw === 'expiring' ||
    typeRaw === 'out-of-stock'
      ? typeRaw
      : currentLevel === 0
        ? 'out-of-stock'
        : currentLevel < threshold
          ? 'low-stock'
          : 'overstock';

  return {
    id: String(raw.id ?? raw._id ?? raw.sku ?? ''),
    type,
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? raw.item_name ?? raw.name ?? raw.sku ?? 'Unknown'),
    currentLevel,
    threshold,
    priority,
  };
}

export async function fetchStockAlerts(): Promise<StockAlert[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.alerts}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch stock alerts');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => normalizeStockAlert(item as Record<string, unknown>));
}

// --- Inter-Warehouse Transfers ---

export interface WarehouseTransfer {
  id: string;
  transferId: string;
  destination: string;
  status: 'en-route' | 'loading' | 'pending' | 'completed';
  distance?: string;
  eta?: string;
  progress?: number;
  items?: number;
}

export async function fetchWarehouseTransfers(bypassCache = false): Promise<WarehouseTransfer[]> {
  const query = bypassCache ? `?t=${Date.now()}` : '';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.transfers.list}${query}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch transfers');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
}

export async function createWarehouseTransfer(data: Partial<WarehouseTransfer>): Promise<any> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.transfers.create}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to create transfer');
  return await response.json();
}

export async function updateWarehouseTransferStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.transfers.updateStatus(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to update transfer status');
}

// --- QC & Compliance ---

export interface QCInspection {
  id: string;
  inspectionId: string;
  batchId: string;
  productName: string;
  inspector: string;
  date: string;
  status: 'passed' | 'failed' | 'pending';
  score: number;
  itemsInspected: number;
  defectsFound: number;
}

export interface TemperatureLog {
  id: string;
  zone: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface ComplianceDoc {
  id: string;
  docId: string;
  docName: string;
  type: string;
  issuedDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring-soon' | 'expired';
}

export interface SampleTest {
  id: string;
  sampleId: string;
  batchId: string;
  productName: string;
  testType: string;
  result: 'pass' | 'fail' | 'pending';
  testedBy: string;
  date: string;
}

export interface Rejection {
  id: string;
  batch: string;
  reason: string;
  items: number;
  timestamp: string;
  inspector: string;
  severity: 'critical' | 'high' | 'medium';
}

function normalizeQCInspection(raw: unknown, index: number): QCInspection {
  const i = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const statusRaw = String(i.status ?? 'pending').toLowerCase();
  const status: QCInspection['status'] =
    statusRaw === 'passed' || statusRaw === 'failed' || statusRaw === 'pending'
      ? statusRaw
      : 'pending';

  return {
    id: String(i.id ?? i.inspection_id ?? `inspection-${index}`),
    inspectionId: String(i.inspectionId ?? i.inspection_id ?? i.id ?? ''),
    batchId: String(i.batchId ?? i.batch_id ?? ''),
    productName: String(i.productName ?? i.product_name ?? i.check_type ?? ''),
    inspector: String(i.inspector ?? 'System'),
    date: String(i.date ?? '').split('T')[0] || new Date().toISOString().split('T')[0],
    status,
    score: Number(i.score) || 0,
    itemsInspected: Number(i.itemsInspected ?? i.items_inspected) || 0,
    defectsFound: Number(i.defectsFound ?? i.defects_found) || 0,
  };
}

export async function fetchQCInspections(): Promise<QCInspection[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.inspections}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch inspections');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list.map(normalizeQCInspection) : [];
}

export async function createQCInspection(data: Partial<QCInspection>): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.createInspection}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create inspection');
}

export async function fetchTemperatureLogs(): Promise<TemperatureLog[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.temperatureLogs}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch temperature logs');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
}

export async function createTemperatureLog(data: Partial<TemperatureLog>): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.createTempLog}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to create temperature log');
}

export async function fetchQCRejections(): Promise<Rejection[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.logRejection}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch rejections');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
}

export async function logQCRejection(data: any): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.logRejection}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to log rejection');
}

export async function fetchComplianceDocs(): Promise<ComplianceDoc[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.complianceDocs}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch compliance docs');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list.map(normalizeComplianceDoc) : [];
}

function normalizeSampleResult(raw: unknown): SampleTest['result'] {
  const value = String(raw ?? 'pending').toLowerCase();
  if (value === 'pass' || value === 'passed') return 'pass';
  if (value === 'fail' || value === 'failed') return 'fail';
  return 'pending';
}

function normalizeSampleTest(raw: unknown, index: number): SampleTest {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const dateRaw = s.date ?? s.testDate ?? s.received_date ?? s.createdAt;
  const date =
    typeof dateRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : String(dateRaw ?? '').split('T')[0] || new Date().toISOString().split('T')[0];

  return {
    id: String(s.id ?? s.sample_id ?? `sample-${index}`),
    sampleId: String(s.sampleId ?? s.sample_id ?? s.id ?? ''),
    batchId: String(s.batchId ?? s.batch_id ?? ''),
    productName: String(s.productName ?? s.product_name ?? ''),
    testType: String(s.testType ?? s.test_type ?? ''),
    result: normalizeSampleResult(s.result),
    testedBy: String(s.testedBy ?? s.tested_by ?? s.tester ?? 'System'),
    date,
  };
}

function normalizeComplianceDocStatus(raw: unknown): ComplianceDoc['status'] {
  const value = String(raw ?? 'valid').toLowerCase();
  if (value === 'active' || value === 'valid') return 'valid';
  if (value === 'expiring-soon' || value === 'expiring_soon' || value === 'expiring soon' || value === 'pending') {
    return 'expiring-soon';
  }
  if (value === 'expired') return 'expired';
  return 'valid';
}

function normalizeComplianceDoc(raw: unknown, index: number): ComplianceDoc {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const issuedRaw = d.issuedDate ?? d.issued_date ?? d.createdAt;
  const expiryRaw = d.expiryDate ?? d.expiry_date;
  const issuedDate =
    typeof issuedRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(issuedRaw)
      ? issuedRaw
      : String(issuedRaw ?? '').split('T')[0] || '—';
  const expiryDate =
    typeof expiryRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiryRaw)
      ? expiryRaw
      : String(expiryRaw ?? '').split('T')[0] || '—';

  return {
    id: String(d.id ?? d.doc_id ?? `doc-${index}`),
    docId: String(d.docId ?? d.doc_id ?? d.id ?? ''),
    docName: String(d.docName ?? d.doc_name ?? d.title ?? 'Untitled Document'),
    type: String(d.type ?? 'License'),
    issuedDate,
    expiryDate,
    status: normalizeComplianceDocStatus(d.status),
  };
}

export async function fetchSampleTests(): Promise<SampleTest[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.samples}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch samples');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list.map(normalizeSampleTest) : [];
}

export async function createSampleTest(data: Partial<SampleTest>): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.createSample}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create sample test');
}

export async function updateSampleTestResult(id: string, result: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.updateSample(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ result })
  });
  if (!response.ok) throw new Error('Failed to update sample test');
}

// Compliance Checks
export interface ComplianceCheck {
  id: string;
  name: string;
  completed: boolean;
  timestamp?: string;
  inspector?: string;
  category: string;
}

export async function fetchComplianceChecks(): Promise<ComplianceCheck[]> {
  const response = await fetch(`${API_CONFIG.baseURL}/warehouse/qc/checks`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch compliance checks');
  const result = await response.json();
  const list = extractList(result);
  return Array.isArray(list) ? (list as ComplianceCheck[]) : [];
}

export async function toggleComplianceCheck(id: string, completed: boolean): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}/warehouse/qc/checks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ completed })
  });
  if (!response.ok) throw new Error('Failed to toggle compliance check');
}

// --- Picker Shift Master & Roster ---

export interface PickerShift {
  id: string;
  name: string;
  site: string;
  siteId?: string;
  startTime?: string;
  endTime?: string;
  timeRange: string;
  capacity: number;
  breakDuration: number;
  status: string;
  assignedCount?: number;
}

export interface RosterEntry {
  date: string;
  shiftId: string;
  shiftName: string;
  site: string;
  timeRange: string;
  capacity: number;
  assignedPickers: { pickerId: string; name: string }[];
  emptySlots: number;
}

export async function fetchPickerShifts(params?: { site?: string; status?: string }): Promise<PickerShift[]> {
  const q = new URLSearchParams();
  if (params?.site) q.set('site', params.site);
  if (params?.status) q.set('status', params.status);
  const query = q.toString() ? `?${q.toString()}` : '';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.list}${query}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch picker shifts');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function createPickerShift(data: Partial<PickerShift>): Promise<PickerShift> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.create}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: data.name,
      site: data.site,
      siteId: data.siteId,
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity ?? 1,
      breakDuration: data.breakDuration ?? 0,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create shift');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function updatePickerShift(id: string, data: Partial<PickerShift>): Promise<PickerShift> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.update(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      name: data.name,
      site: data.site,
      siteId: data.siteId,
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
      breakDuration: data.breakDuration,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update shift');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function fetchPickerRoster(startDate: string, endDate: string): Promise<RosterEntry[]> {
  const q = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.roster}?${q}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch roster');
  const result = await response.json();
  const roster = result.data?.roster ?? result?.roster ?? [];
  return Array.isArray(roster) ? roster : [];
}

export interface PickerOption {
  id: string;
  name: string;
  phone?: string;
}

export async function fetchPickerUsers(): Promise<PickerOption[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.pickers}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch pickers');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function assignPickerToShift(shiftId: string, pickerId: string, date: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.assign(shiftId)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ pickerId, date }),
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to assign picker');
}

export async function reassignPickerToShift(
  shiftId: string,
  previousPickerId: string,
  newPickerId: string,
  date: string
): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerShifts.reassign(shiftId)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ previousPickerId, newPickerId, date }),
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to reassign picker');
}

// --- Workforce & Shifts ---

export interface Staff {
  id: string;
  name: string;
  role: string;
  shift: 'morning' | 'afternoon' | 'night';
  status: 'active' | 'break' | 'offline';
  productivity: number;
  email: string;
  phone: string;
  joinDate: string;
  hourlyRate: number;
}

export interface ShiftSchedule {
  id: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'night';
  staffAssigned: string[];
  requiredStaff: number;
  status: 'full' | 'understaffed' | 'overstaffed';
}

export interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  hoursWorked: number;
}

export interface Performance {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  weeklyTarget: number;
  weeklyActual: number;
  accuracy: number;
  avgSpeed: number;
  rating: number;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'sick' | 'casual' | 'emergency' | 'vacation';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface Training {
  id: string;
  trainingId: string;
  title: string;
  type: string;
  date: string;
  duration: string;
  instructor: string;
  enrolled: number;
  capacity: number;
  status: 'scheduled' | 'in-progress' | 'completed';
}

export async function fetchStaff(): Promise<Staff[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.staff}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch staff');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function addStaff(data: Partial<Staff>): Promise<Staff> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.staff}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to add staff');
  const result = await response.json();
  return result.data ?? result;
}

export async function fetchSchedules(): Promise<ShiftSchedule[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.schedule}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch schedules');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export interface LiveAttendance {
  id: string;
  userId: string;
  pickerName: string;
  shift: string;
  punchIn: string | null;
  punchOut: string | null;
  duration: number;
  lateByMinutes: number;
  overtimeMinutes: number;
  totalWorkedMinutes: number;
  status: 'ON_DUTY' | 'COMPLETED' | 'ON_BREAK' | 'ABSENT' | 'present';
}

export async function fetchLiveAttendance(params?: { date?: string; site?: string }): Promise<LiveAttendance[]> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.site) qs.set('site', params.site);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.attendance.live}${suffix}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch live attendance');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchAttendance(): Promise<Attendance[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.attendance}?limit=100`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch attendance');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchPerformance(): Promise<Performance[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.performance}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch performance');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.leaveRequests}?limit=100`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch leave requests');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function createLeaveRequest(data: Partial<LeaveRequest>): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.createLeaveRequest}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create leave request');
}

export async function updateLeaveStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.updateLeaveStatus(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update leave request status');
}

export async function createShiftSchedule(data: Partial<ShiftSchedule>): Promise<ShiftSchedule> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.createSchedule}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create shift schedule');
  const result = await response.json();
  return result.data ?? result;
}

export async function assignStaffToShift(id: string, staffIds: string[]): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.assignStaff(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ staffIds })
  });
  if (!response.ok) throw new Error('Failed to assign staff');
}

export async function fetchTrainings(): Promise<Training[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.trainings}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch trainings');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function addTraining(data: Partial<Training>): Promise<Training> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.trainings}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to create training');
  const result = await response.json();
  return result.data ?? result;
}

export async function logStaffAttendance(data: any): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.workforce.logAttendance}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to log attendance');
}

// --- Equipment & Assets ---

export interface Device {
  id: string;
  deviceId: string;
  user: string;
  battery: number;
  signal: 'strong' | 'good' | 'weak' | 'offline';
  status: 'active' | 'charging' | 'offline';
}

export interface Equipment {
  id: string;
  equipmentId: string;
  name: string;
  type: 'forklift' | 'pallet-jack' | 'crane';
  zone?: string;
  operator?: string;
  status: 'operational' | 'idle' | 'maintenance';
  issue?: string;
}

export async function fetchDevices(): Promise<Device[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.equipment.devices}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch devices');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchMachinery(): Promise<Equipment[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.equipment.machinery}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch machinery');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function addMachinery(data: Partial<Equipment>): Promise<Equipment> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.equipment.addMachinery}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await parseApiError(response, 'Failed to add machinery');
  const result = await response.json();
  return result.data ?? result;
}

export async function reportEquipmentIssue(id: string, data: any): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.equipment.reportIssue(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to report issue');
}

export async function resolveEquipmentIssue(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.equipment.resolveIssue(id)}`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error('Failed to resolve issue');
}

// --- Exceptions ---

export interface Exception {
  id: string;
  priority: 'critical' | 'medium' | 'low';
  category: 'inbound' | 'inventory' | 'outbound' | 'qc';
  title: string;
  description: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
}

export async function fetchExceptions(): Promise<Exception[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.exceptions.list}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch exceptions');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function reportException(data: Partial<Exception>): Promise<Exception> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.exceptions.report}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to report exception');
  const result = await response.json();
  const raw = result.data ?? result;
  return {
    id: raw.id ?? raw._id?.toString?.() ?? '',
    priority: raw.priority ?? 'medium',
    category: raw.category ?? 'inbound',
    title: raw.title ?? '',
    description: raw.description ?? '',
    timestamp: raw.timestamp ?? raw.reportedAt ?? raw.createdAt ? new Date(raw.reportedAt ?? raw.createdAt).toISOString() : new Date().toISOString(),
    status: raw.status ?? 'open',
  };
}

export async function updateExceptionStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.exceptions.updateStatus(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update status');
}

export async function rejectExceptionShipment(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.exceptions.rejectShipment(id)}`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error('Failed to reject shipment');
}

export async function acceptExceptionPartial(id: string, acceptedQuantity: number): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.exceptions.acceptPartial(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ acceptedQuantity })
  });
  if (!response.ok) throw new Error('Failed to accept partial shipment');
}

// --- Utilities ---

export async function fetchWarehouseZones(): Promise<string[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.utilities.zones}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch warehouse zones');
  const result = await response.json();
  const data = result.data ?? result ?? [];
  return Array.isArray(data) ? data : [];
}

export interface AccessLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

export async function fetchAccessLogs(): Promise<AccessLog[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.utilities.logs}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch access logs');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((l: any) => ({
    id: l.id ?? l._id?.toString() ?? '',
    user: l.user ?? '',
    action: l.action ?? '',
    details: l.details ?? '',
    timestamp: l.timestamp ?? '',
  }));
}

export async function bulkUploadSKUs(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const baseHeaders = authHeaders();
  const headers: Record<string, string> = {};
  if (baseHeaders.Authorization) headers.Authorization = baseHeaders.Authorization;
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.utilities.uploadSkus}`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to upload SKUs');
  }
  return await response.json();
}

export async function generateRackLabels(config: any): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.utilities.generateLabels}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to generate labels');
  }
}

export async function processBinReassignment(config: any): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.utilities.reassignBins}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      fromZone: config.fromZone,
      toZone: config.toZone,
      skuFilter: config.skuFilter || undefined,
    })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to process reassignment');
  }
}

// --- Picker Workforce Devices ---

export interface PickerDevice {
  id: string;
  deviceId: string;
  serial: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'REPAIR' | 'LOST';
  assignedPicker: { id: string; name: string } | null;
  assignedAt: string | null;
  lastReturnedAt: string | null;
  /** Condition at last return (good, fair, damaged) */
  condition?: string | null;
  /** Notes from picker at return */
  conditionNotes?: string | null;
  /** Photo URL of device condition at return */
  conditionPhotoUrl?: string | null;
}

export interface PickerDevicesFilters {
  status?: string;
  search?: string;
}

export async function fetchPickerDevices(filters?: PickerDevicesFilters): Promise<PickerDevice[]> {
  const q = new URLSearchParams();
  if (filters?.status) q.set('status', filters.status);
  if (filters?.search) q.set('search', filters.search);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerDevices.list}${suffix}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch devices');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function createPickerDevice(data: { deviceId: string; serial?: string }): Promise<PickerDevice> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerDevices.create}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create device');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function assignDevice(deviceId: string, pickerId: string): Promise<PickerDevice> {
  // deviceId here is the document id (MongoDB _id) for the PATCH URL
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerDevices.patch(deviceId)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'assign', pickerId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to assign device');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function returnDevice(deviceId: string): Promise<PickerDevice> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerDevices.patch(deviceId)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'return' }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to return device');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function markDeviceDamaged(deviceId: string, condition?: string): Promise<PickerDevice> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.pickerDevices.patch(deviceId)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'mark_damaged', condition }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to mark device damaged');
  }
  const result = await response.json();
  return result.data ?? result;
}

