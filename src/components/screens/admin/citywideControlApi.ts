import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export type ZoneStatus = "normal" | "surge" | "warning" | "critical" | "offline";
export type IncidentSeverity = "critical" | "warning" | "stable";
export type IncidentType = "store_outage" | "payment_gateway" | "maps_api" | "warehouse" | "rider_shortage";
export type ExceptionType = "rto_risk" | "pickup_delay" | "payment_failed" | "delivery_delay" | "customer_unreachable";

export interface Zone {
  id: string;
  zoneNumber: number;
  zoneName: string;
  status: ZoneStatus;
  capacityPercent: number;
  activeOrders: number;
  activeRiders: number;
  riderStatus: "normal" | "overload" | "shortage";
  avgDeliveryTime: string;
  slaStatus: "on_track" | "warning" | "breach";
  surgeMultiplier?: number;
  stores: ZoneStore[];
}

export interface ZoneStore {
  storeId: string;
  storeName: string;
  status: "active" | "offline" | "limited";
  capacityPercent: number;
  activeOrders: number;
}

export interface LiveMetrics {
  orderFlowPerHour: number;
  orderFlowTrend: number;
  avgDeliveryTime: string;
  avgDeliverySeconds: number;
  targetDeliverySeconds: number;
  targetDeliveryFormatted?: string;
  activeRiders: number;
  riderUtilizationPercent: number;
  activeIncidentsCount: number;
  totalOrdersLast24h?: number;
  totalRiders?: number;
  lastUpdated: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  startTime: string;
  duration?: string;
  impact?: string;
  affectedOrders?: number;
  affectedCustomers?: number;
  status: "ongoing" | "resolved";
  resolvedAt?: string;
  timeline?: IncidentTimelineEvent[];
  actions?: IncidentAction[];
}

export interface IncidentTimelineEvent {
  timestamp: string;
  event: string;
}

export interface IncidentAction {
  id: string;
  label: string;
  type: "primary" | "secondary" | "danger";
}

export interface Exception {
  id: string;
  type: ExceptionType;
  orderId: string;
  title: string;
  description: string;
  riderName?: string;
  storeName?: string;
  timestamp: string;
  timeAgo: string;
  priority: "high" | "medium" | "low";
}

export interface SurgeInfo {
  active: boolean;
  globalMultiplier?: number;
  zonesAffected: string[];
  zoneMultipliers: { [zoneId: string]: number };
  startTime?: string | null;
  estimatedEnd?: string | null;
  reason?: string | null;
}

export interface DispatchEngineStatus {
  status: "running" | "paused" | "error";
  lastRestart: string;
  uptime: string;
  uptimePercent: number;
  processingOrders: number;
  avgDispatchTime: number;
  successRate: number;
  configuration: {
    algorithm: string;
    riderSelection: string;
    batchingEnabled: boolean;
    surgePricingEnabled: boolean;
  };
}

export interface AnalyticsData {
  orderFlowHistory: { time: string; orders: number }[];
  slaPerformanceByZone: { zone: string; actual: number; target: number }[];
  riderUtilization: { status: string; count: number; percent: number }[];
  storeCapacityHeatmap: { store: string; hour: string; capacity: number }[];
}

export interface IntegrationHealthResponse {
  integrations: { id: string; serviceKey: string; displayName: string; provider: string; status: string; message?: string }[];
  storeOutages: { id: string; storeId: string; storeName: string; outageReason?: string; estimatedResolution?: string }[];
}

// --- API Functions ---

const CITYWIDE_PREFIX = '/merch/citywide';

export const fetchLiveMetrics = async (cityId?: string): Promise<LiveMetrics | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: LiveMetrics }>(`${CITYWIDE_PREFIX}/live-metrics${params}`);
  return res.data ?? null;
};

export const fetchZones = async (cityId?: string): Promise<Zone[]> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: Zone[] }>(`${CITYWIDE_PREFIX}/zones${params}`);
  return res.data ?? [];
};

export const fetchZoneOrderTrend = async (zoneId: string, cityId?: string): Promise<{ time: string; orders: number }[]> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: { time: string; orders: number }[] }>(`${CITYWIDE_PREFIX}/zones/${zoneId}/trend${params}`);
  return res.data ?? [];
};

export const fetchZoneDetails = async (zoneId: string, cityId?: string): Promise<Zone | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: Zone }>(`${CITYWIDE_PREFIX}/zones/${zoneId}${params}`);
  return res.data ?? null;
};

