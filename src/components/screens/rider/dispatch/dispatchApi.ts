import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { DispatchOrder, DispatchRider, AutoAssignRule, Priority, OrderStatus, RiderStatus } from "./types";
import { logger } from '../../../../utils/logger';

/**
 * API Response Types (from backend)
 */
interface ApiOrderLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface ApiOrder {
  id: string;
  status: string;
  riderId?: string | null;
  etaMinutes?: number | null;
  slaDeadline: string;
  pickupLocation: string | ApiOrderLocation;
  dropLocation: string | ApiOrderLocation;
  customerName: string;
  items: string[];
  zone?: string;
  priority?: string;
  distance?: number;
  createdAt: string;
}

interface ApiRider {
  id: string;
  name: string;
  status: string;
  location?: { lat: number; lng: number } | null;
  zone?: string | null;
  capacity: {
    currentLoad: number;
    maxLoad: number;
  };
  currentOrderId?: string | null;
  avatarInitials?: string;
  rating?: number;
  avgEtaMins?: number;
}

interface ApiRecommendedRider {
  id: string;
  name: string;
  zone: string;
  status: string;
  load: {
    current: number;
    max: number;
  };
  estimatedPickupMinutes: number;
  distance: number | null;
  rating: number;
  score: number;
  isRecommended: boolean;
}

interface ApiMapData {
  riders: ApiRider[];
  orders: Array<{
    id: string;
    status: string;
    pickupLocation: {
      address: string;
      coordinates: { lat: number; lng: number };
    };
    dropLocation: {
      address: string;
      coordinates: { lat: number; lng: number };
    };
    riderId?: string | null;
    priority: string;
    zone?: string;
  }>;
  pickupPoints?: Array<{
    id: string;
    address: string;
    coordinates: { lat: number; lng: number };
    orderCount: number;
  }>;
  statusCounts?: {
    riders?: Record<string, number>;
    orders?: Record<string, number>;
  };
}

/**
 * Helper function to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  logger.apiRequest('DispatchAPI', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    logger.apiResponse('DispatchAPI', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Dispatch API] Error response:`, errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || 'Request failed' };
      }
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.apiSuccess('DispatchAPI', data);
    return data;
  } catch (error) {
    logger.apiError('DispatchAPI', url, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running.`);
    }
    throw error;
  }
}

/**
 * Parse location from API (string or { address, coordinates })
 */
function parseLocation(loc: string | ApiOrderLocation): { lat: number; lng: number; address: string } {
  const address = typeof loc === 'string' ? loc : loc.address;
  // Use API coordinates only; no mock fallbacks
  const coords = typeof loc === 'object' && loc.coordinates
    ? loc.coordinates
    : { lat: 0, lng: 0 };
  return { ...coords, address };
}

/**
 * Transform backend order to frontend order
 */
function transformOrder(apiOrder: ApiOrder): DispatchOrder {
  const priority = (apiOrder.priority || 'low') as Priority;
  const status = apiOrder.status === 'pending' ? 'unassigned' : apiOrder.status as OrderStatus;
  
  return {
    id: apiOrder.id,
    priority,
    distanceKm: apiOrder.distance || 0,
    etaMinutes: apiOrder.etaMinutes ?? 0,
    zone: apiOrder.zone || 'Unknown',
    status,
    pickupLocation: parseLocation(apiOrder.pickupLocation),
    dropLocation: parseLocation(apiOrder.dropLocation),
    riderId: apiOrder.riderId || undefined,
    slaDeadline: apiOrder.slaDeadline,
    createdAt: apiOrder.createdAt,
  };
}

/**
 * Transform backend rider to frontend rider
 */
function transformRider(apiRider: ApiRider): DispatchRider {
  const status = apiRider.status as RiderStatus;
  // Use real API location; no mock coordinates
  const location = apiRider.location ?? { lat: 0, lng: 0 };
  return {
    id: apiRider.id,
    name: apiRider.name,
    status,
    currentLocation: location,
    activeOrdersCount: apiRider.capacity.currentLoad,
    maxCapacity: apiRider.capacity.maxLoad,
    zone: apiRider.zone || 'Unknown',
    avgEtaMinutes: apiRider.avgEtaMins ?? 0,
  };
}

/**
 * Real API implementation
 */
