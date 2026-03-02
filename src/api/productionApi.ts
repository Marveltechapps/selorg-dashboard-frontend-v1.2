import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { getAuthToken } from './authApi';

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  return res.json();
}

export interface RawMaterial {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  safetyStock: number;
  reorderPoint: number;
  supplier: string;
  category: string;
  lastOrderDate?: string;
  orderStatus?: 'none' | 'ordered';
}

export interface InboundReceipt {
  id: string;
  poNumber: string;
  supplier: string;
  expectedDate: string;
  status: 'pending' | 'docking' | 'received';
  items: string;
}

export interface Requisition {
  id: string;
  reqNumber: string;
  material: string;
  quantity: number;
  requestedBy: string;
  line: string;
  status: 'pending' | 'approved' | 'issued' | 'rejected';
  date: string;
}

export interface ProductionPlan {
  id: string;
  product: string;
  line: string;
  startDate: string;
  endDate: string;
  quantity: number;
  status: 'scheduled' | 'in-progress' | 'completed';
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  line: string;
  operator?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

const base = API_CONFIG.baseURL;

export async function fetchRawMaterials(search?: string): Promise<RawMaterial[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await fetchApi<RawMaterial[]>(`${base}${API_ENDPOINTS.production.rawMaterials.materials}${q}`);
  return Array.isArray(data) ? data : [];
}

export async function createRawMaterial(body: {
  name: string;
  currentStock: number;
  unit: string;
  safetyStock?: number;
  reorderPoint?: number;
  supplier?: string;
  category?: string;
}): Promise<RawMaterial> {
  return fetchApi<RawMaterial>(`${base}${API_ENDPOINTS.production.rawMaterials.materials}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function orderMaterial(id: string, quantity?: number): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`${base}${API_ENDPOINTS.production.rawMaterials.orderMaterial(id)}`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export async function fetchReceipts(): Promise<InboundReceipt[]> {
  const data = await fetchApi<InboundReceipt[]>(`${base}${API_ENDPOINTS.production.rawMaterials.receipts}`);
  return Array.isArray(data) ? data : [];
}

export async function markReceiptReceived(id: string): Promise<void> {
  await fetchApi(`${base}${API_ENDPOINTS.production.rawMaterials.receiveReceipt(id)}`, { method: 'POST' });
}

export async function fetchRequisitions(): Promise<Requisition[]> {
  const data = await fetchApi<Requisition[]>(`${base}${API_ENDPOINTS.production.rawMaterials.requisitions}`);
  return Array.isArray(data) ? data : [];
}

export async function createRequisition(body: {
  material: string;
  quantity: number;
  line: string;
  requestedBy: string;
}): Promise<Requisition> {
  return fetchApi<Requisition>(`${base}${API_ENDPOINTS.production.rawMaterials.requisitions}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateRequisitionStatus(
  id: string,
  status: 'approved' | 'rejected' | 'issued'
): Promise<void> {
  await fetchApi(`${base}${API_ENDPOINTS.production.rawMaterials.updateRequisitionStatus(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function fetchPlans(): Promise<ProductionPlan[]> {
  const data = await fetchApi<ProductionPlan[]>(`${base}${API_ENDPOINTS.production.planning.plans}`);
  return Array.isArray(data) ? data : [];
}

export async function createPlan(body: {
  product: string;
  line: string;
  startDate: string;
  endDate?: string;
  quantity: number;
}): Promise<ProductionPlan> {
  return fetchApi<ProductionPlan>(`${base}${API_ENDPOINTS.production.planning.plans}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, endDate: body.endDate || body.startDate }),
  });
}

export async function fetchWorkOrders(search?: string): Promise<WorkOrder[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await fetchApi<WorkOrder[]>(`${base}${API_ENDPOINTS.production.workOrders.list}${q}`);
  return Array.isArray(data) ? data : [];
}

