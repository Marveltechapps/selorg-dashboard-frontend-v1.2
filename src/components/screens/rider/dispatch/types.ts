export type Priority = "high" | "medium" | "low";
export type OrderStatus = "unassigned" | "assigned" | "in_transit" | "delivered" | "cancelled";
export type RiderStatus = "online" | "offline" | "busy" | "idle";

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface DispatchOrder {
  id: string;
  priority: Priority;
  distanceKm: number;
  etaMinutes: number;
  zone: string;
  status: OrderStatus;
  pickupLocation: GeoLocation;
  dropLocation: GeoLocation;
  riderId?: string;
  slaDeadline: string; // ISO String
  createdAt: string; // ISO String
}

export interface DispatchRider {
  id: string;
  name: string;
  status: RiderStatus;
  currentLocation: { lat: number; lng: number };
  activeOrdersCount: number;
  maxCapacity: number;
  zone: string;
  avgEtaMinutes: number;
}

export interface AutoAssignRule {
  id: string;
  name: string;
  isActive: boolean;
  criteria: {
    maxRadiusKm: number;
    maxOrdersPerRider: number;
    preferSameZone: boolean;
    priorityWeight: number; // 0-10
    distanceWeight: number; // 0-10
    etaWeight: number; // 0-10
  };
  createdBy: string;
  updatedAt: string;
}
