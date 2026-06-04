import type { Order, Rider } from './types';
import { normalizeOrderId } from './riderApi';

/** Resolve delivery rider id from mixed warehouse / darkstore / v2 API shapes. */
export function extractOrderRiderId(raw: Record<string, unknown> | null | undefined): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const topLevel = raw.riderId ?? raw.rider_id;
  if (typeof topLevel === 'string' && topLevel.trim()) return topLevel.trim();

  const ra = raw.riderAssignment as { riderId?: string } | undefined;
  if (ra?.riderId && String(ra.riderId).trim()) return String(ra.riderId).trim();

  const rider = raw.rider as { id?: string } | undefined;
  if (rider?.id && String(rider.id).trim()) return String(rider.id).trim();

  const assignee = raw.assignee as { id?: string; name?: string } | undefined;
  if (assignee?.id && String(assignee.id).trim()) {
    const name = String(assignee.name || '').toLowerCase();
    if (name !== 'unassigned') return String(assignee.id).trim();
  }

  return undefined;
}

export function extractOrderRiderName(raw: Record<string, unknown> | null | undefined): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const rider = raw.rider as { name?: string } | undefined;
  if (rider?.name && String(rider.name).trim()) return String(rider.name).trim();
  const assignee = raw.assignee as { name?: string } | undefined;
  if (assignee?.name && String(assignee.name).toLowerCase() !== 'unassigned') {
    return String(assignee.name).trim();
  }
  if (typeof raw.riderName === 'string' && raw.riderName.trim()) return raw.riderName.trim();
  return undefined;
}

export function extractOrderAssignedAt(raw: Record<string, unknown> | null | undefined): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const ra = raw.riderAssignment as { assignedAt?: string | Date } | undefined;
  if (ra?.assignedAt) {
    const d = ra.assignedAt instanceof Date ? ra.assignedAt : new Date(ra.assignedAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof raw.assignedAt === 'string') return raw.assignedAt;
  if (raw.assignedAt instanceof Date) return raw.assignedAt.toISOString();
  const timeline = raw.timeline as Array<{ status?: string; time?: string; timestamp?: string }> | undefined;
  if (Array.isArray(timeline)) {
    const assigned = [...timeline].reverse().find((e) => String(e.status || '').toLowerCase() === 'assigned');
    const t = assigned?.time || assigned?.timestamp;
    if (t) return typeof t === 'string' ? t : new Date(t).toISOString();
  }
  return undefined;
}

export function enrichOrderAssignment<T extends Order>(order: T, raw?: Record<string, unknown>): T {
  const src = raw ?? (order as unknown as Record<string, unknown>);
  const riderId = order.riderId || extractOrderRiderId(src);
  const riderName = order.riderName || extractOrderRiderName(src);
  const assignedAt = order.assignedAt || extractOrderAssignedAt(src);
  if (!riderId && !riderName) return order;
  return { ...order, riderId, riderName, assignedAt };
}

/** Match fleet rider by id (supports RDR- vs RIDER- formats). */
export function findFleetRider(riders: Rider[], riderId?: string): Rider | undefined {
  if (!riderId) return undefined;
  let rider = riders.find((r) => r.id === riderId);
  if (rider) return rider;

  const normalizeId = (id: string) => {
    const upperId = id.toUpperCase();
    if (upperId.startsWith('RDR-')) return upperId;
    const match = upperId.match(/^(?:R|RIDER-?)(\d+)$/);
    if (match) return `RIDER-${String(parseInt(match[1], 10)).padStart(4, '0')}`;
    return upperId;
  };

  const normalizedId = normalizeId(riderId);
  return riders.find((r) => {
    const rNorm = normalizeId(r.id);
    return rNorm === normalizedId || r.id === normalizedId || r.id === riderId;
  });
}

/** Merge WebSocket live orders with REST list so rider assignments are not lost. */
export function mergeLiveOrdersWithApi(wsOrders: Order[] | null, apiOrders: Order[]): Order[] {
  if (!wsOrders || wsOrders.length === 0) return apiOrders;

  const apiByKey = new Map<string, Order>();
  for (const o of apiOrders) {
    apiByKey.set(normalizeOrderId(o.id), o);
  }

  const merged: Order[] = wsOrders.map((wsO) => {
    const apiO = apiByKey.get(normalizeOrderId(wsO.id));
    if (!apiO) return wsO;
    return enrichOrderAssignment({
      ...wsO,
      riderId: wsO.riderId || apiO.riderId,
      riderName: wsO.riderName || apiO.riderName,
      assignedAt: wsO.assignedAt || apiO.assignedAt,
      etaMinutes: wsO.etaMinutes ?? apiO.etaMinutes,
      status: wsO.riderId || apiO.riderId ? (apiO.status || wsO.status) : wsO.status,
    });
  });

  const mergedKeys = new Set(merged.map((o) => normalizeOrderId(o.id)));
  for (const o of apiOrders) {
    if (!mergedKeys.has(normalizeOrderId(o.id))) merged.push(o);
  }
  return merged;
}
