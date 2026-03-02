/**
 * Inbound Operations API Service
 * Connects frontend to backend API endpoints
 */

import { API_CONFIG } from '../../config/api';
import { getActiveStoreId } from '../../contexts/AuthContext';

const API_BASE_URL = API_CONFIG.baseURL;

// Types matching backend response structures
export interface InboundSummary {
  success: boolean;
  summary: {
    trucks_today: number;
    pending_grn: number;
    putaway_tasks: number;
    inter_store_transfers: number;
  };
  date: string;
}

export interface GRNOrder {
  grn_id: string;
  truck_id: string;
  supplier: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  items_count: number;
  total_quantity: number;
  received_quantity: number;
  expected_arrival: string;
  actual_arrival: string | null;
  created_at: string;
  updated_at: string;
}

export interface GRNListResponse {
  success: boolean;
  grn_orders: GRNOrder[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface GRNItem {
  sku: string;
  product_name: string;
  expected_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  status: 'pending' | 'received' | 'damaged' | 'completed';
}

export interface GRNDetailsResponse {
  success: boolean;
  grn: {
    grn_id: string;
    truck_id: string;
    supplier: string;
    status: string;
    items: GRNItem[];
    expected_arrival: string;
    actual_arrival: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
  };
}

export interface PutawayTask {
  task_id: string;
  grn_id?: string;
  transfer_id?: string;
  sku: string;
  product_name: string;
  quantity: number;
  location: string;
  actual_location: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  assigned_to: string | null;
  staff_id: string | null;
  staff_name: string | null;
  store_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PutawayTasksResponse {
  success: boolean;
  putaway_tasks: PutawayTask[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface InterStoreTransfer {
  transfer_id: string;
  from_store: string;
  to_store: string;
  status: 'pending' | 'in_transit' | 'received' | 'rejected';
  items_count: number;
  total_quantity: number;
  requested_at: string;
  expected_arrival: string;
  actual_arrival: string | null;
}

export interface TransfersResponse {
  success: boolean;
  transfers: InterStoreTransfer[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// API Functions

export async function fetchInboundSummary(storeId: string = getActiveStoreId() || '', date?: string): Promise<InboundSummary> {
  const dateParam = date || new Date().toISOString().split('T')[0];
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/summary?storeId=${storeId}&date=${dateParam}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch inbound summary: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchGRNList(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all',
  page: number = 1,
  limit: number = 50
): Promise<GRNListResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/grn?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch GRN list: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchGRNDetails(grnId: string): Promise<GRNDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/grn/${grnId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch GRN details: ${response.statusText}`);
  }
  
  return response.json();
}

export async function startGRNProcessing(
  grnId: string,
  data: { actual_arrival?: string; notes?: string }
): Promise<{ success: boolean; message: string; grn_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/grn/${grnId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to start GRN processing: ${response.statusText}`);
  }
  
  return response.json();
}

export async function updateGRNItemQuantity(
  grnId: string,
  sku: string,
  data: { received_quantity: number; damaged_quantity?: number; notes?: string }
): Promise<{ success: boolean; message: string; grn_id: string; sku: string; received_quantity: number; damaged_quantity: number }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/grn/${grnId}/items/${sku}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update GRN item quantity: ${response.statusText}`);
  }
  
  return response.json();
}

export async function completeGRNProcessing(
  grnId: string,
  data: { notes?: string; auto_create_putaway?: boolean }
): Promise<{ success: boolean; message: string; grn_id: string; status: string; putaway_tasks_created?: number }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/grn/${grnId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to complete GRN processing: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchPutawayTasks(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all',
  page: number = 1,
  limit: number = 50
): Promise<PutawayTasksResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/putaway?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch putaway tasks: ${response.statusText}`);
  }
  
  return response.json();
}

export async function assignPutawayTask(
  taskId: string,
  data: { staff_id: string; staff_name: string }
): Promise<{ success: boolean; message: string; task_id: string; assigned_to: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/putaway/${taskId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to assign putaway task: ${response.statusText}`);
  }
  
  return response.json();
}

export async function completePutawayTask(
  taskId: string,
  data: { actual_location?: string; notes?: string }
): Promise<{ success: boolean; message: string; task_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/putaway/${taskId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to complete putaway task: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchInterStoreTransfers(
  storeId: string = getActiveStoreId() || '',
  status: string = 'all',
  page: number = 1,
  limit: number = 50
): Promise<TransfersResponse> {
  const params = new URLSearchParams({
    storeId,
    status,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/transfers?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch transfers: ${response.statusText}`);
  }
  
  return response.json();
}

export async function receiveInterStoreTransfer(
  transferId: string,
  data: { actual_arrival?: string; notes?: string; auto_create_putaway?: boolean }
): Promise<{ success: boolean; message: string; transfer_id: string; status: string; putaway_tasks_created?: number }> {
  const response = await fetch(`${API_BASE_URL}/darkstore/inbound/transfers/${transferId}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to receive transfer: ${response.statusText}`);
  }
  
  return response.json();
}

