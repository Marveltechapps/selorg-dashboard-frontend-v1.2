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

const DEFAULT_MAP_COORDS = { lat: 13.0827, lng: 80.2707 };

function isValidCoord(lat: number | undefined, lng: number | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/** Match backend dispatchService.extractCoordinates — deterministic coords from address text. */
export function coordsFromAddress(address: string): { lat: number; lng: number } {
  const str = (address || '').trim();
  if (!str) return { ...DEFAULT_MAP_COORDS };
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    lat: DEFAULT_MAP_COORDS.lat + (hash % 100) / 1000,
    lng: DEFAULT_MAP_COORDS.lng + (hash % 200) / 1000,
  };
}

export function isActiveFleetOrderStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s !== 'delivered' && s !== 'cancelled';
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
  let pickup = parseMapLocation(o.pickupLocation);
  let drop = parseMapLocation(o.dropLocation);
  if (!isValidCoord(pickup.lat, pickup.lng)) {
    pickup = { ...coordsFromAddress(pickup.address), address: pickup.address };
  }
  if (!isValidCoord(drop.lat, drop.lng)) {
    drop = { ...coordsFromAddress(drop.address), address: drop.address };
  }
  return {
    id: o.id,
    status: String(o.status).toLowerCase(),
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

/** Build map orders from overview list when dispatch map-data is empty or unavailable. */
export function buildFleetOrdersFromOverview(overviewOrders: Order[]): FleetMapOrder[] {
  return overviewOrders
    .filter((o) => isActiveFleetOrderStatus(o.status))
    .map((o) => {
      const dropFromDelivery = o.coordinates;
      const dropCoords = isValidCoord(dropFromDelivery?.lat, dropFromDelivery?.lng)
        ? { lat: dropFromDelivery!.lat, lng: dropFromDelivery!.lng }
        : coordsFromAddress(o.dropLocation);
      const pickupCoords = coordsFromAddress(o.pickupLocation);
      return {
        id: o.id,
        status: String(o.status).toLowerCase(),
        riderId: o.riderId,
        customerName: o.customerName,
        pickupLocation: { ...pickupCoords, address: o.pickupLocation || '' },
        dropLocation: { ...dropCoords, address: o.dropLocation || '' },
      };
    });
}

/** Enrich map orders with overview data; fall back to synthetic coords from addresses. */
export function mergeFleetOrders(fromApi: FleetMapOrder[], overviewOrders: Order[]): FleetMapOrder[] {
  const overviewById = new Map(overviewOrders.map((o) => [o.id, o]));

  if (fromApi.length === 0 && overviewOrders.length > 0) {
    return buildFleetOrdersFromOverview(overviewOrders);
  }

  const merged = fromApi.map((o) => {
    const live = overviewById.get(o.id);
    const dropCoords = o.dropLocation;
    const liveDrop = live?.coordinates;
    const drop =
      isValidCoord(dropCoords.lat, dropCoords.lng)
        ? dropCoords
        : isValidCoord(liveDrop?.lat, liveDrop?.lng)
          ? { lat: liveDrop!.lat, lng: liveDrop!.lng, address: dropCoords.address || live?.dropLocation || '' }
          : { ...coordsFromAddress(live?.dropLocation || dropCoords.address), address: dropCoords.address || live?.dropLocation || '' };

    const pickup =
      isValidCoord(o.pickupLocation.lat, o.pickupLocation.lng)
        ? o.pickupLocation
        : {
            ...coordsFromAddress(live?.pickupLocation || o.pickupLocation.address),
            address: o.pickupLocation.address || live?.pickupLocation || '',
          };

    return {
      ...o,
      status: String(o.status).toLowerCase(),
      customerName: live?.customerName ?? o.customerName,
      riderId: o.riderId ?? live?.riderId,
      pickupLocation: pickup,
      dropLocation: drop,
    };
  });

  const mergedIds = new Set(merged.map((o) => o.id));
  for (const live of overviewOrders) {
    if (!isActiveFleetOrderStatus(live.status) || mergedIds.has(live.id)) continue;
    merged.push(...buildFleetOrdersFromOverview([live]));
  }

  return merged;
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
    .filter((o) => isActiveFleetOrderStatus(o.status))
    .map(mapApiOrder)
    .filter((o): o is FleetMapOrder => o != null);

  return { riders, orders };
}
