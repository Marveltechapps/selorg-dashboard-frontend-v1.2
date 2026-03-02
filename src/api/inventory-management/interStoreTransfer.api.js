/**
 * Inter-Store Transfers API
 * Handles inter-store transfer-related API calls
 */

import { get, post } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inbound/transfers';

/**
 * Get inter-store transfers list
 */
export async function fetchInterStoreTransfers(filters = {}) {
  const {
    storeId = getActiveStoreId() || '',
    status = 'all',
    page = 1,
    limit = 50,
  } = filters;
  
  return get(BASE_PATH, { storeId, status, page, limit });
}

/**
 * Receive inter-store transfer
 */
export async function receiveTransfer(transferId, receiveData = {}) {
  const { actual_arrival, notes = '', auto_create_putaway = true } = receiveData;
  return post(`${BASE_PATH}/${transferId}/receive`, {
    actual_arrival: actual_arrival || new Date().toISOString(),
    notes,
    auto_create_putaway,
  });
}

