/**
 * Putaway Tasks API
 * Handles putaway task-related API calls
 */

import { get, post } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inbound/putaway';

/**
 * Get putaway tasks list
 */
export async function fetchPutawayTasks(filters = {}) {
  const {
    storeId = getActiveStoreId() || '',
    status = 'all',
    grnId,
    page = 1,
    limit = 50,
  } = filters;
  
  const params = { storeId, status, page, limit };
  if (grnId) params.grnId = grnId;
  
  return get(BASE_PATH, params);
}

/**
 * Assign putaway task to staff
 */
export async function assignPutawayTask(taskId, staffData) {
  const { staff_id, staff_name } = staffData;
  return post(`${BASE_PATH}/${taskId}/assign`, {
    staff_id,
    staff_name,
  });
}

/**
 * Complete putaway task
 */
export async function completePutawayTask(taskId, completionData = {}) {
  const { actual_location, notes = '' } = completionData;
  return post(`${BASE_PATH}/${taskId}/complete`, {
    actual_location: actual_location || null,
    notes,
  });
}

