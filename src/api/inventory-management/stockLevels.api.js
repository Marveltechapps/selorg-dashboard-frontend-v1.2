/**
 * Stock Levels API
 * Handles stock level management API calls
 */

import { get, put, del } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/stock-levels';

/**
 * Get stock levels
 */
export async function fetchStockLevels(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    search,
    category = 'all',
    status = 'all',
    page = 1,
    limit = 50,
  } = params;
  
  const queryParams = { storeId, category, status, page, limit };
  if (search) queryParams.search = search;
  
  return get(BASE_PATH, queryParams);
}

/**
 * Update stock level
 */
export async function updateStockLevel(sku, data) {
  const { stock, location, reason, notes } = data;
  return put(`${BASE_PATH}/${sku}`, {
    stock,
    location,
    reason,
    notes,
  });
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(sku) {
  return del(`${BASE_PATH}/${sku}`);
}

/**
 * Change item status
 */
export async function changeItemStatus(sku, status) {
  return put(`${BASE_PATH}/${sku}/status`, { status });
}

/**
 * Update inventory item details (name, category, etc.)
 */
export async function updateInventoryItem(sku, data) {
  return put(`/api/v1/darkstore/inventory/items/${sku}`, data);
}

