import { apiRequest } from '@/api/apiClient';

export type AlertType = 
  | "sla_breach" 
  | "delayed_delivery" 
  | "rider_no_show" 
  | "zone_deviation" 
  | "vehicle_breakdown" 
  | "rto_return" 
  | "other";

export type AlertPriority = "critical" | "high" | "medium" | "low";

export type AlertStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export interface AlertTimelineEntry {
  at: string;
  status: string;
  note?: string;
  actor?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  priority: AlertPriority;
  createdAt: string;
  lastUpdatedAt: string;
  source: {
    orderId?: string;
    riderId?: string;
    riderName?: string;
    vehicleId?: string;
    zone?: string;
    lat?: number;
    lng?: number;
    [key: string]: any;
  };
  status: AlertStatus;
  actionsSuggested: string[];
  timeline: AlertTimelineEntry[];
}

export interface AlertActionPayload {
  actionType: "notify_customer" | "reassign_rider" | "call_rider" | "mark_offline" | "view_location" | "add_note" | "resolve" | "acknowledge";
  metadata?: any;
}

// --- API Functions ---

const MOCK_ALERTS: Alert[] = [
  { id: 'ALT-001', type: 'sla_breach', title: 'SLA breach – delivery delayed', description: 'Order ORD-2001 is 15 min past promised ETA.', priority: 'critical', createdAt: new Date(Date.now() - 10 * 60000).toISOString(), lastUpdatedAt: new Date().toISOString(), source: { orderId: 'ORD-2001', riderId: 'R1', riderName: 'Raj K', zone: 'Brooklyn' }, status: 'open', actionsSuggested: ['notify_customer', 'reassign_rider', 'call_rider'], timeline: [] },
  { id: 'ALT-002', type: 'rto_return', title: 'RTO risk – customer unreachable', description: 'Order ORD-2002: 2 call attempts failed.', priority: 'high', createdAt: new Date(Date.now() - 30 * 60000).toISOString(), lastUpdatedAt: new Date().toISOString(), source: { orderId: 'ORD-2002', riderId: 'R2', riderName: 'Priya M' }, status: 'acknowledged', actionsSuggested: ['notify_customer', 'add_note'], timeline: [] },
];

export async function fetchAlerts(statusFilter?: AlertStatus | "all"): Promise<Alert[]> {
  try {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") {
      params.append('status', statusFilter);
    }
    
    const endpoint = `/production/alerts${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiRequest<{ success: boolean; alerts: Alert[] }>(endpoint);
    if (response?.alerts?.length) return response.alerts;
    return MOCK_ALERTS;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return MOCK_ALERTS;
  }
}

export async function fetchAlertById(id: string): Promise<Alert | undefined> {
  try {
    const response = await apiRequest<{ success: boolean; alert: Alert }>(`/production/alerts/${id}`);
    return response.alert;
  } catch (error) {
    console.error('Failed to fetch alert:', error);
    return undefined;
  }
}

export async function performAlertAction(id: string, payload: AlertActionPayload): Promise<Alert> {
  try {
    const response = await apiRequest<{ success: boolean; alert: Alert; message?: string }>(
      `/production/alerts/${id}/action`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return response.alert;
  } catch (error) {
    console.error('Failed to perform alert action:', error);
    throw error;
  }
}

export async function clearResolvedAlerts(): Promise<void> {
  try {
    await apiRequest<{ success: boolean; deleted_count: number; message: string }>(
      '/production/alerts/resolved',
      {
        method: 'DELETE',
      }
    );
  } catch (error) {
    console.error('Failed to clear resolved alerts:', error);
    throw error;
  }
}
