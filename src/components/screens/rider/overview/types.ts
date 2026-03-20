export type RiderStatus = "online" | "offline" | "busy" | "idle";
export type OrderStatus = "assigned" | "picked_up" | "in_transit" | "delivered" | "rto" | "returned" | "delayed" | "pending" | "new" | "ready" | "processing" | "picking" | "picked" | "packed" | "ready_for_dispatch" | "cancelled" | "ASSIGNED" | "PICKED";

export interface Rider {
  id: string;
  name: string;
  /**
   * Optional phone number (from v2 /delivery/riders),
   * used for display/search in dashboards.
   */
  phone?: string;
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
  coordinates?: { lat: number; lng: number };
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
