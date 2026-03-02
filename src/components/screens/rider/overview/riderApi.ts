import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { Rider, Order, DashboardSummary, OrderStatus } from './types';
import { logger } from '../../../../utils/logger';

/**
 * API Response Types (from backend)
 */
interface ApiRider {
  id: string;
  name: string;
  avatarInitials: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  currentOrderId?: string | null;
  location?: { lat: number; lng: number } | null;
  capacity: { currentLoad: number; maxLoad: number };
  avgEtaMins: number;
  rating: number;
  zone?: string | null;
}

interface ApiOrder {
  id: string;
  status: OrderStatus;
  riderId?: string | null;
  rider_id?: string | null; // Backend might use snake_case
  etaMinutes?: number | null;
  eta_minutes?: number | null; // Backend might use snake_case
  slaDeadline: string;
  sla_deadline?: string; // Backend might use snake_case
  pickupLocation: string;
  pickup_location?: string; // Backend might use snake_case
  dropLocation: string;
  drop_location?: string; // Backend might use snake_case
  customerName: string;
  customer_name?: string; // Backend might use snake_case
  items: string[];
  timeline?: { status: OrderStatus; time: string; note?: string }[];
}

interface ApiDashboardSummary {
  activeRiders: number;
  maxRiders: number;
  busyRiders?: number;
  idleRiders?: number;
  activeRiderUtilizationPercent: number;
  fleetUtilizationPercent?: number; // Overall fleet utilization (active/total)
  ordersInTransit: number;
  ordersInTransitChangePercent: number;
  avgDeliveryTimeSeconds: number;
  avgDeliveryTimeWithinSla: boolean;
  slaBreaches: number;
}

interface ApiListResponse<T> {
  riders?: T[];
  orders?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/**
 * Helper function to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  logger.apiRequest('RiderAPI', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    logger.apiResponse('RiderAPI', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[RiderAPI] Error response (${response.status}):`, errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || 'Request failed' };
      }
      // Extract error message properly - handle nested error objects
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try multiple paths to extract error message
        errorMessage = error.message || error.error || error.msg || errorMessage;
        // If still an object, try nested paths
        if (typeof errorMessage === 'object') {
          errorMessage = (errorMessage as any)?.message || (error as any)?.error?.message || 'Request failed';
        }
        // Ensure it's a string
        if (typeof errorMessage !== 'string') {
          errorMessage = String(errorMessage);
        }
        // Avoid [object Object] - try to extract meaningful message
        if (errorMessage === '[object Object]' || errorMessage === '{}' || errorMessage.startsWith('{')) {
          const nestedMsg = (error as any)?.error?.message || (error as any)?.message?.message || (error as any)?.details?.message;
          errorMessage = nestedMsg || 'Request failed';
        }
      }
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).details = error.details || error;
      throw apiError;
    }

    const data = await response.json();
    logger.apiSuccess('RiderAPI', data);
    return data;
  } catch (error) {
    logger.apiError('RiderAPI', url, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running.`);
    }
    throw error;
  }
}

/**
 * Transform backend rider to frontend rider
 */
function transformRider(apiRider: ApiRider): Rider {
  return {
    id: apiRider.id,
    name: apiRider.name,
    avatarInitials: apiRider.avatarInitials,
    status: apiRider.status,
    currentOrderId: apiRider.currentOrderId || undefined,
    location: apiRider.location || undefined,
    capacity: apiRider.capacity,
    avgEtaMins: apiRider.avgEtaMins,
    rating: apiRider.rating,
  };
}

/**
 * Transform backend order to frontend order
 */
function transformOrder(apiOrder: ApiOrder): Order {
  // Transform timeline dates to ISO strings if needed
  const timeline = (apiOrder.timeline || []).map(event => ({
    status: event.status,
    time: typeof event.time === 'string' ? event.time : new Date(event.time).toISOString(),
    note: event.note,
  }));

  return {
    id: apiOrder.id,
    status: apiOrder.status,
    // Handle both camelCase and snake_case from backend
    riderId: apiOrder.riderId || apiOrder.rider_id || undefined,
    etaMinutes: apiOrder.etaMinutes || apiOrder.eta_minutes || undefined,
    slaDeadline: typeof (apiOrder.slaDeadline || apiOrder.sla_deadline) === 'string' 
      ? (apiOrder.slaDeadline || apiOrder.sla_deadline || '')
      : new Date(apiOrder.slaDeadline || apiOrder.sla_deadline || Date.now()).toISOString(),
    pickupLocation: apiOrder.pickupLocation || apiOrder.pickup_location || '',
    dropLocation: apiOrder.dropLocation || apiOrder.drop_location || '',
    customerName: apiOrder.customerName || apiOrder.customer_name || '',
    items: apiOrder.items || [],
    timeline,
  };
}

/**
 * Real API implementation
 */
export const api = {
  /**
   * Get dashboard summary
   */
  getSummary: async (): Promise<DashboardSummary> => {
    const endpoint = API_ENDPOINTS.riders.summary || API_ENDPOINTS.dashboard.summary;
    const res = await apiRequest<any>(endpoint);
    const data = (res && typeof res === 'object' && res.data != null) ? res.data : res;
    return {
      activeRiders: typeof data?.activeRiders === 'number' ? data.activeRiders : 0,
      maxRiders: typeof data?.maxRiders === 'number' ? data.maxRiders : 0,
      busyRiders: typeof data?.busyRiders === 'number' ? data.busyRiders : 0,
      idleRiders: typeof data?.idleRiders === 'number' ? data.idleRiders : 0,
      activeRiderUtilizationPercent: typeof data?.activeRiderUtilizationPercent === 'number' ? data.activeRiderUtilizationPercent : 0,
      fleetUtilizationPercent: typeof data?.fleetUtilizationPercent === 'number' ? data.fleetUtilizationPercent : undefined,
      ordersInTransit: typeof data?.ordersInTransit === 'number' ? data.ordersInTransit : 0,
      ordersInTransitChangePercent: typeof data?.ordersInTransitChangePercent === 'number' ? data.ordersInTransitChangePercent : 0,
      avgDeliveryTimeSeconds: typeof data?.avgDeliveryTimeSeconds === 'number' ? data.avgDeliveryTimeSeconds : 0,
      avgDeliveryTimeWithinSla: typeof data?.avgDeliveryTimeWithinSla === 'boolean' ? data.avgDeliveryTimeWithinSla : true,
      slaBreaches: typeof data?.slaBreaches === 'number' ? data.slaBreaches : 0,
    };
  },

  /**
   * Get orders with optional filters
   */
  getOrders: async (filters?: { status?: string; search?: string }): Promise<Order[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status && filters.status !== 'All') {
        params.append('status', filters.status.toLowerCase());
      }
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      // Increase limit to get more orders
      params.append('limit', '100');
      
      const queryString = params.toString();
      const endpoint = queryString 
        ? `${API_ENDPOINTS.orders.list}?${queryString}`
        : API_ENDPOINTS.orders.list;
      
      const data = await apiRequest<any>(endpoint);
      
      // Handle standardized backend response format { success: true, data: [...], meta: { ... } }
      // Or fallback to direct list response { orders: [...], total: ... }
      let ordersArray: ApiOrder[] = [];
      
      if (!data || typeof data !== 'object') {
        logger.warn('[RiderAPI] Invalid orders response: not an object', data);
        return [];
      }
      
      // Check for array response (direct array)
      if (Array.isArray(data)) {
        ordersArray = data;
      } 
      // Check for { success: true, data: [...] } format
      else if (data.success && Array.isArray(data.data)) {
        ordersArray = data.data;
      } 
      // Check for { orders: [...] } format
      else if (Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } 
      // If data is a single object (not an array), log warning but don't crash
      else if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Check if it looks like a single order object (has order-like properties)
        if (data.id && (data.id.startsWith('ORD-') || data.id.startsWith('ord-'))) {
          // It's a single order, wrap it in an array
          ordersArray = [data];
        } else {
          logger.warn('[RiderAPI] Invalid orders response format: expected array, got object', data);
          return [];
        }
      } else {
        logger.warn('[RiderAPI] Invalid orders response format:', data);
        return [];
      }
      
