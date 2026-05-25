/** Shared geofence mapping helpers (merch UI ↔ API) */

export const MUMBAI_MAP_CENTER = { lat: 19.076, lng: 72.8777 };

const TYPE_FROM_API: Record<string, string> = {
  standard: 'Serviceable',
  'no-service': 'Exclusion',
  premium: 'Priority',
  express: 'Promo-Only',
  surge: 'Promo-Only',
};

const TYPE_TO_API: Record<string, string> = {
  Serviceable: 'standard',
  Exclusion: 'no-service',
  Priority: 'premium',
  'Promo-Only': 'express',
};

export function typeFromApi(apiType: string): string {
  return TYPE_FROM_API[apiType] ?? 'Serviceable';
}

export function typeToApi(uiType: string): string {
  return TYPE_TO_API[uiType] ?? 'standard';
}

export function statusFromApi(status: string): string {
  const s = String(status ?? 'active').toLowerCase();
  if (s === 'inactive') return 'Inactive';
  if (s === 'testing') return 'Active';
  return 'Active';
}

export function statusToApi(status: string): string {
  return status === 'Inactive' ? 'inactive' : 'active';
}

/** Convert backend polygon (lat/lng) to frontend points (x,y 0-100) for legacy SVG fallback */
export function polygonToPoints(
  polygon: { lat: number; lng: number }[],
  center = MUMBAI_MAP_CENTER,
): { x: number; y: number }[] {
  if (!polygon || polygon.length < 3) return [];
  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const rangeLat = maxLat - minLat || 0.01;
  const rangeLng = maxLng - minLng || 0.01;
  const pad = 5;
  return polygon.map((p) => ({
    x: pad + ((p.lng - minLng) / rangeLng) * (100 - 2 * pad),
    y: 100 - pad - ((p.lat - minLat) / rangeLat) * (100 - 2 * pad),
  }));
}

/** Legacy percent points → lat/lng around center */
export function pointsToPolygon(
  points: { x: number; y: number }[],
  center = MUMBAI_MAP_CENTER,
): { lat: number; lng: number }[] {
  if (!points || points.length < 3) return [];
  const scale = 0.01;
  return points.map((p) => ({
    lat: center.lat + (p.y - 50) * scale,
    lng: center.lng + (p.x - 50) * scale,
  }));
}

export function latLngFromLegacyPercent(
  x: number,
  y: number,
  center = MUMBAI_MAP_CENTER,
): { lat: number; lng: number } {
  const scale = 0.08;
  return {
    lat: center.lat + (50 - y) * scale * 0.01,
    lng: center.lng + (x - 50) * scale * 0.01,
  };
}

export function polygonAreaSqKm(polygon: { lat: number; lng: number }[]): number {
  if (!polygon || polygon.length < 3) return 0;
  const meanLatRad = (polygon.reduce((s, p) => s + p.lat, 0) / polygon.length) * (Math.PI / 180);
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(meanLatRad);
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const x1 = curr.lng * kmPerDegLng;
    const y1 = curr.lat * kmPerDegLat;
    const x2 = next.lng * kmPerDegLng;
    const y2 = next.lat * kmPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.round((Math.abs(area) / 2) * 10) / 10;
}

export function mapZoneFromApi(z: Record<string, unknown>) {
  const polygon = cleanPolygon((z.polygon as { lat: number; lng: number }[]) ?? []);
  const points = polygon.length >= 3 ? polygonToPoints(polygon) : [];
  const apiType = String(z.type ?? 'standard');
  const analytics = (z.analytics as Record<string, unknown>) ?? {};
  const settings = (z.settings as Record<string, unknown>) ?? {};
  return {
    ...z,
    id: String(z.id ?? (z as { _id?: string })._id ?? ''),
    name: String(z.name ?? ''),
    type: typeFromApi(apiType),
    color: String(z.color ?? '#3b82f6'),
    isVisible: z.isVisible !== false,
    status: statusFromApi(String(z.status ?? 'active')),
    areaSqKm: typeof z.areaSqKm === 'number'
      ? z.areaSqKm
      : Number(analytics.areaSize ?? 0),
    polygon,
    center: (z.center as { lat: number; lng: number }) ?? (polygon[0] ? polygon[0] : MUMBAI_MAP_CENTER),
    points,
    analytics,
    settings,
    storesCovered: Number(analytics.storesCovered ?? 0),
  };
}

