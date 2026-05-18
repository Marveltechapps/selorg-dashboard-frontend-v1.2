/**
 * Inventory Management API
 * Handles all inventory operations: transactions, reservations, reconciliation, replenishment
 */

import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch';

// ============= INVENTORY TRANSACTIONS =============
export const inventoryApi = {
  // Transactions
  recordTransaction: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/inventory/transactions`, data);
  },

  getTransactionHistory: async (storeId: string, sku?: string, daysBack?: number) => {
    const params = new URLSearchParams();
    if (sku) params.append('sku', sku);
    if (daysBack) params.append('daysBack', String(daysBack));
    return apiRequest.get(`${BASE_PATH}/inventory/transactions/${storeId}?${params}`);
  },

  getTransactionDetails: async (transactionId: string) => {
    return apiRequest.get(`${BASE_PATH}/inventory/transactions/${transactionId}`);
  },

  approveTransaction: async (transactionId: string, approvedBy: string) => {
    return apiRequest.patch(`${BASE_PATH}/inventory/transactions/${transactionId}/approve`, { approvedBy });
  },

  // Reservations
  createReservation: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/inventory/reservations`, data);
  },

  getReservations: async (storeId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/inventory/reservations/${storeId}?${params}`);
  },

  getReservationDetails: async (reservationId: string) => {
    return apiRequest.get(`${BASE_PATH}/inventory/reservations/${reservationId}`);
  },

  confirmReservation: async (reservationId: string) => {
    return apiRequest.patch(`${BASE_PATH}/inventory/reservations/${reservationId}/confirm`);
  },

  cancelReservation: async (reservationId: string, reason: string) => {
    return apiRequest.patch(`${BASE_PATH}/inventory/reservations/${reservationId}/cancel`, { reason });
  },

  checkStockAvailability: async (storeId: string, items: any[]) => {
    return apiRequest.post(`${BASE_PATH}/inventory/check-availability`, { storeId, items });
  },

  // Stock Levels
  getStoreStock: async (storeId: string, sku?: string) => {
    const params = new URLSearchParams();
    if (sku) params.append('sku', sku);
    return apiRequest.get(`${BASE_PATH}/inventory/stock/${storeId}?${params}`);
  },

  getStoreStockReport: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/inventory/stock-report/${storeId}`);
  },

  // Stock Reconciliation
  createReconciliation: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/inventory/reconciliation`, data);
  },

  getReconciliations: async (storeId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/inventory/reconciliation/${storeId}?${params}`);
  },

  getReconciliationDetails: async (reconciliationId: string) => {
    return apiRequest.get(`${BASE_PATH}/inventory/reconciliation/${reconciliationId}`);
  },

  submitCounts: async (reconciliationId: string, items: any[]) => {
    return apiRequest.patch(`${BASE_PATH}/inventory/reconciliation/${reconciliationId}/counts`, { items });
  },

  approveReconciliation: async (reconciliationId: string, approvedBy: string) => {
    return apiRequest.patch(`${BASE_PATH}/inventory/reconciliation/${reconciliationId}/approve`, { approvedBy });
  },

  getInventoryHealth: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/inventory/health/${storeId}`);
  },
};

// ============= REPLENISHMENT OPERATIONS =============
export const replenishmentApi = {
  // Replenishment Cycles
  createReplenishmentCycle: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/replenishment/cycles`, data);
  },

  getReplenishmentCycles: async (storeId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/replenishment/cycles/${storeId}?${params}`);
  },

  getCycleDetails: async (cycleId: string) => {
    return apiRequest.get(`${BASE_PATH}/replenishment/cycles/${cycleId}`);
  },

  analyzeInventoryNeeds: async (storeId: string, config?: any) => {
    return apiRequest.post(`${BASE_PATH}/replenishment/analyze`, { storeId, config });
  },

  // Replenishment Orders
  createReplenishmentOrder: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/replenishment/orders`, data);
  },

  getReplenishmentOrders: async (storeId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/replenishment/orders/${storeId}?${params}`);
  },

  getOrderDetails: async (orderId: string) => {
    return apiRequest.get(`${BASE_PATH}/replenishment/orders/${orderId}`);
  },

  submitOrderForApproval: async (orderId: string, submittedBy: string) => {
    return apiRequest.patch(`${BASE_PATH}/replenishment/orders/${orderId}/submit`, { submittedBy });
  },

  approveOrder: async (orderId: string, approvedBy: string, notes?: string) => {
    return apiRequest.patch(`${BASE_PATH}/replenishment/orders/${orderId}/approve`, { approvedBy, notes });
  },

  rejectOrder: async (orderId: string, reason: string) => {
    return apiRequest.patch(`${BASE_PATH}/replenishment/orders/${orderId}/reject`, { reason });
  },

  receiveOrder: async (orderId: string, receivedQuantity: number, inspectionNotes?: string) => {
    return apiRequest.patch(`${BASE_PATH}/replenishment/orders/${orderId}/receive`, { receivedQuantity, inspectionNotes });
  },

  recordPayment: async (orderId: string, amount: number, invoiceNumber?: string) => {
    return apiRequest.patch(`${BASE_PATH}/replenishment/orders/${orderId}/payment`, { amount, invoiceNumber });
  },

  getPendingApprovals: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/replenishment/pending-approvals/${storeId}`);
  },

  getPendingDeliveries: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/replenishment/pending-deliveries/${storeId}`);
  },

  // Expiry Batches
  createBatch: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/expiry/batches`, data);
  },

  getExpiryBatches: async (storeId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/expiry/batches/${storeId}?${params}`);
  },

  getBatchDetails: async (batchId: string) => {
    return apiRequest.get(`${BASE_PATH}/expiry/batches/${batchId}`);
  },

  checkExpiringBatches: async (storeId: string, daysThreshold?: number) => {
    const params = new URLSearchParams();
    if (daysThreshold) params.append('daysThreshold', String(daysThreshold));
    return apiRequest.get(`${BASE_PATH}/expiry/expiring/${storeId}?${params}`);
  },

  markBatchForRemoval: async (batchId: string, approvedBy: string, notes?: string) => {
    return apiRequest.patch(`${BASE_PATH}/expiry/batches/${batchId}/mark-removal`, { approvedBy, notes });
  },

  recordBatchRemoval: async (batchId: string, quantityRemoved: number, notes?: string) => {
    return apiRequest.patch(`${BASE_PATH}/expiry/batches/${batchId}/removal`, { quantityRemoved, notes });
  },

  recordBatchSale: async (batchId: string, quantitySold: number, discountPercent?: number) => {
    return apiRequest.patch(`${BASE_PATH}/expiry/batches/${batchId}/sale`, { quantitySold, discountPercent });
  },

  getWastageReport: async (storeId: string, startDate: string, endDate: string) => {
    return apiRequest.get(`${BASE_PATH}/expiry/wastage-report/${storeId}?startDate=${startDate}&endDate=${endDate}`);
  },

  getExpiryStatistics: async (storeId: string, days?: number) => {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    return apiRequest.get(`${BASE_PATH}/expiry/statistics/${storeId}?${params}`);
  },

  // Dashboard
  getStoreInventoryDashboard: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/dashboard/inventory/${storeId}`);
  },

  getInventoryHealthScore: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/dashboard/health/${storeId}`);
  },

  getReplenishmentMetrics: async (storeId: string) => {
    return apiRequest.get(`${BASE_PATH}/dashboard/replenishment-metrics/${storeId}`);
  },
};

// ============= CATALOG VERSIONING & BULK IMPORTS =============
export const catalogManagementApi = {
  createCatalogVersion: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/catalog/versions`, data);
  },

  getCatalogVersions: async (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    return apiRequest.get(`${BASE_PATH}/catalog/versions?${params}`);
  },

  getVersionDetails: async (versionNumber: number) => {
    return apiRequest.get(`${BASE_PATH}/catalog/versions/${versionNumber}`);
  },

  compareVersions: async (version1: number, version2: number) => {
    return apiRequest.get(`${BASE_PATH}/catalog/versions/compare?v1=${version1}&v2=${version2}`);
  },

  // Product Attributes
  createAttribute: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/catalog/attributes`, data);
  },

  getAttributes: async (isActive?: boolean) => {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('isActive', String(isActive));
    return apiRequest.get(`${BASE_PATH}/catalog/attributes?${params}`);
  },

  updateAttribute: async (attributeId: string, data: any) => {
    return apiRequest.patch(`${BASE_PATH}/catalog/attributes/${attributeId}`, data);
  },

  // Product Taxonomy
  createTaxonomy: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/catalog/taxonomy`, data);
  },

  getTaxonomyHierarchy: async () => {
    return apiRequest.get(`${BASE_PATH}/catalog/taxonomy-hierarchy`);
  },

  getTaxonomyDetails: async (taxonomyId: string) => {
    return apiRequest.get(`${BASE_PATH}/catalog/taxonomy/${taxonomyId}`);
  },

  // Bulk Imports
  createBulkImportJob: async (data: any) => {
    return apiRequest.post(`${BASE_PATH}/catalog/bulk-import`, data);
  },

  getImportJobs: async (importType?: string, status?: string) => {
    const params = new URLSearchParams();
    if (importType) params.append('importType', importType);
    if (status) params.append('status', status);
    return apiRequest.get(`${BASE_PATH}/catalog/bulk-import-jobs?${params}`);
  },

  getImportJobStatus: async (jobId: string) => {
    return apiRequest.get(`${BASE_PATH}/catalog/bulk-import/${jobId}`);
  },

  updateImportProgress: async (jobId: string, progressData: any) => {
    return apiRequest.patch(`${BASE_PATH}/catalog/bulk-import/${jobId}`, progressData);
  },
};

export default {
  inventory: inventoryApi,
  replenishment: replenishmentApi,
  catalogManagement: catalogManagementApi,
};
