import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch';

export const warehouseApi = {
  createWarehouse: async (data: any) => {
    return apiRequest(`${BASE_PATH}/warehouses`, 'POST', data);
  },
  getWarehouse: async (warehouseId: string) => {
    return apiRequest(`${BASE_PATH}/warehouses/${warehouseId}`, 'GET');
  },
  getAllWarehouses: async () => {
    return apiRequest(`${BASE_PATH}/warehouses`, 'GET');
  },
  getWarehouseHierarchy: async (warehouseId: string) => {
    return apiRequest(`${BASE_PATH}/warehouses/${warehouseId}/hierarchy`, 'GET');
  },
  getCapacityUtilization: async (warehouseId: string) => {
    return apiRequest(`${BASE_PATH}/warehouses/${warehouseId}/capacity`, 'GET');
  },
  updateWarehouse: async (warehouseId: string, data: any) => {
    return apiRequest(`${BASE_PATH}/warehouses/${warehouseId}`, 'PUT', data);
  },
  updateWarehouseStatus: async (warehouseId: string, isActive: boolean) => {
    return apiRequest(`${BASE_PATH}/warehouses/${warehouseId}/status`, 'PUT', { isActive });
  },
  getWarehousesByTier: async (tier: number) => {
    return apiRequest(`${BASE_PATH}/warehouses/tier/${tier}`, 'GET');
  },
  calculateDistance: async (sourceId: string, destId: string) => {
    return apiRequest(`${BASE_PATH}/warehouses/distance`, 'GET', null, {
      sourceId,
      destId,
    });
  },
};

export const allocationApi = {
  createRule: async (data: any) => {
    return apiRequest(`${BASE_PATH}/allocation-rules`, 'POST', data);
  },
  getRule: async (ruleId: string) => {
    return apiRequest(`${BASE_PATH}/allocation-rules/${ruleId}`, 'GET');
  },
  getAllRules: async () => {
    return apiRequest(`${BASE_PATH}/allocation-rules`, 'GET');
  },
  updateRule: async (ruleId: string, data: any) => {
    return apiRequest(`${BASE_PATH}/allocation-rules/${ruleId}`, 'PUT', data);
  },
  getApplicableRules: async (sku: string, sourceWarehouse: string) => {
    return apiRequest(`${BASE_PATH}/allocation-rules/applicable`, 'GET', null, {
      sku,
      sourceWarehouse,
    });
  },
  createAllocation: async (data: any) => {
    return apiRequest(`${BASE_PATH}/allocations`, 'POST', data);
  },
  getAllocation: async (allocationId: string) => {
    return apiRequest(`${BASE_PATH}/allocations/${allocationId}`, 'GET');
  },
  approveAllocation: async (allocationId: string, approver: string, comments?: string) => {
    return apiRequest(`${BASE_PATH}/allocations/${allocationId}/approve`, 'POST', {
      approver,
      comments,
    });
  },
  fulfillAllocation: async (allocationId: string) => {
    return apiRequest(`${BASE_PATH}/allocations/${allocationId}/fulfill`, 'POST');
  },
  getAllocationMetrics: async () => {
    return apiRequest(`${BASE_PATH}/allocations/metrics`, 'GET');
  },
};

export const transferOrderApi = {
  createTransferOrder: async (data: any) => {
    return apiRequest(`${BASE_PATH}/transfer-orders`, 'POST', data);
  },
  getTransferOrder: async (transferId: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/${transferId}`, 'GET');
  },
  getAllTransferOrders: async () => {
    return apiRequest(`${BASE_PATH}/transfer-orders`, 'GET');
  },
  getTransferOrdersByWarehouse: async (warehouseId: string, role?: string) => {
    return apiRequest(
      `${BASE_PATH}/transfer-orders/warehouse/${warehouseId}`,
      'GET',
      null,
      { role: role || 'source' }
    );
  },
  getTransferOrdersByStatus: async (status: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders`, 'GET', null, { status });
  },
  approveTransferOrder: async (transferId: string, approver: string, comments?: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/${transferId}/approve`, 'POST', {
      approver,
      comments,
    });
  },
  shipTransferOrder: async (transferId: string, shippingInfo: any, updatedBy: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/${transferId}/ship`, 'POST', {
      shippingInfo,
      updatedBy,
    });
  },
  receiveTransferOrder: async (transferId: string, receivedItems: any[], updatedBy: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/${transferId}/receive`, 'POST', {
      receivedItems,
      updatedBy,
    });
  },
  cancelTransferOrder: async (transferId: string, reason: string, updatedBy: string) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/${transferId}/cancel`, 'POST', {
      reason,
      updatedBy,
    });
  },
  calculateCost: async (source: string, dest: string, items: any[]) => {
    return apiRequest(`${BASE_PATH}/transfer-orders/calculate-cost`, 'POST', {
      source,
      dest,
      items,
    });
  },
};

export const vendorApi = {
  createVendor: async (data: any) => {
    return apiRequest(`${BASE_PATH}/vendors`, 'POST', data);
  },
  getVendor: async (vendorId: string) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}`, 'GET');
  },
  getAllVendors: async () => {
    return apiRequest(`${BASE_PATH}/vendors`, 'GET');
  },
  updateVendor: async (vendorId: string, data: any) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}`, 'PUT', data);
  },
  getVendorsByType: async (vendorType: string) => {
    return apiRequest(`${BASE_PATH}/vendors/type/${vendorType}`, 'GET');
  },
  getPerformanceMetrics: async (vendorId: string) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}/metrics`, 'GET');
  },
  rankVendors: async () => {
    return apiRequest(`${BASE_PATH}/vendors/rank`, 'GET');
  },
  updatePaymentTerms: async (vendorId: string, terms: any) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}/payment-terms`, 'PUT', { terms });
  },
  getSupplyCapacity: async (vendorId: string) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}/capacity`, 'GET');
  },
  deactivateVendor: async (vendorId: string) => {
    return apiRequest(`${BASE_PATH}/vendors/${vendorId}/deactivate`, 'PUT');
  },
};

export const multiEchelonApi = {
  getEchelonInventory: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}`, 'GET');
  },
  getSystemInventory: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}/system`, 'GET');
  },
  getVisibility: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}/visibility`, 'GET');
  },
  synchronizeData: async () => {
    return apiRequest(`${BASE_PATH}/multi-echelon/sync`, 'POST');
  },
  getRebalancingSuggestions: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}/suggestions`, 'GET');
  },
  trackInventoryFlow: async (sku: string, sourceWarehouse: string, destinationWarehouse: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}/track`, 'GET', null, {
      sourceWarehouse,
      destinationWarehouse,
    });
  },
  createEchelonRecord: async (data: any) => {
    return apiRequest(`${BASE_PATH}/multi-echelon`, 'POST', data);
  },
  aggregateInventory: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/multi-echelon/${sku}/aggregate`, 'GET');
  },
};

export default {
  warehouse: warehouseApi,
  allocation: allocationApi,
  transferOrder: transferOrderApi,
  vendor: vendorApi,
  multiEchelon: multiEchelonApi,
};