export const fetchIncidents = async (cityId?: string, status = 'ongoing'): Promise<Incident[]> => {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  if (status) params.set('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiRequest<{ success: boolean; data: Incident[] }>(`${CITYWIDE_PREFIX}/incidents${query}`);
  return res.data ?? [];
};

export const fetchIncidentDetails = async (incidentId: string): Promise<Incident | null> => {
  const res = await apiRequest<{ success: boolean; data: Incident }>(`${CITYWIDE_PREFIX}/incidents/${incidentId}`);
  return res.data ?? null;
};

export const fetchExceptions = async (cityId?: string, limit = 20): Promise<Exception[]> => {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  params.set('limit', String(limit));
  const res = await apiRequest<{ success: boolean; data: Exception[] }>(`${CITYWIDE_PREFIX}/exceptions?${params.toString()}`);
  return res.data ?? [];
};

export const resolveException = async (exceptionId: string, resolution?: string): Promise<void> => {
  await apiRequest<{ success: boolean }>(`${CITYWIDE_PREFIX}/exceptions/${exceptionId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution: resolution ?? 'Resolved via dashboard' }),
  });
};

export const fetchSurgeInfo = async (cityId?: string): Promise<SurgeInfo | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: SurgeInfo }>(`${CITYWIDE_PREFIX}/surge${params}`);
  return res.data ?? null;
};

export const updateSurgeMultiplier = async (zoneId: string, multiplier: number, cityId?: string): Promise<SurgeInfo> => {
  const body = { zoneId, multiplier, ...(cityId && { cityId }) };
  const res = await apiRequest<{ success: boolean; data: SurgeInfo }>(`${CITYWIDE_PREFIX}/surge`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const updateGlobalSurge = async (multiplier: number, cityId?: string): Promise<SurgeInfo> => {
  const body = { globalMultiplier: multiplier, active: multiplier > 1, ...(cityId && { cityId }) };
  const res = await apiRequest<{ success: boolean; data: SurgeInfo }>(`${CITYWIDE_PREFIX}/surge`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const endSurge = async (cityId?: string): Promise<SurgeInfo> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: SurgeInfo }>(`${CITYWIDE_PREFIX}/surge${params}`, {
    method: 'DELETE',
  });
  return res.data!;
};

export const fetchDispatchEngineStatus = async (cityId?: string): Promise<DispatchEngineStatus | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: DispatchEngineStatus }>(`${CITYWIDE_PREFIX}/dispatch${params}`);
  return res.data ?? null;
};

export const restartDispatchEngine = async (cityId?: string): Promise<DispatchEngineStatus> => {
  const body = cityId ? { cityId } : {};
  const res = await apiRequest<{ success: boolean; data: DispatchEngineStatus }>(`${CITYWIDE_PREFIX}/dispatch/restart`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const pauseDispatchEngine = async (cityId?: string): Promise<DispatchEngineStatus> => {
  const body = { status: 'paused', ...(cityId && { cityId }) };
  const res = await apiRequest<{ success: boolean; data: DispatchEngineStatus }>(`${CITYWIDE_PREFIX}/dispatch`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const resumeDispatchEngine = async (cityId?: string): Promise<DispatchEngineStatus> => {
  const body = { status: 'running', ...(cityId && { cityId }) };
  const res = await apiRequest<{ success: boolean; data: DispatchEngineStatus }>(`${CITYWIDE_PREFIX}/dispatch`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const updateDispatchConfig = async (config: Partial<DispatchEngineStatus['configuration']>, cityId?: string): Promise<DispatchEngineStatus> => {
  const body = { config, ...(cityId && { cityId }) };
  const res = await apiRequest<{ success: boolean; data: DispatchEngineStatus }>(`${CITYWIDE_PREFIX}/dispatch`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data!;
};

export const fetchAnalyticsData = async (): Promise<AnalyticsData | null> => {
  return null;
};

export const updateIncident = async (incidentId: string, update: Partial<{ status: string; estimatedResolution: string; actionsTaken: string }>): Promise<Incident> => {
  const res = await apiRequest<{ success: boolean; data: Incident }>(`${CITYWIDE_PREFIX}/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
  return res.data!;
};

export const resolveIncident = async (incidentId: string): Promise<Incident> => {
  const res = await apiRequest<{ success: boolean; data: Incident }>(`${CITYWIDE_PREFIX}/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'resolved', resolvedAt: new Date().toISOString() }),
  });
  return res.data!;
};

export const fetchIntegrationHealth = async (cityId?: string): Promise<IntegrationHealthResponse | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: IntegrationHealthResponse }>(`${CITYWIDE_PREFIX}/integration-health${params}`);
  return res.data ?? null;
};

export const fetchSlaConfig = async (cityId?: string): Promise<{ targetMinutes: number; zoneOverrides: Record<string, number> } | null> => {
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
  const res = await apiRequest<{ success: boolean; data: { targetMinutes: number; zoneOverrides: Record<string, number> } }>(`${CITYWIDE_PREFIX}/sla${params}`);
  return res.data ?? null;
};

export const seedCitywideData = async (cityId?: string): Promise<void> => {
  await apiRequest<{ success: boolean }>(`${CITYWIDE_PREFIX}/seed`, {
    method: 'POST',
    body: JSON.stringify(cityId ? { cityId } : {}),
  });
};
