export type RiderStatus = "online" | "offline" | "busy" | "idle";
export type OrderStatus = "assigned" | "picked_up" | "in_transit" | "delivered" | "rto" | "returned" | "delayed" | "pending";

export interface Rider {
  id: string;
  name: string;
  avatarInitials: string;
  status: RiderStatus;
  currentOrderId?: string;
  location?: { lat: number; lng: number };
  capacity: { currentLoad: number; maxLoad: number };
  avgEtaMins: number;
  rating: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  riderId?: string;
  etaMinutes?: number;
  slaDeadline: string; // ISO string
  pickupLocation: string;
  dropLocation: string;
  customerName: string;
  items: string[];
  timeline: { status: OrderStatus; time: string; note?: string }[];
}

export interface DashboardSummary {
  activeRiders: number;
  maxRiders: number;
  busyRiders?: number;
  idleRiders?: number;
  activeRiderUtilizationPercent: number;
  ordersInTransit: number;
  ordersInTransitChangePercent: number;
  avgDeliveryTimeSeconds: number;
  avgDeliveryTimeWithinSla: boolean;
  slaBreaches: number;
}
