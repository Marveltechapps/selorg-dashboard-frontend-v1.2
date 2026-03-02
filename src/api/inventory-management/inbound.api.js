/**
 * Inbound Operations API
 * Handles all inbound-related API calls
 */

import { get, post, put } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inbound';

/**
 * Get inbound summary
 */
export async function getInboundSummary(storeId = getActiveStoreId() || '', date) {
  const params = { storeId };
  if (date) params.date = date;
  return get(`${BASE_PATH}/summary`, params);
}

/**
 * Get GRN list
 */
export async function getGRNList(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    status = 'all',
    truckId,
    search,
    page = 1,
    limit = 50,
  } = params;
  
  const queryParams = { storeId, status, page, limit };
  if (truckId) queryParams.truckId = truckId;
  if (search) queryParams.search = search;
  
  return get(`${BASE_PATH}/grn`, queryParams);
}

/**
 * Get GRN details
 */
export async function getGRNDetails(grnId) {
  return get(`${BASE_PATH}/grn/${grnId}`);
}

/**
 * Start GRN processing
 */
export async function startGRNProcessing(grnId, data = {}) {
  return post(`${BASE_PATH}/grn/${grnId}/start`, data);
}

/**
 * Update GRN item quantity
 */
export async function updateGRNItemQuantity(grnId, sku, data) {
  return put(`${BASE_PATH}/grn/${grnId}/items/${sku}`, data);
}

/**
 * Complete GRN processing
 */
export async function completeGRNProcessing(grnId, data = {}) {
  return post(`${BASE_PATH}/grn/${grnId}/complete`, data);
}

// Putaway task functions moved to putaway.api.js to avoid duplicate exports

/**
 * Get inter-store transfers
 */
export async function getInterStoreTransfers(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    status = 'all',
    page = 1,
    limit = 50,
  } = params;
  
  return get(`${BASE_PATH}/transfers`, { storeId, status, page, limit });
}

/**
 * Receive inter-store transfer
 */
export async function receiveInterStoreTransfer(transferId, data = {}) {
  return post(`${BASE_PATH}/transfers/${transferId}/receive`, data);
}

/**
 * Sync inter-store transfers with central ERP
 */
export async function syncInterStoreTransfers(storeId = getActiveStoreId() || '') {
  return post(`${BASE_PATH}/transfers/sync?storeId=${storeId}`);
}

