// --- Type Definitions ---

export interface GeofenceZone {
  id: string;
  name: string;
  city: string;
  region: string;
  type: 'standard' | 'express' | 'no-service' | 'premium' | 'surge';
  status: 'active' | 'inactive' | 'testing';
  color: string;
  polygon: Coordinate[];
  center: Coordinate;
  settings: ZoneSettings;
  analytics: ZoneAnalytics;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ZoneSettings {
  deliveryFee: number;
  minOrderValue: number;
  maxDeliveryRadius: number;
  estimatedDeliveryTime: number;
  surgeMultiplier: number;
  maxCapacity: number;
  priority: number;
  availableSlots: string[];
}

export interface ZoneAnalytics {
  areaSize: number;
  population: number;
  activeOrders: number;
  totalOrders: number;
  dailyOrders: number;
  revenue: number;
  avgDeliveryTime: number;
  riderCount: number;
  capacityUsage: number;
  customerSatisfaction: number;
}

export interface ZonePerformance {
  zoneId: string;
  zoneName: string;
  orders: number;
  revenue: number;
  avgDeliveryTime: number;
  onTimeRate: number;
  cancellationRate: number;
  rating: number;
}

export interface CoverageStats {
  totalZones: number;
  activeZones: number;
  totalCoverage: number;
  totalPopulation: number;
  activeOrders: number;
  totalRiders: number;
  avgCapacityUsage: number;
}

export interface ZoneHistory {
  id: string;
  zoneId: string;
  zoneName: string;
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted';
  changes: string;
  timestamp: string;
  performedBy: string;
}

export interface OverlapWarning {
  zone1: string;
  zone2: string;
  overlapArea: number;
  severity: 'low' | 'medium' | 'high';
}

import { apiRequest } from '@/api/apiClient';

const PREFIX = '/merch/geofence';

/** Load zones from API. Returns [] when empty. Throws on error. */
export async function fetchZones(): Promise<GeofenceZone[]> {
  const response = await apiRequest<{ success: boolean; data: GeofenceZone[] }>(`${PREFIX}/zones`);
  return response?.data ?? [];
}

/** Derive coverage stats from zones. No mock data. */
export async function fetchCoverageStats(): Promise<CoverageStats> {
  const zones = await fetchZones();
  return {
    totalZones: zones.length,
    activeZones: zones.filter((z) => z.status === 'active').length,
    totalCoverage: zones.reduce((sum, z) => sum + (z.analytics?.areaSize ?? 0), 0),
    totalPopulation: zones.reduce((sum, z) => sum + (z.analytics?.population ?? 0), 0),
    activeOrders: zones.reduce((sum, z) => sum + (z.analytics?.activeOrders ?? 0), 0),
    totalRiders: zones.reduce((sum, z) => sum + (z.analytics?.riderCount ?? 0), 0),
    avgCapacityUsage:
      zones.length > 0
        ? zones.reduce((sum, z) => sum + (z.analytics?.capacityUsage ?? 0), 0) / zones.length
        : 0,
  };
}

/** Derive zone performance from zones. No mock data. */
export async function fetchZonePerformance(): Promise<ZonePerformance[]> {
  const zones = await fetchZones();
  return zones.map((zone) => ({
    zoneId: zone.id,
    zoneName: zone.name,
    orders: zone.analytics?.dailyOrders ?? zone.analytics?.totalOrders ?? 0,
    revenue: zone.analytics?.revenue ?? 0,
    avgDeliveryTime: zone.analytics?.avgDeliveryTime ?? 0,
    onTimeRate: 0,
    cancellationRate: 0,
    rating: zone.analytics?.customerSatisfaction ?? 0,
  }));
}

/** Load zone history from API. Returns [] when empty. Throws on error. */
export async function fetchZoneHistory(): Promise<ZoneHistory[]> {
  const response = await apiRequest<{ success: boolean; data: ZoneHistory[] }>(`${PREFIX}/history`);
  return response?.data ?? [];
}

/** Load overlap warnings from API. Returns [] when empty. Throws on error. */
export async function fetchOverlapWarnings(): Promise<OverlapWarning[]> {
  const response = await apiRequest<{ success: boolean; data: OverlapWarning[] }>(`${PREFIX}/overlaps`);
  return response?.data ?? [];
}

/** Create zone. Throws on error. */
export async function createZone(zone: Partial<GeofenceZone>): Promise<GeofenceZone> {
  const response = await apiRequest<{ success: boolean; data: GeofenceZone }>(`${PREFIX}/zones`, {
    method: 'POST',
    body: JSON.stringify(zone),
  });
  if (!response?.data) throw new Error('No data returned from create zone');
  return response.data;
}

/** Update zone. Throws on error. */
export async function updateZone(zoneId: string, updates: Partial<GeofenceZone>): Promise<GeofenceZone> {
  const response = await apiRequest<{ success: boolean; data: GeofenceZone }>(
    `${PREFIX}/zones/${zoneId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
  if (!response?.data) throw new Error('No data returned from update zone');
  return response.data;
}

/** Delete zone. Throws on error. */
export async function deleteZone(zoneId: string): Promise<void> {
  await apiRequest(`${PREFIX}/zones/${zoneId}`, {
    method: 'DELETE',
  });
}

/** Toggle zone status (active/inactive). Throws on error. */
export async function toggleZoneStatus(
  zoneId: string,
  status: 'active' | 'inactive'
): Promise<void> {
  await apiRequest(`${PREFIX}/zones/${zoneId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/** Clone zone. Throws on error. */
export async function cloneZone(zoneId: string, newName: string): Promise<GeofenceZone> {
  const response = await apiRequest<{ success: boolean; data: GeofenceZone }>(
    `${PREFIX}/zones/${zoneId}`
  );
  const original = response?.data;
  if (!original) throw new Error('Zone not found');
  const cloned: Partial<GeofenceZone> = {
    ...original,
    name: newName,
    status: 'testing',
  };
  delete (cloned as Partial<GeofenceZone> & { id?: string }).id;
  return createZone(cloned);
}