export function mapStoreFromApi(s: Record<string, unknown>) {
  const zones = Array.isArray(s.zones) ? s.zones.map(String) : [];
  const lat = typeof s.latitude === 'number' ? s.latitude : undefined;
  const lng = typeof s.longitude === 'number' ? s.longitude : undefined;
  const x = typeof (s as { x?: number }).x === 'number' ? (s as { x: number }).x : 50;
  const y = typeof (s as { y?: number }).y === 'number' ? (s as { y: number }).y : 50;
  const position = lat != null && lng != null
    ? { lat, lng }
    : latLngFromLegacyPercent(x, y);
  return {
    ...s,
    id: String((s as { _id?: string })._id ?? s.id ?? ''),
    name: String(s.name ?? ''),
    address: String(s.address ?? ''),
    x,
    y,
    latitude: position.lat,
    longitude: position.lng,
    zones,
    serviceStatus: String(s.serviceStatus ?? 'None'),
  };
}

export function cleanPolygon(polygon: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  return (polygon ?? []).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
}

export function buildCreateZonePayload(zone: {
  name: string;
  type: string;
  status: string;
  color: string;
  isVisible: boolean;
  polygon?: { lat: number; lng: number }[];
  areaSqKm?: number;
  city?: string;
  region?: string;
  settings?: Record<string, unknown>;
}) {
  const polygon = cleanPolygon(zone.polygon ?? []);
  const areaSqKm = zone.areaSqKm ?? polygonAreaSqKm(polygon);
  const center = polygon.length >= 3
    ? {
        lat: polygon.reduce((s, p) => s + p.lat, 0) / polygon.length,
        lng: polygon.reduce((s, p) => s + p.lng, 0) / polygon.length,
      }
    : MUMBAI_MAP_CENTER;
  return {
    name: zone.name,
    type: typeToApi(zone.type),
    status: statusToApi(zone.status),
    color: zone.color,
    isVisible: zone.isVisible,
    city: zone.city ?? 'Mumbai',
    region: zone.region ?? 'West',
    polygon: polygon.length >= 3 ? polygon : undefined,
    center,
    areaSqKm,
    settings: zone.settings,
  };
}

export function buildUpdateZonePayload(updates: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  if (updates.name != null) payload.name = updates.name;
  if (updates.type != null) payload.type = typeToApi(String(updates.type));
  if (updates.status != null) payload.status = statusToApi(String(updates.status));
  if (updates.color != null) payload.color = updates.color;
  if (updates.isVisible != null) payload.isVisible = updates.isVisible;
  if (updates.areaSqKm != null) payload.areaSqKm = updates.areaSqKm;
  if (updates.city != null) payload.city = updates.city;
  if (updates.region != null) payload.region = updates.region;
  if (updates.description != null) payload.description = updates.description;
  if (Array.isArray(updates.polygon) && (updates.polygon as { lat: number; lng: number }[]).length >= 3) {
    const polygon = cleanPolygon(updates.polygon as { lat: number; lng: number }[]);
    payload.polygon = polygon;
    payload.areaSqKm = polygonAreaSqKm(polygon);
    payload.center = {
      lat: polygon.reduce((s, p) => s + p.lat, 0) / polygon.length,
      lng: polygon.reduce((s, p) => s + p.lng, 0) / polygon.length,
    };
  }
  if (updates.settings != null) payload.settings = updates.settings;
  return payload;
}
