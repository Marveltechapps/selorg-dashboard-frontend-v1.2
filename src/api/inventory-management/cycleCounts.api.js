/**
 * Cycle Counts API
 * Handles cycle count-related API calls
 */

import { get } from './apiClient';
import { getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/cycle-count';

/**
 * Get cycle count data
 */
export async function fetchCycleCount(storeId = getActiveStoreId() || '', date) {
  const params = { storeId };
  if (date) params.date = date;
  return get(BASE_PATH, params);
}

/**
 * Download cycle count report
 */
export async function downloadCycleCountReport(storeId = getActiveStoreId() || '', date, format = 'pdf') {
  const params = { storeId, format };
  if (date) params.date = date;
  
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  let API_BASE_URL = '';
  if (envUrl) {
    try { API_BASE_URL = new URL(envUrl).origin; } catch { /* use empty */ }
  }
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${BASE_PATH}/report?${queryString}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  } catch (error) {
    console.error('Error downloading cycle count report:', error);
    throw error;
  }
}

