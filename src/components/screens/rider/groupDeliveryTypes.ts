import type { Order } from './overview/types';

export type SlaRiskLevel = 'high' | 'medium' | 'low' | 'ok';

export interface GroupDeliveryOrder extends Order {
  zone?: string | null;
  distanceKm?: number;
  riderEarning?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface ClusterMetrics {
  orderCount: number;
  totalDistanceKm: number;
  estimatedDeliveryMinutes: number;
  totalEarnings: number;
  slaRisk: SlaRiskLevel;
  slaRiskLabel: string;
  ordersAtRisk: number;
  missingOrderCount?: number;
}

export interface GroupDeliveryFilterOptions {
  zones: string[];
  statuses: string[];
}

export interface Cluster {
  id: string;
  clusterId?: string;
  orders: GroupDeliveryOrder[];
  center: { lat: number; lng: number };
  color: string;
  status?: 'active' | 'assigned' | 'completed' | 'cancelled';
  isSaved?: boolean;
}

export const GROUP_CLUSTER_COLORS = [
  '#F97316',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#6366F1',
  '#14B8A6',
];

export const MAX_ORDERS_PER_GROUP = 10;

export const DND_ORDER_TYPE = 'GROUP_DELIVERY_ORDER';

export interface DragOrderItem {
  orderIds: string[];
}
