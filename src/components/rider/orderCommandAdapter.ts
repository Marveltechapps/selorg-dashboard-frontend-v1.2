import type { Order, OrderStatus } from '../screens/rider/overview/types';
import type { DispatchOrder } from '../screens/rider/dispatch/types';
import type { Alert } from '@/api/alerts/alertsApi';

function geoAddress(loc: string | { address?: string; lat?: number; lng?: number } | undefined): string {
  if (!loc) return '—';
  if (typeof loc === 'string') return loc;
  return loc.address || `${loc.lat ?? ''}, ${loc.lng ?? ''}`.trim() || '—';
}

export function dispatchOrderToCommandOrder(o: DispatchOrder): Order {
  return {
    id: o.id,
    status: (o.status === 'unassigned' ? 'pending' : o.status) as OrderStatus,
    riderId: o.riderId,
    slaDeadline: o.slaDeadline || new Date(Date.now() + 3600000).toISOString(),
    pickupLocation: geoAddress(o.pickupLocation),
    dropLocation: geoAddress(o.dropLocation),
    customerName: 'Customer',
    items: [],
    timeline: [],
    etaMinutes: o.etaMinutes,
    coordinates: o.dropLocation && typeof o.dropLocation === 'object'
      ? { lat: o.dropLocation.lat, lng: o.dropLocation.lng }
      : undefined,
  };
}

export function alertToCommandOrder(alert: Alert): Order | null {
  const orderId = alert.source?.orderId;
  if (!orderId) return null;
  return {
    id: String(orderId),
    status: 'pending',
    riderId: alert.source?.riderId,
    riderName: alert.source?.riderName,
    slaDeadline: new Date(Date.now() + 3600000).toISOString(),
    pickupLocation: alert.source?.pickupLocation || 'Hub',
    dropLocation: alert.source?.dropLocation || alert.source?.address || alert.source?.zone || 'Delivery address',
    customerName: alert.source?.customerName || 'Customer',
    items: [],
    timeline: [],
  };
}

export function escalationToCommandOrder(esc: {
  orderId: string;
  riderId?: string;
  riderName?: string;
  customerName?: string;
  ticketId?: string;
}): Order {
  return {
    id: esc.orderId,
    status: 'delayed',
    riderId: esc.riderId,
    riderName: esc.riderName,
    slaDeadline: new Date(Date.now() + 3600000).toISOString(),
    pickupLocation: 'Hub',
    dropLocation: 'Delivery address',
    customerName: esc.customerName || 'Customer',
    items: [],
    timeline: [],
  };
}