export async function createWorkOrder(body: {
  product: string;
  quantity: number;
  line?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}): Promise<WorkOrder> {
  return fetchApi<WorkOrder>(`${base}${API_ENDPOINTS.production.workOrders.list}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getWorkOrder(id: string): Promise<WorkOrder> {
  return fetchApi<WorkOrder>(`${base}${API_ENDPOINTS.production.workOrders.byId(id)}`);
}

export async function assignWorkOrderOperator(id: string, operator: string): Promise<void> {
  await fetchApi(`${base}${API_ENDPOINTS.production.workOrders.assign(id)}`, {
    method: 'POST',
    body: JSON.stringify({ operator }),
  });
}

export async function updateWorkOrderStatus(
  id: string,
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold'
): Promise<void> {
  await fetchApi(`${base}${API_ENDPOINTS.production.workOrders.updateStatus(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---- Production Dashboard: Alerts, Incidents, Reports, Utilities ----

export interface ProductionAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'equipment' | 'material' | 'quality' | 'safety' | 'shift' | 'production';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  timestamp: string;
  location?: string;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ProductionIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  reportedBy: string;
  location: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
}

export interface ProductionReportsData {
  dateRange: { start: string; end: string };
  reportType: string;
  data: {
    productionData: Array<{ date: string; output: number; target: number; efficiency: number }>;
    lineUtilizationData: Array<{ name: string; utilization: number; downtime: number }>;
    materialData: Array<{ material: string; allocated: number; consumed: number; waste: number }>;
    qualityData: Array<{ date: string; passRate: number; defects: number }>;
    workforceData: Array<{ shift: string; productivity: number; attendance: number }>;
    maintenanceData: Array<{ month: string; preventive: number; corrective: number; breakdown: number }>;
    defectTypeData: Array<{ name: string; value: number }>;
  };
}

export interface ProductionUploadHistoryItem {
  id: string;
  fileName: string;
  type: string;
  recordsProcessed: number;
  uploadedBy: string;
  timestamp: string;
  status: 'success' | 'failed' | 'processing';
}

export interface ProductionSyncHistoryItem {
  id: string;
  deviceCount: number;
  timestamp: string;
  status: 'success' | 'failed';
  duration: string;
}

export interface ProductionSettingsData {
  autoSync: boolean;
  syncInterval: string;
  autoBackup: boolean;
  backupInterval: string;
  emailNotifications: boolean;
  alertThreshold: string;
}

export interface ProductionAuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

// ---- Production Overview ----

export interface ProductionLineOverview {
  id: string;
  name: string;
  currentJob?: string;
  status: 'running' | 'changeover' | 'maintenance' | 'idle';
  output: number;
  target: number;
  efficiency: number;
}

export interface ProductionOverviewKPIs {
  totalOutput: number;
  totalTarget: number;
  avgEfficiency: number;
  defectRate: number;
  activeDowntime: number;
}

export interface ProductionOverviewResponse {
  success: boolean;
  lines: ProductionLineOverview[];
  kpis: ProductionOverviewKPIs;
}

export interface ProductionFactory {
  id: string;
  name: string;
  code: string;
  status: 'operational' | 'maintenance';
}

export async function fetchProductionOverview(factoryId?: string): Promise<ProductionOverviewResponse> {
  const q = factoryId ? `?factoryId=${encodeURIComponent(factoryId)}` : '';
  const data = await fetchApi<ProductionOverviewResponse>(`${base}${API_ENDPOINTS.production.overview}${q}`);
  return data;
}

export async function startProductionBatch(body: {
  lineId: string;
  product: string;
  targetQuantity: number;
}, factoryId?: string): Promise<{ success: boolean; line: ProductionLineOverview; message: string }> {
  const payload = factoryId ? { ...body, factoryId } : body;
  return fetchApi(`${base}${API_ENDPOINTS.production.overviewBatch}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProductionLine(
  lineId: string,
  action: 'pause' | 'resume' | 'stop'
): Promise<{ success: boolean; line: ProductionLineOverview; message: string }> {
  return fetchApi(`${base}${API_ENDPOINTS.production.updateLine(lineId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function fetchProductionFactories(): Promise<ProductionFactory[]> {
  const data = await fetchApi<{ success: boolean; factories: ProductionFactory[] }>(`${base}${API_ENDPOINTS.production.factories}`);
  return data?.factories ?? [];
}

const dash = API_ENDPOINTS.production.dashboard;

export async function fetchProductionAlerts(params?: {
  status?: string;
  severity?: string;
  category?: string;
  search?: string;
  factoryId?: string;
}): Promise<{ alerts: ProductionAlert[]; summary: { criticalCount: number; warningCount: number; activeAlertsCount: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.severity) q.set('severity', params.severity);
  if (params?.category) q.set('category', params.category);
  if (params?.search) q.set('search', params.search);
  if (params?.factoryId) q.set('factoryId', params.factoryId);
  return fetchApi(`${base}${dash.alerts}?${q}`);
}

export async function updateProductionAlertStatus(
  alertId: string,
  actionType: 'acknowledge' | 'resolved' | 'dismissed' | 'dispatch',
  assignee?: string
): Promise<{ alert: ProductionAlert }> {
  return fetchApi(`${base}${dash.alertStatus(alertId)}`, {
    method: 'PUT',
    body: JSON.stringify({ actionType, assignee }),
  });
}

export async function deleteProductionAlert(alertId: string): Promise<void> {
  await fetchApi(`${base}${dash.alertDelete(alertId)}`, { method: 'DELETE' });
}

export async function fetchProductionIncidents(): Promise<{
  incidents: ProductionIncident[];
  openIncidentsCount: number;
}> {
  return fetchApi(`${base}${dash.incidents}`);
}

export async function createProductionIncident(body: {
  title: string;
  description: string;
  severity?: string;
  category?: string;
  reportedBy: string;
  location?: string;
}): Promise<{ incident: ProductionIncident }> {
  return fetchApi(`${base}${dash.incidents}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateProductionIncidentStatus(
  incidentId: string,
  status: 'open' | 'investigating' | 'resolved'
): Promise<{ incident: ProductionIncident }> {
  return fetchApi(`${base}${dash.incidentStatus(incidentId)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function fetchProductionReports(params?: {
  reportType?: string;
  preset?: 'week' | 'month' | 'quarter';
}): Promise<ProductionReportsData> {
  const q = new URLSearchParams();
  if (params?.reportType) q.set('reportType', params.reportType);
  if (params?.preset) q.set('preset', params.preset);
  return fetchApi(`${base}${dash.reports}?${q}`);
}

export async function exportProductionReports(preset?: string): Promise<Blob> {
  const url = preset ? `${base}${dash.reportsExport}?preset=${preset}` : `${base}${dash.reportsExport}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function fetchProductionUploadHistory(): Promise<ProductionUploadHistoryItem[]> {
  const data = await fetchApi<{ uploads: ProductionUploadHistoryItem[] }>(`${base}${dash.uploadHistory}`);
  return data?.uploads ?? [];
}

export async function fetchProductionSyncHistory(): Promise<ProductionSyncHistoryItem[]> {
  const data = await fetchApi<{ syncs: ProductionSyncHistoryItem[] }>(`${base}${dash.syncHistory}`);
  return data?.syncs ?? [];
}

export async function performProductionHSDSync(): Promise<{
  syncId: string;
  deviceCount: number;
  status: string;
  duration: string;
}> {
  return fetchApi(`${base}${dash.hsdSync}`, { method: 'POST', body: '{}' });
}

export async function fetchProductionSettings(): Promise<ProductionSettingsData> {
  const data = await fetchApi<{ settings: ProductionSettingsData }>(`${base}${dash.settings}`);
  return data?.settings ?? {
    autoSync: true,
    syncInterval: '15',
    autoBackup: true,
    backupInterval: 'daily',
    emailNotifications: true,
    alertThreshold: 'medium',
  };
}

export async function updateProductionSettings(settings: Partial<ProductionSettingsData>): Promise<ProductionSettingsData> {
  const data = await fetchApi<{ settings: ProductionSettingsData }>(`${base}${dash.settings}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return data?.settings ?? settings as ProductionSettingsData;
}

export async function fetchProductionAuditLogs(): Promise<ProductionAuditLogEntry[]> {
  const data = await fetchApi<{ logs: ProductionAuditLogEntry[] }>(`${base}${dash.auditLogs}`);
  return data?.logs ?? [];
}

export async function bulkUploadProduction(
  file: File,
  uploadType: 'work-orders' | 'materials' | 'roster' | 'maintenance',
  uploadedBy?: string
): Promise<{ recordsProcessed: number; message: string }> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  form.append('uploadType', uploadType);
  if (uploadedBy) form.append('uploadedBy', uploadedBy);

  const res = await fetch(`${base}${dash.bulkUpload}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Upload failed');
  }
  const data = await res.json();
  return { recordsProcessed: data.recordsProcessed ?? 0, message: data.message ?? 'Upload completed' };
}

// ---- Production QC ----

export interface QCInspection {
  id: string;
  time: string;
  batch: string;
  checkType: string;
  result: 'pass' | 'fail' | 'pending';
  inspector: string;
  notes?: string;
  date: string;
}

export interface QCLabTest {
  id: string;
  sampleId: string;
  product: string;
  source: string;
  testType: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  receivedDate: string;
  completedDate?: string;
  result?: string;
}

export async function fetchQCInspections(storeId?: string): Promise<QCInspection[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const data = await fetchApi<{ success: boolean; inspections: unknown[] }>(`${base}${API_ENDPOINTS.production.qc.inspections}${q}`);
  const items = data?.inspections ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.inspection_id ?? r._id ?? r.id ?? ''),
    time: r.createdAt ? new Date(String(r.createdAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    batch: String(r.batch_id ?? r.batch ?? ''),
    checkType: String(r.product_name ?? r.check_type ?? r.checkType ?? ''),
    result: (r.status === 'passed' ? 'pass' : r.status === 'failed' ? 'fail' : 'pending') as 'pass' | 'fail' | 'pending',
    inspector: String(r.inspector ?? ''),
    notes: r.notes ? String(r.notes) : undefined,
    date: String(r.date ?? ''),
  }));
}

export async function createQCInspection(body: {
  batch: string;
  checkType: string;
  result: 'pass' | 'fail' | 'pending';
  inspector: string;
  notes?: string;
}, storeId?: string): Promise<QCInspection> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; inspection: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.qc.inspections}${q}`, {
    method: 'POST',
    body: JSON.stringify({
      batch: body.batch,
      checkType: body.checkType,
      result: body.result,
      inspector: body.inspector,
      notes: body.notes,
    }),
  });
  const r = res?.inspection ?? {};
  return {
    id: String(r.inspection_id ?? r._id ?? r.id ?? Date.now()),
    time: r.createdAt ? new Date(String(r.createdAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    batch: String(r.batch_id ?? body.batch),
    checkType: String(r.product_name ?? body.checkType),
    result: (r.status === 'passed' ? 'pass' : r.status === 'failed' ? 'fail' : 'pending') as 'pass' | 'fail' | 'pending',
    inspector: String(r.inspector ?? body.inspector),
    notes: r.notes ? String(r.notes) : body.notes,
    date: String(r.date ?? new Date().toISOString().split('T')[0]),
  };
}

export async function fetchQCLabTests(storeId?: string): Promise<QCLabTest[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const data = await fetchApi<{ success: boolean; samples: unknown[] }>(`${base}${API_ENDPOINTS.production.qc.samples}${q}`);
  const items = data?.samples ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.sample_id ?? r._id ?? r.id ?? ''),
    sampleId: String(r.sample_id ?? ''),
    product: String(r.product_name ?? r.product ?? ''),
    source: String(r.batch_id ?? r.source ?? ''),
    testType: String(r.test_type ?? r.testType ?? ''),
    status: mapSampleStatus(r),
    priority: (r.priority ?? 'normal') as 'low' | 'normal' | 'high',
    receivedDate: String(r.date ?? r.received_date ?? r.createdAt ?? ''),
    completedDate: r.completed_date ? String(r.completed_date) : undefined,
    result: r.result_notes ? String(r.result_notes) : (r.result && r.result !== 'pending' ? String(r.result) : undefined),
  }));
}

function mapSampleStatus(r: Record<string, unknown>): 'pending' | 'in-progress' | 'completed' | 'failed' {
  if (r.status) {
    const s = String(r.status).toLowerCase();
    if (s === 'in-progress' || s === 'in_progress') return 'in-progress';
    if (s === 'completed') return 'completed';
    if (s === 'failed') return 'failed';
    if (s === 'pending') return 'pending';
  }
  const res = String(r.result ?? '').toLowerCase();
  if (res === 'pass' || res === 'fail') return 'completed';
  return 'pending';
}

export async function createQCLabTest(body: {
  product: string;
  source: string;
  testType: string;
  priority?: 'low' | 'normal' | 'high';
}, storeId?: string): Promise<QCLabTest> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; sample: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.qc.samples}${q}`, {
    method: 'POST',
    body: JSON.stringify({
      batchId: body.source,
      productName: body.product,
      product: body.product,
      source: body.source,
      testType: body.testType,
      testedBy: 'Lab User',
      priority: body.priority ?? 'normal',
    }),
  });
  const r = res?.sample ?? {};
  return {
    id: String(r.sample_id ?? r._id ?? r.id ?? Date.now()),
    sampleId: String(r.sample_id ?? `LAB-23-${Math.floor(Math.random() * 1000)}`),
    product: String(r.product_name ?? body.product),
    source: String(r.batch_id ?? body.source),
    testType: String(r.test_type ?? body.testType),
    status: 'pending',
    priority: (body.priority ?? 'normal') as 'low' | 'normal' | 'high',
    receivedDate: String(r.date ?? new Date().toISOString().split('T')[0]),
  };
}

export async function updateQCLabTestStatus(
  sampleId: string,
  status: 'pending' | 'in-progress' | 'completed',
  result?: string,
  storeId?: string
): Promise<QCLabTest> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const body: Record<string, unknown> = { status, testedBy: 'Lab User' };
  if (status === 'completed') {
    body.result = 'pass';
    body.result_notes = result ?? 'Completed';
  }
  if (result) body.result_notes = result;
  const res = await fetchApi<{ success: boolean; sample: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.qc.sampleStatus(sampleId)}${q}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const r = res?.sample ?? {};
  return {
    id: String(r.sample_id ?? sampleId),
    sampleId: String(r.sample_id ?? sampleId),
    product: String(r.product_name ?? ''),
    source: String(r.batch_id ?? ''),
    testType: String(r.test_type ?? ''),
    status: mapSampleStatus(r),
    priority: (r.priority ?? 'normal') as 'low' | 'normal' | 'high',
    receivedDate: String(r.date ?? ''),
    completedDate: r.completed_date ? String(r.completed_date) : undefined,
    result: r.result_notes ? String(r.result_notes) : (r.result ? String(r.result) : undefined),
  };
}

// ---- Production Maintenance ----

export interface ProductionEquipment {
  id: string;
  name: string;
  code: string;
  status: 'operational' | 'maintenance' | 'down' | 'idle';
  health: number;
  location: string;
  category: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
}

export interface ProductionMaintenanceTask {
  id: string;
  equipmentId: string;
  equipmentName: string;
  taskType: 'preventive' | 'corrective' | 'breakdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  scheduledDate: string;
  completedDate?: string;
  technician?: string;
  description: string;
  estimatedHours?: number;
}

export interface ProductionIotDevice {
  id: string;
  deviceId: string;
  name: string;
  type: 'HSD' | 'Sensor' | 'Monitor';
  status: 'online' | 'offline' | 'warning';
  battery?: number;
  lastReading: string;
  location: string;
}

export async function fetchProductionEquipment(storeId?: string): Promise<ProductionEquipment[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const data = await fetchApi<{ success: boolean; equipment: unknown[] }>(`${base}${API_ENDPOINTS.production.maintenance.equipment}${q}`);
  const items = data?.equipment ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.equipment_id ?? r._id ?? r.id ?? ''),
    name: String(r.name ?? ''),
    code: String(r.code ?? ''),
    status: (r.status ?? 'operational') as 'operational' | 'maintenance' | 'down' | 'idle',
    health: Number(r.health ?? 100),
    location: String(r.location ?? ''),
    category: String(r.category ?? ''),
    lastMaintenance: r.last_maintenance ? String(r.last_maintenance) : undefined,
    nextMaintenance: r.next_maintenance ? String(r.next_maintenance) : undefined,
  }));
}

export async function createProductionEquipment(body: {
  name: string;
  code: string;
  category?: string;
  location?: string;
}, storeId?: string): Promise<ProductionEquipment> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; equipment: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.maintenance.equipment}${q}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const r = res?.equipment ?? {};
  return {
    id: String(r.equipment_id ?? r._id ?? r.id ?? Date.now()),
    name: String(r.name ?? body.name),
    code: String(r.code ?? body.code),
    status: (r.status ?? 'operational') as 'operational' | 'maintenance' | 'down' | 'idle',
    health: Number(r.health ?? 100),
    location: String(r.location ?? body.location ?? ''),
    category: String(r.category ?? body.category ?? ''),
    lastMaintenance: r.last_maintenance ? String(r.last_maintenance) : undefined,
    nextMaintenance: r.next_maintenance ? String(r.next_maintenance) : undefined,
  };
}

export async function fetchProductionMaintenanceTasks(storeId?: string): Promise<ProductionMaintenanceTask[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const data = await fetchApi<{ success: boolean; tasks: unknown[] }>(`${base}${API_ENDPOINTS.production.maintenance.tasks}${q}`);
  const items = data?.tasks ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.task_id ?? r._id ?? r.id ?? ''),
    equipmentId: String(r.equipment_id ?? ''),
    equipmentName: String(r.equipment_name ?? ''),
    taskType: (r.task_type ?? 'preventive') as 'preventive' | 'corrective' | 'breakdown',
    priority: (r.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
    status: (r.status ?? 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'overdue',
    scheduledDate: String(r.scheduled_date ?? ''),
    completedDate: r.completed_date ? String(r.completed_date) : undefined,
    technician: r.technician ? String(r.technician) : undefined,
    description: String(r.description ?? ''),
    estimatedHours: r.estimated_hours != null ? Number(r.estimated_hours) : undefined,
  }));
}

export async function createProductionMaintenanceTask(body: {
  equipmentId: string;
  equipmentName: string;
  taskType: 'preventive' | 'corrective' | 'breakdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  description: string;
  estimatedHours?: number;
}, storeId?: string): Promise<ProductionMaintenanceTask> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; task: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.maintenance.tasks}${q}`, {
    method: 'POST',
    body: JSON.stringify({
      equipment_id: body.equipmentId,
      equipment_name: body.equipmentName,
      task_type: body.taskType,
      priority: body.priority,
      scheduled_date: body.scheduledDate,
      description: body.description,
      estimated_hours: body.estimatedHours,
    }),
  });
  const r = res?.task ?? {};
  return {
    id: String(r.task_id ?? r._id ?? r.id ?? Date.now()),
    equipmentId: String(r.equipment_id ?? body.equipmentId),
    equipmentName: String(r.equipment_name ?? body.equipmentName),
    taskType: (r.task_type ?? body.taskType) as 'preventive' | 'corrective' | 'breakdown',
    priority: (r.priority ?? body.priority) as 'low' | 'medium' | 'high' | 'critical',
    status: (r.status ?? 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'overdue',
    scheduledDate: String(r.scheduled_date ?? body.scheduledDate),
    completedDate: r.completed_date ? String(r.completed_date) : undefined,
    technician: r.technician ? String(r.technician) : undefined,
    description: String(r.description ?? body.description),
    estimatedHours: r.estimated_hours != null ? Number(r.estimated_hours) : body.estimatedHours,
  };
}

export async function updateProductionMaintenanceTaskStatus(
  taskId: string,
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue',
  technician?: string,
  storeId?: string
): Promise<ProductionMaintenanceTask> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; task: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.maintenance.taskStatus(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, technician }),
  });
  const r = res?.task ?? {};
  return {
    id: String(r.task_id ?? taskId),
    equipmentId: String(r.equipment_id ?? ''),
    equipmentName: String(r.equipment_name ?? ''),
    taskType: (r.task_type ?? 'preventive') as 'preventive' | 'corrective' | 'breakdown',
    priority: (r.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
    status: (r.status ?? status) as 'scheduled' | 'in-progress' | 'completed' | 'overdue',
    scheduledDate: String(r.scheduled_date ?? ''),
    completedDate: r.completed_date ? String(r.completed_date) : undefined,
    technician: r.technician ? String(r.technician) : technician,
    description: String(r.description ?? ''),
    estimatedHours: r.estimated_hours != null ? Number(r.estimated_hours) : undefined,
  };
}

export async function fetchProductionIotDevices(storeId?: string): Promise<ProductionIotDevice[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const data = await fetchApi<{ success: boolean; devices: unknown[] }>(`${base}${API_ENDPOINTS.production.maintenance.iot}${q}`);
  const items = data?.devices ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.device_id ?? r._id ?? r.id ?? ''),
    deviceId: String(r.device_id ?? ''),
    name: String(r.name ?? ''),
    type: (r.device_type ?? 'HSD') as 'HSD' | 'Sensor' | 'Monitor',
    status: (r.status ?? 'online') as 'online' | 'offline' | 'warning',
    battery: r.battery != null ? Number(r.battery) : undefined,
    lastReading: String(r.last_reading ?? 'N/A'),
    location: String(r.location ?? ''),
  }));
}

