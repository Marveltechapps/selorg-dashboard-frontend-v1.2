/** Convert backend polygon (lat/lng) to frontend points (x,y 0-100) for SVG map */
export function polygonToPoints(polygon: { lat: number; lng: number }[]): { x: number; y: number }[] {
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

/** Convert frontend points (x,y 0-100) to backend polygon (lat/lng) */
export function pointsToPolygon(points: { x: number; y: number }[]): { lat: number; lng: number }[] {
  if (!points || points.length < 3) return [];
  const centerLat = 19.076;
  const centerLng = 72.8777;
  const scale = 0.01;
  return points.map((p) => ({
    lat: centerLat + (p.y - 50) * scale,
    lng: centerLng + (p.x - 50) * scale,
  }));
}

const TYPE_FROM_API: Record<string, string> = {
  standard: 'Serviceable',
  'no-service': 'Exclusion',
  premium: 'Priority',
  express: 'Promo-Only',
  surge: 'Promo-Only',
};

/** Map backend zone response to frontend Zone shape */
export function mapZoneFromApi(z: Record<string, unknown>): {
  id: string;
  name: string;
  type: string;
  color: string;
  isVisible: boolean;
  status: string;
  areaSqKm?: number;
  polygon?: { lat: number; lng: number }[];
  points: { x: number; y: number }[];
  [key: string]: unknown;
} {
  const polygon = (z.polygon as { lat: number; lng: number }[]) ?? [];
  const points = polygon.length >= 3 ? polygonToPoints(polygon) : [];
  const status = String(z.status ?? 'active');
  const apiType = String(z.type ?? 'standard');
  const type = TYPE_FROM_API[apiType] ?? 'Serviceable';
  return {
    ...z,
    id: String(z.id ?? (z as { _id?: string })._id ?? ''),
    name: String(z.name ?? ''),
    type,
    color: String(z.color ?? '#3b82f6'),
    isVisible: z.isVisible !== false,
    status: status.charAt(0).toUpperCase() + status.slice(1),
    areaSqKm: typeof z.areaSqKm === 'number' ? z.areaSqKm : (z.analytics as { areaSize?: number })?.areaSize,
    polygon,
    points,
  };
}

/** Map backend store response to frontend Store shape */
export function mapStoreFromApi(s: Record<string, unknown>): {
  id: string;
  name: string;
  address: string;
  x: number;
  y: number;
  zones: string[];
  serviceStatus: string;
  [key: string]: unknown;
} {
  const zones = Array.isArray(s.zones) ? s.zones.map(String) : [];
  const x = typeof (s as { x?: number }).x === 'number' ? (s as { x: number }).x : 50;
  const y = typeof (s as { y?: number }).y === 'number' ? (s as { y: number }).y : 50;
  return {
    ...s,
    id: String((s as { _id?: string })._id ?? s.id ?? ''),
    name: String(s.name ?? ''),
    address: String(s.address ?? ''),
    x,
    y,
    zones,
    serviceStatus: String(s.serviceStatus ?? 'None'),
  };
}