      return ordersArray.map(transformOrder).sort((a, b) =>
        (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999)
      );
    } catch (e) {
      logger.warn('[RiderAPI.getOrders] failed', e);
      throw e;
    }
  },

  /**
   * Get all riders
   */
  getRiders: async (): Promise<Rider[]> => {
    const data = await apiRequest<ApiListResponse<ApiRider>>(API_ENDPOINTS.riders.list);
    const riders = data?.riders ?? [];
    return riders.map(transformRider);
  },

  /**
   * Create a new rider
   */
  createRider: async (riderData: {
    name: string;
    zone?: string;
    location?: { lat: number; lng: number };
    capacity?: { maxLoad: number };
    status?: 'online' | 'offline' | 'busy' | 'idle';
  }): Promise<Rider> => {
    const data = await apiRequest<ApiRider>(
      API_ENDPOINTS.riders.create,
      {
        method: 'POST',
        body: JSON.stringify(riderData),
      }
    );
    
    return transformRider(data);
  },

  /**
   * Assign order to rider. Throws on API failure so caller can show error and refetch.
   * Returns order shape from API so UI shows server-assigned riderId (e.g. RIDER-0001).
   */
  assignOrder: async (orderId: string, riderId: string): Promise<{ orderId: string; riderId: string; riderName?: string; status: string; etaMinutes?: number }> => {
    const res = await apiRequest<{ orderId: string; riderId: string; riderName?: string; status: string; etaMinutes?: number; message?: string }>(
      API_ENDPOINTS.orders.assign(orderId),
      { method: 'POST', body: JSON.stringify({ orderId, riderId }) }
    );
    // Return the full response so caller can use it
    return {
      orderId: res?.orderId ?? orderId,
      riderId: res?.riderId ?? riderId,
      riderName: res?.riderName,
      status: res?.status ?? 'assigned',
      etaMinutes: res?.etaMinutes ?? 12,
    };
  },

  /**
   * Alert order
   */
  alertOrder: async (orderId: string, reason: string): Promise<void> => {
    await apiRequest(
      API_ENDPOINTS.orders.alert(orderId),
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  /**
   * Auto assign orders (not implemented in backend yet)
   * For now, this is a placeholder that returns 0
   */
  autoAssign: async (): Promise<number> => {
    // Auto-assign endpoint - returns number of assignments made
    // If backend doesn't support this yet, it will return 0
    try {
      const response = await apiRequest<{ count: number }>('/rider/dispatch/auto-assign', {
        method: 'POST',
      });
      return response.count || 0;
    } catch (error: any) {
      // If endpoint doesn't exist, return 0 (no assignments made)
      if (error?.status === 404) {
        return 0;
      }
      throw error;
    }
  },
};