// ---- Production Workforce / Staff ----

export interface ProductionEmployee {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  department: string;
  assignedLine?: string;
  status: 'active' | 'on-break' | 'absent' | 'off-duty';
  shift: string;
  shiftTime: string;
  productivity?: number;
  attendance?: number;
}

export interface ProductionShift {
  id: string;
  name: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  assignedEmployees: number;
  requiredEmployees: number;
  date: string;
  department: string;
}

export interface ProductionAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'on-leave';
  hoursWorked?: number;
}

export async function fetchProductionStaffRoster(params?: { storeId?: string; role?: string; status?: string; search?: string }): Promise<ProductionEmployee[]> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.role && params.role !== 'all') q.set('role', params.role);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
  const data = await fetchApi<{ success: boolean; staff: unknown[] }>(`${base}${API_ENDPOINTS.production.staff.roster}?${q}`);
  const items = data?.staff ?? [];
  return (items as Record<string, unknown>[]).map((r) => mapStaffToEmployee(r));
}

function mapStaffToEmployee(r: Record<string, unknown>): ProductionEmployee {
  const status = String(r.status ?? 'Offline').toLowerCase();
  const mappedStatus = status === 'active' ? 'active' : status === 'break' ? 'on-break' : status === 'meeting' ? 'active' : 'off-duty';
  const shift = String(r.current_shift ?? 'morning');
  const shiftTime = shift === 'morning' ? '6:00 AM - 2:00 PM' : shift === 'afternoon' ? '2:00 PM - 10:00 PM' : '10:00 PM - 6:00 AM';
  return {
    id: String(r.staff_id ?? r._id ?? r.id ?? ''),
    name: String(r.name ?? ''),
    employeeId: String(r.staff_id ?? ''),
    role: String(r.role ?? ''),
    department: String(r.department ?? 'operators'),
    assignedLine: r.zone ? String(r.zone) : undefined,
    status: mappedStatus,
    shift,
    shiftTime,
    productivity: r.productivity != null ? Number(r.productivity) : undefined,
    attendance: r.attendance != null ? Number(r.attendance) : undefined,
  };
}

