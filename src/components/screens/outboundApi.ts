/**
 * Outbound Operations API Service
 * Connects frontend to backend API endpoints
 * Based on outbound-operations-documentation.yaml
 */
import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

const API_BASE_URL = (() => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    try { return new URL(String(envUrl).trim()).origin; } catch { return ''; }
  }
  return '';
})();

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Types matching backend response structures from YAML

export interface OutboundSummary {
  success: boolean;
  summary: {
    active_riders: number;
    pending_transfers: number;
    waiting_riders: number;
    in_transit: number;
    store_delays: number;
  };
  date: string;
}

export interface DispatchItem {
  dispatch_id: string;
  rider_id?: string;
  rider_name?: string;
  status: 'waiting' | 'assigned' | 'delayed' | 'in_transit';
  orders_count: number;
  eta?: string;
  dispatch_type: string;
  created_at: string;
  updated_at: string;
}

export interface DispatchQueueResponse {
  success: boolean;
  dispatch_queue: DispatchItem[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface Rider {
  rider_id: string;
  rider_name: string;
  status: 'online' | 'offline' | 'busy' | 'waiting';
  location?: {
    lat: number;
    lng: number;
  };
  current_orders: number;
  max_capacity: number;
  last_update: string;
}

export interface RidersResponse {
  success: boolean;
  riders: Rider[];
}

export interface TransferRequest {
  request_id: string;
  from_store: string;
  to_store: string;
  items_count: number;
  priority: 'Critical' | 'High' | 'Normal';
  sla_remaining?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  requested_at: string;
  expected_dispatch?: string;
}

export interface TransferRequestsResponse {
  success: boolean;
  transfer_requests: TransferRequest[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface FulfillmentStatus {
  success: boolean;
  request_id: string;
  status: string;
  picking_progress: {
    picked: number;
    total: number;
    percentage: number;
  };
  picker?: {
    id: string;
    name: string;
  };
  vehicle_id?: string;
  estimated_completion?: string;
}

export interface SLASummary {
  success: boolean;
  on_time_dispatch_percentage: number;
  average_prep_time: string;
  total_transfers: number;
  completed_transfers: number;
  date: string;
}

export interface BatchDispatchRequest {
  order_ids: string[];
  auto_assign: boolean;
  rider_id?: string;
}

export interface BatchDispatchResponse {
  success: boolean;
  dispatch_id: string;
  assigned_riders: number;
  orders_dispatched: number;
  message: string;
}

export interface ManualAssignRequest {
  order_ids: string[];
  rider_id: string;
  override_sla?: boolean;
}

export interface ManualAssignResponse {
  success: boolean;
  dispatch_id: string;
  rider_id: string;
  rider_name: string;
  orders_assigned: number;
  message: string;
}

export interface ApproveTransferRequest {
  notes?: string;
  priority?: string;
}

export interface ApproveTransferResponse {
  success: boolean;
  request_id: string;
  status: string;
  pick_pack_task_id: string;
  message: string;
}

export interface RejectTransferRequest {
  reason?: string;
  notes?: string;
}

export interface RejectTransferResponse {
  success: boolean;
  request_id: string;
  status: string;
  message: string;
}

// API Functions

export async function fetchOutboundSummary(
  storeId: string = getActiveStoreId() || '',
  date?: string
): Promise<OutboundSummary> {
  const dateParam = date || new Date().toISOString().split('T')[0];
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/summary?storeId=${storeId}&date=${dateParam}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch outbound summary: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDispatchQueue(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all',
  page: number = 1,
  limit: number = 50
): Promise<DispatchQueueResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/dispatch?${params}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dispatch queue: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchActiveRiders(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all'
): Promise<RidersResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/riders?${params}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch riders: ${response.statusText}`);
  }

  return response.json();
}

export async function batchDispatchOrders(
  storeId: string,
  data: BatchDispatchRequest
): Promise<BatchDispatchResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/dispatch/batch?storeId=${storeId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to batch dispatch orders: ${response.statusText}`);
  }

  return response.json();
}

export async function manuallyAssignRider(
  storeId: string,
  data: ManualAssignRequest
): Promise<ManualAssignResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/dispatch/assign?storeId=${storeId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to assign rider: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchTransferRequests(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all',
  page: number = 1,
  limit: number = 50
): Promise<TransferRequestsResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/transfers?${params}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch transfer requests: ${response.statusText}`);
  }

  return response.json();
}

export async function approveTransferRequest(
  requestId: string,
  data: ApproveTransferRequest = {}
): Promise<ApproveTransferResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/transfers/${requestId}/approve`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to approve transfer request: ${response.statusText}`);
  }

  return response.json();
}

export async function rejectTransferRequest(
  requestId: string,
  data: RejectTransferRequest = {}
): Promise<RejectTransferResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/transfers/${requestId}/reject`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to reject transfer request: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchTransferFulfillmentStatus(
  requestId: string
): Promise<FulfillmentStatus> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/transfers/${requestId}/fulfillment`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch fulfillment status: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchTransferSLASummary(
  storeId: string = getActiveStoreId() || '',
  date?: string
): Promise<SLASummary> {
  const dateParam = date || new Date().toISOString().split('T')[0];
  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/outbound/transfers/sla-summary?storeId=${storeId}&date=${dateParam}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch SLA summary: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchOutboundAuditLogs(
  storeId: string = getActiveStoreId() || '',
  params: any = {}
): Promise<any> {
  const queryParams = new URLSearchParams({
    storeId,
    module: 'outbound',
    ...params,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/darkstore/inventory/audit-log?${queryParams}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch outbound audit logs: ${response.statusText}`);
  }

  return response.json();
}

