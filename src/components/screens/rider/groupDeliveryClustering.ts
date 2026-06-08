import type { Cluster, GroupDeliveryOrder } from './groupDeliveryTypes';
import { GROUP_CLUSTER_COLORS, MAX_ORDERS_PER_GROUP } from './groupDeliveryTypes';
import { createDraftClusterFromOrders, recalcClusterCenter } from './groupDeliveryUtils';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Greedy proximity clustering for unassigned orders with coordinates. */
export function suggestAutoClusters(
  orders: GroupDeliveryOrder[],
  existingClusterCount = 0
): Cluster[] {
  const pool = orders.filter((o) => o.coordinates);
  if (pool.length === 0) return [];

  const remaining = [...pool];
  const clusters: Cluster[] = [];
  let colorIndex = existingClusterCount;

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const clusterOrders: GroupDeliveryOrder[] = [seed];

    remaining.sort(
      (a, b) =>
        haversineKm(seed.coordinates!, a.coordinates!) -
        haversineKm(seed.coordinates!, b.coordinates!)
    );

    while (clusterOrders.length < MAX_ORDERS_PER_GROUP && remaining.length > 0) {
      const nearest = remaining[0];
      const center = recalcClusterCenter(clusterOrders);
      const spread = haversineKm(center, nearest.coordinates!);
      if (spread > 8) break;
      clusterOrders.push(remaining.shift()!);
    }

    clusters.push(createDraftClusterFromOrders(clusterOrders, colorIndex));
    colorIndex += 1;
  }

  return clusters;
}

/** Rough route distance: hub center → each stop (nearest-neighbor tour estimate). */
export function estimateClusterRouteKm(orders: GroupDeliveryOrder[]): number {
  const withCoords = orders.filter((o) => o.coordinates);
  if (withCoords.length === 0) return 0;

  const center = recalcClusterCenter(withCoords);
  let total = 0;
  const unvisited = [...withCoords];
  let current = center;

  while (unvisited.length > 0) {
    unvisited.sort(
      (a, b) => haversineKm(current, a.coordinates!) - haversineKm(current, b.coordinates!)
    );
    const next = unvisited.shift()!;
    total += haversineKm(current, next.coordinates!);
    current = next.coordinates!;
  }

  total += haversineKm(current, center);
  return parseFloat(total.toFixed(2));
}

export function estimateClusterDeliveryMinutes(distanceKm: number, orderCount: number): number {
  const travel = (distanceKm / 25) * 60;
  const stops = orderCount * 6;
  return Math.round(travel + stops);
}
