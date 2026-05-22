import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { getAuthToken } from '../../../../contexts/AuthContext';
import { logger } from '../../../../utils/logger';
import type { Order, Rider } from './types';

export interface FleetMapOrder {
  id: string;
  status: string;
  riderId?: string;
  customerName?: string;
  pickupLocation: { lat: number; lng: number; address: string };
  dropLocation: { lat: number; lng: number; address: string };
}

export interface FleetMapRider {
  id: string;
  name: string;
  status: string;
  currentOrderId?: string;
  location: { lat: number; lng: number };
}

export interface FleetMapData {
  riders: FleetMapRider[];
  orders: FleetMapOrder[];
}

function unwrapEnvelope<T>(json: unknown): T {
  if (!json || typeof json !== 'object') return json as T;
  const o = json as Record<string, unknown>;
  if (o.success === true && o.data !== undefined && o.data !== null) return o.data as T;
  return json as T;
}

function isValidCoord(lat: number | undefined, lng: number | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function parseMapLocation(
  loc: string | { address?: string; coordinates?: { lat: number; lng: number } }
): { lat: number; lng: number; address: string } {
  if (typeof loc === 'string') {
    return { lat: 0, lng: 0, address: loc };
  }
  const coords = loc?.coordinates ?? { lat: 0, lng: 0 };
  return {
    lat: coords.lat ?? 0,
    lng: coords.lng ?? 0,
    address: loc?.address ?? '',
  };
}

function mapApiRider(r: {
  id: string;
  name?: string;
  status?: string;
  location?: { lat: number; lng: number };
  currentOrderId?: string | null;
}): FleetMapRider | null {
  const lat = r.location?.lat;
  const lng = r.location?.lng;
  if (!isValidCoord(lat, lng)) return null;
  return {
    id: r.id,
    name: r.name ?? r.id,
    status: r.status ?? 'offline',
    currentOrderId: r.currentOrderId ?? undefined,
    location: { lat: lat!, lng: lng! },
  };
}

function mapApiOrder(o: {
  id: string;
  status: string;
  riderId?: string | null;
  pickupLocation: { address: string; coordinates: { lat: number; lng: number } };
  dropLocation: { address: string; coordinates: { lat: number; lng: number } };
}): FleetMapOrder | null {
  const pickup = parseMapLocation(o.pickupLocation);
  const drop = parseMapLocation(o.dropLocation);
  if (!isValidCoord(pickup.lat, pickup.lng) && !isValidCoord(drop.lat, drop.lng)) {
    return null;
  }
  return {
    id: o.id,
    status: o.status,
    riderId: o.riderId ?? undefined,
    pickupLocation: pickup,
    dropLocation: drop,
  };
}

/** Merge live rider GPS from overview props over map-data when DB coords are missing. */
export function mergeFleetRiders(
  fromApi: FleetMapRider[],
  liveRiders: Rider[]
): FleetMapRider[] {
  const byId = new Map<string, FleetMapRider>();
  for (const r of fromApi) {
    byId.set(r.id, r);
  }
  for (const live of liveRiders) {
    const lat = live.location?.lat;
    const lng = live.location?.lng;
    if (!isValidCoord(lat, lng)) continue;
    const existing = byId.get(live.id);
    byId.set(live.id, {
      id: live.id,
      name: live.name || existing?.name || live.id,
      status: live.status || existing?.status || 'offline',
      currentOrderId: live.currentOrderId ?? existing?.currentOrderId,
      location: { lat: lat!, lng: lng! },
    });
  }
  return Array.from(byId.values());
}

/** Enrich map orders with customer names from overview order list. */
export function mergeFleetOrders(fromApi: FleetMapOrder[], overviewOrders: Order[]): FleetMapOrder[] {
  const nameById = new Map(overviewOrders.map((o) => [o.id, o.customerName]));
  return fromApi.map((o) => ({
    ...o,
    customerName: nameById.get(o.id) ?? o.customerName,
    riderId: o.riderId ?? overviewOrders.find((x) => x.id === o.id)?.riderId,
  }));
}

export async function fetchFleetMapData(): Promise<FleetMapData> {
  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.dispatch.mapData}`;
  logger.apiRequest('FleetMapAPI', url);
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (raw as { message?: string })?.message ||
      (raw as { error?: string })?.error ||
      `Failed to load map data (${res.status})`;
    throw new Error(msg);
  }
  const data = unwrapEnvelope<{
    riders?: Array<{
      id: string;
      name?: string;
      status?: string;
      location?: { lat: number; lng: number };
      currentOrderId?: string | null;
    }>;
    orders?: Array<{
      id: string;
      status: string;
      riderId?: string | null;
      pickupLocation: { address: string; coordinates: { lat: number; lng: number } };
      dropLocation: { address: string; coordinates: { lat: number; lng: number } };
    }>;
  }>(raw);

  const riders = (data.riders ?? [])
    .map(mapApiRider)
    .filter((r): r is FleetMapRider => r != null);

  const orders = (data.orders ?? [])
    .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
    .map(mapApiOrder)
    .filter((o): o is FleetMapOrder => o != null);

  return { riders, orders };
}