export async function fetchUnassignedOrders(params?: {
  priority?: string;
  zone?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<DispatchOrder[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.priority && params.priority !== 'all') {
    queryParams.append('priority', params.priority);
  }
  if (params?.zone) {
    queryParams.append('zone', params.zone);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params?.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  
  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_ENDPOINTS.dispatch.unassignedOrders}?${queryString}`
    : API_ENDPOINTS.dispatch.unassignedOrders;
  
  const response = await apiRequest<{ orders: ApiOrder[]; total: number; page: number; limit: number; totalPages: number }>(endpoint);
  
  return response.orders.map(transformOrder);
}

export async function fetchAllOrders(): Promise<DispatchOrder[]> {
  // Get map data which includes all orders
  const mapData = await apiRequest<ApiMapData>(API_ENDPOINTS.dispatch.mapData);
  
  return mapData.orders.map(order => ({
    id: order.id,
    priority: order.priority as Priority,
    distanceKm: 0, // Will be calculated
    etaMinutes: 0,
    zone: order.zone || 'Unknown',
    status: order.status === 'pending' ? 'unassigned' : order.status as OrderStatus,
    pickupLocation: {
      ...order.pickupLocation.coordinates,
      address: order.pickupLocation.address,
    },
    dropLocation: {
      ...order.dropLocation.coordinates,
      address: order.dropLocation.address,
    },
    riderId: order.riderId || undefined,
    slaDeadline: new Date().toISOString(), // Will be provided by backend
    createdAt: new Date().toISOString(),
  }));
}

export async function fetchOnlineRiders(): Promise<DispatchRider[]> {
  const mapData = await apiRequest<ApiMapData>(API_ENDPOINTS.dispatch.mapData);
  
  return mapData.riders.map(transformRider);
}

export async function assignOrder(orderId: string, riderId: string, overrideSla?: boolean): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.dispatch.assignOrder,
    {
      method: 'POST',
      body: JSON.stringify({
        orderId,
        riderId,
        overrideSla: overrideSla || false,
      }),
    }
  );
}

export async function autoAssignOrders(orderIds: string[]): Promise<{ assigned: number; failed: number }> {
  const result = await apiRequest<{ assigned: number; failed: number }>(
    API_ENDPOINTS.dispatch.autoAssign,
    {
      method: 'POST',
      body: JSON.stringify({
        orderIds,
      }),
    }
  );
  
  return result;
}

export async function fetchAutoAssignRules(): Promise<AutoAssignRule[]> {
  const response = await apiRequest<AutoAssignRule[]>(API_ENDPOINTS.dispatch.autoAssignRules);
  return Array.isArray(response) ? response : [];
}

export async function updateAutoAssignRule(rule: AutoAssignRule): Promise<void> {
  await apiRequest(API_ENDPOINTS.dispatch.autoAssignRules, {
    method: 'PUT',
    body: JSON.stringify(rule),
  });
}

export interface ManualOrderPayload {
  orderType?: 'standard' | 'express';
  items: string[];
  pickupLocation?: string;
  dropLocation: string;
  customerName: string;
  customerPhone?: string;
  zone?: string;
  riderId?: string;
}

export interface CreateManualOrderResult {
  orderId: string;
  status: string;
  riderId: string | null;
  message: string;
}

export async function createManualOrder(payload: ManualOrderPayload): Promise<CreateManualOrderResult> {
  return apiRequest<CreateManualOrderResult>(API_ENDPOINTS.dispatch.manualOrder, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function batchCreateAssignment(orderIds: string[], riderId: string): Promise<void> {
  // For batch assignment, we need to assign each order individually
  // The backend batch-assign endpoint assigns to best available riders automatically
  // So we'll use individual assignments for manual batch assignment to a specific rider
  const results = await Promise.allSettled(
    orderIds.map(orderId => assignOrder(orderId, riderId, false))
  );
  
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    throw new Error(`${failed} of ${orderIds.length} assignments failed`);
  }
}

/**
 * Get recommended riders for an order
 */
export async function fetchRecommendedRiders(orderId: string, search?: string): Promise<ApiRecommendedRider[]> {
  const queryParams = new URLSearchParams();
  if (search) {
    queryParams.append('search', search);
  }
  
  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_ENDPOINTS.dispatch.recommendedRiders(orderId)}?${queryString}`
    : API_ENDPOINTS.dispatch.recommendedRiders(orderId);
  
  const response = await apiRequest<{ riders: ApiRecommendedRider[]; orderDetails: any }>(endpoint);
  
  return response.riders;
}

/**
 * Get order assignment details
 */
export async function fetchOrderAssignmentDetails(orderId: string): Promise<any> {
  return await apiRequest(API_ENDPOINTS.dispatch.orderAssignmentDetails(orderId));
}
