/**
 * Cycle Counts API
 * Handles cycle count-related API calls
 */

import { get } from './apiClient';
import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

const BASE_PATH = '/api/v1/darkstore/inventory/cycle-count';

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    try {
      return new URL(String(envUrl).trim()).origin;
    } catch {
      return '';
    }
  }
  return '';
})();

/**
 * Get cycle count data
 */
export async function fetchCycleCount(storeId = getActiveStoreId() || '', date) {
  const params = { storeId };
  if (date) params.date = date;
  return get(BASE_PATH, params);
}

/**
 * Download cycle count report (PDF or CSV)
 */
export async function downloadCycleCountReport(
  storeId = getActiveStoreId() || '',
  date,
  format = 'pdf'
) {
  const params = new URLSearchParams({ storeId, format });
  if (date) params.set('date', date);

  const token = getAuthToken();
  const url = `${API_BASE_URL}${BASE_PATH}/report?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || 'Failed to download report');
    }
    throw new Error(`Failed to download report (${response.status})`);
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const text = await blob.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || 'Invalid report response');
    } catch (e) {
      if (e instanceof Error && e.message !== 'Invalid report response') throw e;
      throw new Error('Server returned invalid report data');
    }
  }

  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  const fileName = match?.[1]?.trim();

  return { blob, fileName };
}
