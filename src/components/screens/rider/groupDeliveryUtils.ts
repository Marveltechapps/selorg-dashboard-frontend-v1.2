import type { Cluster, GroupDeliveryOrder } from './groupDeliveryTypes';
import { GROUP_CLUSTER_COLORS, MAX_ORDERS_PER_GROUP } from './groupDeliveryTypes';

export const defaultMapCenter = { lat: 13.0827, lng: 80.2707 };

export function recalcClusterCenter(orders: GroupDeliveryOrder[]): { lat: number; lng: number } {
  const withCoords = orders.filter((o) => o.coordinates);
  if (withCoords.length === 0) return defaultMapCenter;
  return {
    lat: withCoords.reduce((s, o) => s + o.coordinates!.lat, 0) / withCoords.length,
    lng: withCoords.reduce((s, o) => s + o.coordinates!.lng, 0) / withCoords.length,
  };
}

export function collectClusterOrderIds(clusters: Cluster[]): Set<string> {
  return new Set(clusters.flatMap((c) => c.orders.map((o) => o.id)));
}

export function moveOrdersToCluster(
  clusters: Cluster[],
  unclustered: GroupDeliveryOrder[],
  orderIds: string[],
  targetClusterId: string | 'new',
  ordersById: Map<string, GroupDeliveryOrder>
): { clusters: Cluster[]; unclustered: GroupDeliveryOrder[]; createdClusterId?: string } {
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (ids.length === 0) {
    return { clusters, unclustered };
  }

  let nextClusters = clusters.map((c) => ({
    ...c,
    orders: [...c.orders],
  }));
  let nextUnclustered = [...unclustered];

  const pullOrders = (): GroupDeliveryOrder[] => {
    const pulled: GroupDeliveryOrder[] = [];
    for (const id of ids) {
      const fromMap = ordersById.get(id);
      const fromUnclustered = nextUnclustered.find((o) => o.id === id);
      const fromCluster = nextClusters.flatMap((c) => c.orders).find((o) => o.id === id);
      const order = fromMap || fromUnclustered || fromCluster;
      if (order) pulled.push(order);
    }
    return pulled;
  };

  const ordersToMove = pullOrders();
  if (ordersToMove.length === 0) {
    return { clusters, unclustered };
  }

  nextClusters = nextClusters.map((c) => ({
    ...c,
    orders: c.orders.filter((o) => !ids.includes(o.id)),
  }));
  nextUnclustered = nextUnclustered.filter((o) => !ids.includes(o.id));

  let targetIdx = nextClusters.findIndex((c) => c.id === targetClusterId);
  let createdClusterId: string | undefined;

  if (targetClusterId === 'new') {
    createdClusterId = `draft-${Date.now()}`;
    nextClusters.push({
      id: createdClusterId,
      orders: [],
      center: defaultMapCenter,
      color: GROUP_CLUSTER_COLORS[nextClusters.length % GROUP_CLUSTER_COLORS.length],
      isSaved: false,
    });
    targetIdx = nextClusters.length - 1;
  }

  if (targetIdx < 0) {
    nextUnclustered.push(...ordersToMove);
    return { clusters: nextClusters.filter((c) => c.orders.length > 0), unclustered: nextUnclustered };
  }

  const target = nextClusters[targetIdx];
  const combined = [...target.orders, ...ordersToMove.filter((o) => !target.orders.some((x) => x.id === o.id))];
  if (combined.length > MAX_ORDERS_PER_GROUP) {
    const allowed = MAX_ORDERS_PER_GROUP - target.orders.length;
    if (allowed <= 0) {
      nextUnclustered.push(...ordersToMove);
      return { clusters: nextClusters.filter((c) => c.orders.length > 0), unclustered: nextUnclustered };
    }
    const accepted = ordersToMove.slice(0, allowed);
    const rejected = ordersToMove.slice(allowed);
    nextClusters[targetIdx] = {
      ...target,
      orders: [...target.orders, ...accepted],
      center: recalcClusterCenter([...target.orders, ...accepted]),
    };
    nextUnclustered.push(...rejected);
  } else {
    nextClusters[targetIdx] = {
      ...target,
      orders: combined,
      center: recalcClusterCenter(combined),
    };
  }

  nextClusters = nextClusters.filter((c) => c.orders.length > 0);

  return { clusters: nextClusters, unclustered: nextUnclustered, createdClusterId };
}

export function createDraftClusterFromOrders(orders: GroupDeliveryOrder[], index: number): Cluster {
  return {
    id: `draft-${Date.now()}-${index}`,
    orders,
    center: recalcClusterCenter(orders),
    color: GROUP_CLUSTER_COLORS[index % GROUP_CLUSTER_COLORS.length],
    isSaved: false,
  };
}
