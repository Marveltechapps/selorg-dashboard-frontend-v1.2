/**
 * Store shelf layout CRUD (store setup)
 */

import { get, post, put, del } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/shelves';
export const DEFAULT_STORE_ZONE = 'Zone 1 (Ambient)';

export async function fetchShelves(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    zone = DEFAULT_STORE_ZONE,
  } = params;
  return get(BASE_PATH, { storeId, zone });
}

export async function createShelf(data) {
  return post(BASE_PATH, data);
}

export async function updateShelf(shelfId, data) {
  return put(`${BASE_PATH}/${encodeURIComponent(shelfId)}`, data);
}

export async function deleteShelf(shelfId) {
  return del(`${BASE_PATH}/${encodeURIComponent(shelfId)}`);
}
