/**
 * GRN Operations API
 * Handles GRN-specific API calls
 */

import { get, post, put } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inbound/grn';

/**
 * Get GRN list with filters
 */
export async function fetchGRNList(filters = {}) {
  const {
    storeId = getActiveStoreId() || '',
    status = 'all',
    truckId,
    page = 1,
    limit = 50,
  } = filters;
  
  const params = { storeId, status, page, limit };
  if (truckId) params.truckId = truckId;
  
  return get(BASE_PATH, params);
}

/**
 * Get GRN details by ID
 */
export async function fetchGRNDetails(grnId) {
  return get(`${BASE_PATH}/${grnId}`);
}

/**
 * Start GRN processing
 */
export async function startGRN(grnId, options = {}) {
  const { actual_arrival, notes } = options;
  return post(`${BASE_PATH}/${grnId}/start`, {
    actual_arrival: actual_arrival || new Date().toISOString(),
    notes: notes || '',
  });
}

/**
 * Update GRN item quantity
 */
export async function updateGRNItem(grnId, sku, quantityData) {
  const { received_quantity, damaged_quantity = 0, notes = '' } = quantityData;
  return put(`${BASE_PATH}/${grnId}/items/${sku}`, {
    received_quantity,
    damaged_quantity,
    notes,
  });
}

/**
 * Complete GRN processing
 */
export async function completeGRN(grnId, options = {}) {
  const { notes = '', auto_create_putaway = true } = options;
  return post(`${BASE_PATH}/${grnId}/complete`, {
    notes,
    auto_create_putaway,
  });
}

/**
 * Approve GRN
 */
export async function approveGRN(grnId, options = {}) {
  const { notes = '' } = options;
  return post(`${BASE_PATH}/${grnId}/approve`, { notes });
}

/**
 * Reject GRN
 */
export async function rejectGRN(grnId, reason, options = {}) {
  const { notes = '' } = options;
  return post(`${BASE_PATH}/${grnId}/reject`, { reason, notes });
}

/**
 * Email GRN to recipients
 */
export async function emailGRN(grnId, recipients = []) {
  return post(`${BASE_PATH}/${grnId}/email`, { recipients });
}

/**
 * Archive GRN
 */
export async function archiveGRN(grnId) {
  return post(`${BASE_PATH}/${grnId}/archive`);
}
