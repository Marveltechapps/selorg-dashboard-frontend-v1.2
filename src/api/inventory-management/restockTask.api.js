/**
 * Restock Task API
 * Handles restock task creation API calls
 */

import { post } from './apiClient';

const BASE_PATH = '/api/v1/darkstore/inventory/restock-task';

/**
 * Create restock task
 */
export async function createRestockTask(data) {
  const { sku, store_id, quantity, priority, shelf_location, reason } = data;
  
  const body = {
    sku,
    store_id,
    quantity,
    priority,
  };
  
  if (shelf_location) body.shelf_location = shelf_location;
  if (reason) body.reason = reason;
  
  return post(BASE_PATH, body);
}

