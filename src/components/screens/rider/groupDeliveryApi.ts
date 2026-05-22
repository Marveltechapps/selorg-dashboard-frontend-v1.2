import { apiRequest } from '@/api/apiClient';
import type { Order } from './overview/types';
import type { ClusterMetrics, GroupDeliveryFilterOptions, GroupDeliveryOrder } from './groupDeliveryTypes';

export interface ClusterSavePayload {
  id?: string;
  clusterId?: string;
  orders: Order[];
  center: { lat: number; lng: number };
  color: string;
  radiusKm?: number;
  metadata?: Record<string, unknown>;
}

export interface SavedClusterRef {
  clusterId: string;
  orderIds: string[];
  status: string;
}

export interface AssignClusterResult {
  clusterId: string;
  riderId: string;
  riderName?: string;
  assignedCount: number;
  failedCount: number;
  totalOrders: number;
  failed?: Array<{ orderId: string; message: string }>;
}

export interface GroupedClusterDraft {
  id: string;
  orders: GroupDeliveryOrder[];
  center: { lat: number; lng: number };
  orderCount?: number;
  color?: string;
  radiusKm?: number;
}

export interface GroupDeliveryResult {
  clusters: GroupedClusterDraft[];
  unclustered: GroupDeliveryOrder[];
  radiusKm: number;
  totalOrders: number;
  clusteredCount: number;
  unclusteredCount: number;
  reservedOrderCount?: number;
}

export interface ListGroupDeliveryOrdersResult {
  orders: GroupDeliveryOrder[];
  total: number;
  reservedOrderCount?: number;
}

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export async function fetchGroupedOrders(
  radiusKm: number,
  params?: { minSize?: number; maxSize?: number; zone?: string; status?: string; search?: string }
): Promise<GroupDeliveryResult> {
  const query = new URLSearchParams();
  query.set('radius', String(radiusKm));
  if (params?.minSize != null) query.set('minSize', String(params.minSize));
  if (params?.maxSize != null) query.set('maxSize', String(params.maxSize));
  if (params?.zone && params.zone !== 'all') query.set('zone', params.zone);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.search?.trim()) query.set('search', params.search.trim());

  const raw = await apiRequest<unknown>(`/rider/dispatch/group-delivery?${query.toString()}`);
  const data = unwrapData<GroupDeliveryResult>(raw);
  return {
    clusters: Array.isArray(data?.clusters) ? data.clusters : [],
    unclustered: Array.isArray(data?.unclustered) ? data.unclustered : [],
    radiusKm: data?.radiusKm ?? radiusKm,
    totalOrders: data?.totalOrders ?? 0,
    clusteredCount: data?.clusteredCount ?? 0,
    unclusteredCount: data?.unclusteredCount ?? 0,
    reservedOrderCount: data?.reservedOrderCount,
  };
}

export async function listGroupDeliveryOrders(params?: {
  zone?: string;
  status?: string;
  search?: string;
}): Promise<ListGroupDeliveryOrdersResult> {
  const query = new URLSearchParams();
  if (params?.zone && params.zone !== 'all') query.set('zone', params.zone);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.search?.trim()) query.set('search', params.search.trim());
  const qs = query.toString();
  const raw = await apiRequest<unknown>(
    `/rider/dispatch/group-delivery/orders${qs ? `?${qs}` : ''}`
  );
  const data = unwrapData<ListGroupDeliveryOrdersResult>(raw);
  return {
    orders: Array.isArray(data?.orders) ? data.orders : [],
    total: data?.total ?? 0,
    reservedOrderCount: data?.reservedOrderCount,
  };
}

export async function fetchGroupDeliveryFilterOptions(): Promise<GroupDeliveryFilterOptions> {
  const raw = await apiRequest<unknown>('/rider/dispatch/group-delivery/filter-options');
  const data = unwrapData<GroupDeliveryFilterOptions>(raw);
  return {
    zones: Array.isArray(data?.zones) ? data.zones : [],
    statuses: Array.isArray(data?.statuses) ? data.statuses : [],
  };
}

export async function computeClusterMetrics(orderIds: string[]): Promise<ClusterMetrics> {
  const raw = await apiRequest<unknown>('/rider/dispatch/clusters/compute-metrics', {
    method: 'POST',
    body: JSON.stringify({ orderIds }),
  });
  return unwrapData<ClusterMetrics>(raw);
}

export async function updateClusterOrdersOnBackend(
  clusterId: string,
  orderIds: string[]
): Promise<void> {
  await apiRequest(`/rider/dispatch/clusters/${clusterId}/orders`, {
    method: 'PATCH',
    body: JSON.stringify({ orderIds }),
  });
}

export async function saveClustersToBackend(
  clusters: ClusterSavePayload[]
): Promise<SavedClusterRef[]> {
  const raw = await apiRequest<unknown>('/rider/dispatch/clusters', {
    method: 'POST',
    body: JSON.stringify({ clusters }),
  });
  const data = unwrapData<SavedClusterRef[]>(raw);
  return Array.isArray(data) ? data : [];
}

export async function assignClusterToRider(
  clusterId: string,
  riderId: string,
  overrideSla = false
): Promise<AssignClusterResult> {
  const raw = await apiRequest<unknown>(`/rider/dispatch/clusters/${clusterId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ riderId, overrideSla }),
  });
  return unwrapData<AssignClusterResult>(raw);
}

export async function listClustersFromBackend(params?: {
  status?: string;
}): Promise<unknown[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const raw = await apiRequest<unknown>(
    `/rider/dispatch/clusters${qs ? `?${qs}` : ''}`
  );
  const data = unwrapData<unknown[]>(raw);
  return Array.isArray(data) ? data : Array.isArray(raw) ? (raw as unknown[]) : [];
}
