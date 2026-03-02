import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

/**
 * Purchase Orders API
 */
export const purchaseOrdersApi = {
  /**
   * List purchase orders (alias for getPurchaseOrders)
   */
  async listPurchaseOrders(filters?: any) {
    return this.getPurchaseOrders(filters);
  },

  /**
   * Get all purchase orders
   */
  async getPurchaseOrders(filters?: any) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch purchase orders');
    }

    return response.json();
  },

  /**
   * Get purchase order by ID
   */
  async getPurchaseOrderById(id: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.byId(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch purchase order');
    }

    return response.json();
  },

  /**
   * Create purchase order
   */
  async createPurchaseOrder(orderData: any) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.create}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create purchase order' }));
      throw new Error(error.message || 'Failed to create purchase order');
    }

    return response.json();
  },

  /**
   * Update purchase order
   */
  async updatePurchaseOrder(id: string, orderData: any) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.update(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update purchase order' }));
      throw new Error(error.message || 'Failed to update purchase order');
    }

    return response.json();
  },

  /**
   * Approve purchase order
   */
  async approvePurchaseOrder(id: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.approve(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to approve purchase order');
    }

    return response.json();
  },

  /**
   * Reject purchase order
   */
  async rejectPurchaseOrder(id: string, reason?: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.reject(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to reject purchase order');
    }

    return response.json();
  },

  /**
   * Cancel purchase order
   */
  async cancelPurchaseOrder(id: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.purchaseOrders.cancel(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel purchase order');
    }

    return response.json();
  },

  /**
   * Perform PO action (approve, reject, cancel, etc.)
   */
  async performPOAction(id: string, action: 'approve' | 'reject' | 'cancel', data?: any) {
    switch (action) {
      case 'approve':
        return this.approvePurchaseOrder(id);
      case 'reject':
        return this.rejectPurchaseOrder(id, data?.reason);
      case 'cancel':
        return this.cancelPurchaseOrder(id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

// Named exports for direct imports
export const listPurchaseOrders = purchaseOrdersApi.listPurchaseOrders.bind(purchaseOrdersApi);
export const getPurchaseOrders = purchaseOrdersApi.getPurchaseOrders.bind(purchaseOrdersApi);
export const getPurchaseOrderById = purchaseOrdersApi.getPurchaseOrderById.bind(purchaseOrdersApi);
export const createPurchaseOrder = purchaseOrdersApi.createPurchaseOrder.bind(purchaseOrdersApi);
export const updatePurchaseOrder = purchaseOrdersApi.updatePurchaseOrder.bind(purchaseOrdersApi);
export const approvePurchaseOrder = purchaseOrdersApi.approvePurchaseOrder.bind(purchaseOrdersApi);
export const rejectPurchaseOrder = purchaseOrdersApi.rejectPurchaseOrder.bind(purchaseOrdersApi);
export const cancelPurchaseOrder = purchaseOrdersApi.cancelPurchaseOrder.bind(purchaseOrdersApi);
export const performPOAction = purchaseOrdersApi.performPOAction.bind(purchaseOrdersApi);

export default purchaseOrdersApi;
