/**
 * Inventory bulk import from CSV/Excel sheets
 */

import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

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

const BASE = `${API_BASE_URL}/api/v1/darkstore/inventory`;

function authHeaders(contentType = true) {
  const token = getAuthToken();
  return {
    ...(contentType ? {} : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * POST /api/v1/darkstore/inventory/bulk-import
 */
export async function bulkImportInventory(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('storeId', options.storeId || getActiveStoreId() || '');
  if (options.zone) formData.append('zone', options.zone);
  if (options.validateOnly) formData.append('validateOnly', 'true');

  const response = await fetch(`${BASE}/bulk-import`, {
    method: 'POST',
    headers: authHeaders(false),
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to import inventory sheet');
  }
  return data;
}

/**
 * GET /api/v1/darkstore/inventory/import-template
 */
export async function downloadInventoryImportTemplate() {
  const response = await fetch(`${BASE}/import-template`, {
    headers: authHeaders(false),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to download template');
  }
  return response.blob();
}