export async function createProductionStaff(body: {
  name: string;
  employeeId: string;
  role: string;
  department?: string;
  assignedLine?: string;
  shift?: string;
  phoneNumber?: string;
}, storeId?: string): Promise<ProductionEmployee> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; staff: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.staff.create}${q}`, {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      staff_id: body.employeeId,
      role: body.role,
      department: body.department,
      zone: body.assignedLine,
      current_shift: body.shift ?? 'morning',
    }),
  });
  const r = res?.staff ?? {};
  return mapStaffToEmployee(r);
}

export async function updateProductionStaffStatus(
  staffId: string,
  status: 'active' | 'on-break' | 'absent' | 'off-duty',
  storeId?: string
): Promise<ProductionEmployee> {
  const backendStatus = status === 'active' ? 'Active' : status === 'on-break' ? 'Break' : status === 'off-duty' ? 'Offline' : 'Offline';
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; staff: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.staff.status(staffId)}${q}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: backendStatus }),
  });
  const r = res?.staff ?? {};
  return mapStaffToEmployee(r);
}

export async function fetchProductionShiftCoverage(params?: { storeId?: string; date?: string }): Promise<ProductionShift[]> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.date) q.set('date', params.date ?? new Date().toISOString().split('T')[0]);
  const data = await fetchApi<{ success: boolean; coverage: unknown[] }>(`${base}${API_ENDPOINTS.production.staff.shiftCoverage}?${q}`);
  const items = data?.coverage ?? [];
  return (items as Record<string, unknown>[]).map((r, i) => ({
    id: String(r.shift ?? r._id ?? i),
    name: String(r.shift_label ?? r.shift ?? ''),
    timeRange: String(r.shift_label ?? ''),
    startTime: '',
    endTime: '',
    assignedEmployees: Number(r.current_staff ?? 0),
    requiredEmployees: Number(r.target_staff ?? 0),
    date: r.date ? new Date(String(r.date)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    department: 'All',
  }));
}

export async function createProductionShift(body: {
  name: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  requiredEmployees: number;
  date: string;
  department?: string;
}, storeId?: string): Promise<ProductionShift> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; coverage: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.staff.createShift}${q}`, {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      timeRange: body.timeRange ?? `${body.startTime ?? ''}-${body.endTime ?? ''}`,
      startTime: body.startTime,
      endTime: body.endTime,
      requiredEmployees: body.requiredEmployees,
      date: body.date,
      department: body.department,
    }),
  });
  const r = res?.coverage ?? {};
  return {
    id: String(r.shift ?? r._id ?? Date.now()),
    name: String(r.shift_label ?? body.name),
    timeRange: String(r.shift_label ?? body.timeRange ?? ''),
    startTime: String(body.startTime ?? ''),
    endTime: String(body.endTime ?? ''),
    assignedEmployees: Number(r.current_staff ?? 0),
    requiredEmployees: Number(r.target_staff ?? body.requiredEmployees),
    date: r.date ? new Date(String(r.date)).toISOString().split('T')[0] : body.date,
    department: String(body.department ?? 'All'),
  };
}

