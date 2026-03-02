/**
 * Scan Item API
 * Handles item scanning API calls
 */

import { post } from './apiClient';

const BASE_PATH = '/api/v1/darkstore/inventory/scan';

/**
 * Scan item by SKU and location
 */
export async function scanItem(scanData) {
  const { sku, location, barcode } = scanData;
  
  const body = {};
  if (sku) body.sku = sku;
  if (location) body.location = location;
  if (barcode) body.barcode = barcode;
  
  return post(BASE_PATH, body);
}

