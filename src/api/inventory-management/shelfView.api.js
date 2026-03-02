/**
 * Shelf View API
 * Handles live shelf view API calls
 */

import { get } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/shelf-view';

/**
 * Get shelf view data
 */
export async function fetchShelfView(params = {}) {
  const {
    storeId = getActiveStoreId() || '',
    zone = 'Zone 1 (Ambient)',
    aisle = 'all',
    shelf_location,
  } = params;
  
  const queryParams = { storeId, zone, aisle };
  if (shelf_location) queryParams.shelf_location = shelf_location;
  
  return get(BASE_PATH, queryParams);
}

