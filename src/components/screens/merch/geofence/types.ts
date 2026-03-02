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
  // Mock geometry for SVG
  points: { x: number; y: number }[]; // Percentages 0-100 relative to map container
}

export interface Store {
  id: string;
  name: string;
  address: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  zones: string[]; // Zone IDs
  serviceStatus: 'Full' | 'Partial' | 'None';
}

export interface KPIStats {
  activeZones: number;
  totalArea: number;
  storesFullyCovered: number;
  storesTotal: number;
  topPromoZone: string;
}