export async function fetchProductionAttendance(params?: { storeId?: string; date?: string }): Promise<ProductionAttendance[]> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.date) q.set('date', params.date ?? new Date().toISOString().split('T')[0]);
  const data = await fetchApi<{ success: boolean; attendance: unknown[] }>(`${base}${API_ENDPOINTS.production.staff.attendance}?${q}`);
  const items = data?.attendance ?? [];
  return (items as Record<string, unknown>[]).map((r) => ({
    id: String(r.record_id ?? r._id ?? r.id ?? ''),
    employeeId: String(r.staff_id ?? ''),
    employeeName: String(r.employee_name ?? ''),
    date: String(r.date ?? ''),
    checkIn: r.check_in ? String(r.check_in) : undefined,
    checkOut: r.check_out ? String(r.check_out) : undefined,
    status: (r.status ?? 'absent') as 'present' | 'absent' | 'late' | 'on-leave',
    hoursWorked: r.hours_worked != null ? Number(r.hours_worked) : undefined,
  }));
}

export async function markProductionAttendancePresent(recordId: string, storeId?: string): Promise<ProductionAttendance> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetchApi<{ success: boolean; record: Record<string, unknown> }>(`${base}${API_ENDPOINTS.production.staff.markPresent(recordId)}${q}`, {
    method: 'PATCH',
  });
  const r = res?.record ?? {};
  return {
    id: String(r.record_id ?? recordId),
    employeeId: String(r.staff_id ?? ''),
    employeeName: String(r.employee_name ?? ''),
    date: String(r.date ?? ''),
    checkIn: r.check_in ? String(r.check_in) : undefined,
    checkOut: r.check_out ? String(r.check_out) : undefined,
    status: 'present' as const,
    hoursWorked: r.hours_worked != null ? Number(r.hours_worked) : undefined,
  };
}
