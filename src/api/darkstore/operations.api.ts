import { apiRequest } from '../apiClient';

export interface SlaMonitorRow {
  orderId: string;
  storeId: string;
  status: string;
  pickerName: string;
  slaDeadline: string;
  slaStatus: 'safe' | 'warning' | 'critical';
  slaTimer: string;
  remainingMs: number;
  remainingFormatted: string;
  itemCount: number;
}

export interface MissingItemRow {
  orderId: string;
  storeId: string;
  productName: string;
  orderedQty: number;
  scannedQty: number;
  reason: string;
  pickerName: string;
  reportedAt: string;
}

export interface LivePickingRow {
  orderId: string;
  storeId: string;
  pickerName: string;
  startedAt: string;
  items: { productName: string; orderedQty: number; scannedQty: number; location: string }[];
  progress: number;
}

export async function getSlaMonitor(params?: { storeId?: string; risk?: string }): Promise<{ success: boolean; data: SlaMonitorRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.risk) q.set('risk', params.risk);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/sla-monitor${query ? `?${query}` : ''}`);
}

export async function getMissingItems(params?: { storeId?: string; orderId?: string }): Promise<{ success: boolean; data: MissingItemRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.orderId) q.set('orderId', params.orderId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/missing-items${query ? `?${query}` : ''}`);
}

export async function getLivePickingMonitor(params?: { storeId?: string }): Promise<{ success: boolean; data: LivePickingRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/live-picking${query ? `?${query}` : ''}`);
}

export interface OperationalAlertRow {
  _id: string;
  alertType: string;
  storeId: string;
  orderId?: string;
  pickerId?: string;
  deviceId?: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}

export async function getOperationalAlerts(params?: { storeId?: string; status?: string }): Promise<{ success: boolean; data: OperationalAlertRow[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.status) q.set('status', params.status);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/alerts${query ? `?${query}` : ''}`);
}

export interface ExceptionQueueRow {
  type: 'missing_item' | 'sla_breach' | 'cancellation' | 'rto';
  orderId: string;
  storeId: string;
  pickerName: string;
  product: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface ExceptionQueueResponse {
  success: boolean;
  data: ExceptionQueueRow[];
  pagination?: { page: number; limit: number; total: number };
}

export interface PipelineStats {
  stages: {
    queued: number;
    assigned: number;
    picking: number;
    packing: number;
    ready_dispatch: number;
    waiting_rider: number;
  };
  slaCritical: number;
  ordersUnder5Min: number;
  totalActive: number;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface OrderWorkflowData {
  orderId: string;
  status: string;
  timeline: { status: string; timestamp?: string; updatedBy?: string }[];
  pickerName: string | null;
  riderStatus: string | null;
  riderName: string | null;
  readyForDispatch: boolean;
  slaStatus: string;
  slaTimer: string;
  slaDeadline: string;
}

export async function getPipelineStats(params?: { storeId?: string }): Promise<{ success: boolean; data: PipelineStats }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/pipeline${query ? `?${query}` : ''}`);
}

export async function getActivityFeed(params?: { storeId?: string; minutes?: number }): Promise<{ success: boolean; data: ActivityFeedItem[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.minutes) q.set('minutes', String(params.minutes));
  const query = q.toString();
  return apiRequest(`/darkstore/operations/activity-feed${query ? `?${query}` : ''}`);
}

export async function getOrderWorkflow(orderId: string): Promise<{ success: boolean; data: OrderWorkflowData }> {
  return apiRequest(`/darkstore/operations/order-workflow/${encodeURIComponent(orderId)}`);
}

export interface WorkflowSlaMetrics {
  pickTimeP50Sec: number;
  pickTimeP95Sec: number;
  breachRateByHour: { hour: number; breaches: number; total: number; rate: number }[];
  avgExceptionResolutionMin: number;
  sampleSize: number;
}

export interface RegionalStorePipeline {
  storeId: string;
  totalActive: number;
  slaCritical: number;
  ordersUnder5Min: number;
  slaThreatPct: number;
  pickerCount: number;
}

export interface EscalationSuggestion {
  id: string;
  tier: 'P0' | 'P1' | 'P2';
  type: string;
  orderId?: string;
  message: string;
  action: string;
  createdAt: string;
}

export async function getWorkflowSlaMetrics(params?: { storeId?: string }): Promise<{ success: boolean; data: WorkflowSlaMetrics }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/workflow-sla-metrics${query ? `?${query}` : ''}`);
}

export async function getRegionalPipeline(params?: { storeIds?: string }): Promise<{ success: boolean; data: RegionalStorePipeline[] }> {
  const q = new URLSearchParams();
  if (params?.storeIds) q.set('storeIds', params.storeIds);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/regional-pipeline${query ? `?${query}` : ''}`);
}

export async function getEscalationSuggestions(params?: { storeId?: string }): Promise<{ success: boolean; data: EscalationSuggestion[] }> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  const query = q.toString();
  return apiRequest(`/darkstore/operations/escalation-suggestions${query ? `?${query}` : ''}`);
}

export async function getExceptionQueue(params?: {
  storeId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ExceptionQueueResponse> {
  const q = new URLSearchParams();
  if (params?.storeId) q.set('storeId', params.storeId);
  if (params?.type) q.set('type', params.type);
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  return apiRequest(`/darkstore/operations/exception-queue${query ? `?${query}` : ''}`);
}
