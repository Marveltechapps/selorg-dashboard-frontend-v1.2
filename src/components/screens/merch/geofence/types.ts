export type ZoneType = 'Serviceable' | 'Exclusion' | 'Priority' | 'Promo-Only';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  color: string;
  isVisible: boolean;
  status: 'Active' | 'Inactive';
  description?: string;
  areaSqKm?: number;
  storesCovered?: number;
  polygon?: { lat: number; lng: number }[];
  center?: { lat: number; lng: number };
  points: { x: number; y: number }[];
  analytics?: {
    areaSize?: number;
    revenue?: number;
    dailyOrders?: number;
    activeOrders?: number;
    totalOrders?: number;
    avgDeliveryTime?: number;
    riderCount?: number;
    capacityUsage?: number;
  };
  settings?: {
    deliveryFee?: number;
    minOrderValue?: number;
    maxDeliveryRadius?: number;
    estimatedDeliveryTime?: number;
    surgeMultiplier?: number;
    maxCapacity?: number;
  };
}

export interface Store {
  id: string;
  name: string;
  address: string;
  x: number;
  y: number;
  latitude?: number;
  longitude?: number;
  zones: string[];
  serviceStatus: 'Full' | 'Partial' | 'None';
}

export type TopPromoMetric = 'redemptions' | 'revenue' | 'orders';

export interface KPIStats {
  totalZones: number;
  activeZones: number;
  inactiveZones: number;
  totalArea: number;
  storesFullyCovered: number;
  storesPartial: number;
  storesNone: number;
  storesTotal: number;
  topPromoZone: string;
  topPromoMetric: TopPromoMetric;
  topPromoValue: number;
  heatmapDays?: number;
}
