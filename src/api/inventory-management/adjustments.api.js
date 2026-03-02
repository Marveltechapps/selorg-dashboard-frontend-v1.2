/**
 * Inventory Adjustments API
 * Handles inventory adjustment API calls
 */

import { get, post } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/adjustments';

/**
 * Get adjustment history
 */
export async function fetchAdjustments(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    sku,
    action = 'all',
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params;
  
  const queryParams = { storeId, action, page, limit };
  if (sku) queryParams.sku = sku;
  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;
  
  return get(BASE_PATH, queryParams);
}

/**
 * Create inventory adjustment
 */
export async function createAdjustment(data) {
  const { sku, mode, quantity, reason_code, notes = '' } = data;
  
  return post(BASE_PATH, {
    sku,
    mode,
    quantity,
    reason_code,
    notes,
  });
}

