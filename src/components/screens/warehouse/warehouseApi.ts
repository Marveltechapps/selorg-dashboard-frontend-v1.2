import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
export interface WarehouseMetrics {
  inboundQueue: number;
  outboundQueue: number;
  inventoryHealth: number;
  criticalAlerts: number;
  capacityUtilization: {
    bins: number;
    coldStorage: number;
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
  capacityUtilization: { bins: 0, coldStorage: 0, ambient: 0 },
};

export async function fetchWarehouseMetrics(): Promise<WarehouseMetrics> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.metrics}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch warehouse metrics');
  const result = await response.json();
  const data = result.data ?? result;
  if (!data || typeof data !== 'object' || !('inboundQueue' in data)) return DEFAULT_METRICS;
  return data;
}

export async function fetchOrderFlow(): Promise<PicklistFlow[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.warehouse.orderFlow}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch order flow');
  const result = await response.json();
  const data = result.data ?? result ?? [];
  return Array.isArray(data) ? data : [];
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
}

export interface DockSlot {
  id: string;
  name: string;
  status: 'active' | 'empty' | 'offline';
  truck?: string;
  vendor?: string;
  eta?: string;
}

export async function fetchGRNs(): Promise<GRN[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.grns}?limit=100`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch GRNs');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  const list = Array.isArray(arr) ? arr : [];
  return list.map((g: any) => ({
    id: g.id ?? g._id?.toString?.() ?? String(g._id),
    poNumber: g.poNumber ?? '',
    vendor: g.vendor ?? '',
    status: g.status ?? 'pending',
    timestamp: g.timestamp ? (typeof g.timestamp === 'string' ? g.timestamp : new Date(g.timestamp).toISOString()) : new Date().toISOString(),
    items: g.items ?? 0,
  }));
}

export async function createGRN(data: Partial<GRN>): Promise<GRN> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.createGrn}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create GRN');
  }
  const result = await response.json();
  return result.data ?? result;
}

export async function startGRN(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.startGrn(id)}`, { method: 'POST', headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to start GRN');
}

export async function completeGRN(id: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.completeGrn(id)}`, { method: 'POST', headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to complete GRN');
}

export async function logGRNDiscrepancy(id: string, data: { notes?: string; type?: string }): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.logDiscrepancy(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to log discrepancy');
  }
}

export async function fetchDocks(): Promise<DockSlot[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inbound.docks}?limit=50`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch docks');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  const list = Array.isArray(arr) ? arr : [];
  return list.map((d: any) => ({
    id: d.id ?? d._id?.toString?.() ?? String(d._id),
    name: d.name ?? '',
    status: d.status ?? 'empty',
    truck: d.truck,
    vendor: d.vendor,
    eta: d.eta,
  }));
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

export async function fetchPicklists(): Promise<PicklistOrder[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.outbound.picklists}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch picklists');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
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
    const rawStatus = (p.status ?? 'available').toString().toLowerCase();
    const status = rawStatus === 'break' ? 'break' : rawStatus === 'active' ? (activeOrders > 0 ? 'busy' : 'available') : (activeOrders > 0 ? 'busy' : 'available');
    return {
      id: p.id ?? p.pickerId,
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
  status: 'occupied' | 'empty' | 'restricted';
  sku?: string;
  quantity?: number;
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
  return Array.isArray(arr) ? arr : [];
}

export async function fetchStorageLocations(): Promise<StorageLocation[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.locations}?limit=100`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch storage locations');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchAdjustments(): Promise<Adjustment[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.adjustments}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch adjustments');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
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
  return Array.isArray(arr) ? arr : [];
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
  return Array.isArray(arr) ? arr : [];
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

export async function fetchStockAlerts(): Promise<StockAlert[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.inventory.alerts}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch stock alerts');
  const result = await response.json();
  const arr = result.data ?? result ?? [];
  return Array.isArray(arr) ? arr : [];
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

export async function fetchWarehouseTransfers(): Promise<WarehouseTransfer[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.transfers.list}`, { headers: authHeaders() });
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
  if (!response.ok) throw new Error('Failed to create transfer');
  return await response.json();
}

export async function updateWarehouseTransferStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.transfers.updateStatus(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update transfer status');
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

export async function fetchQCInspections(): Promise<QCInspection[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.inspections}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch inspections');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
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
  if (!response.ok) throw new Error('Failed to create temperature log');
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
  return Array.isArray(list) ? list : [];
}

export async function fetchSampleTests(): Promise<SampleTest[]> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.qc.samples}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Failed to fetch samples');
  const result = await response.json();
  const list = result.data ?? result ?? [];
  return Array.isArray(list) ? list : [];
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
  const list = result.data ?? result.checks ?? [];
  return Array.isArray(list) ? list : [];
}

export async function toggleComplianceCheck(id: string, completed: boolean): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}/warehouse/qc/checks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ completed })
  });
  if (!response.ok) throw new Error('Failed to toggle compliance check');
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
  if (!response.ok) throw new Error('Failed to add staff');
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
  if (!response.ok) throw new Error('Failed to create training');
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
  if (!response.ok) throw new Error('Failed to add machinery');
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

