/**
 * Common API Client for Inventory Management
 * Provides centralized HTTP client with error handling
 */
import { getAuthToken } from '../../contexts/AuthContext';

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    try { return new URL(envUrl).origin; } catch { return ''; }
  }
  return '';
})();

/**
 * Base fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Handle non-JSON responses (like PDF downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    }
    
    let data;
    try {
      const text = await response.text();
      if (!text) {
        // Empty response
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return null;
      }
      data = JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, check if response was ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // If response was ok but not JSON, return null
      console.warn(`Non-JSON response from ${endpoint}:`, parseError);
      return null;
    }
    
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    // Log more details for debugging
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Backend server is unreachable. Please ensure it is running.');
    }
    throw error;
  }
}

/**
 * GET request helper
 */
export function get(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return apiRequest(url, { method: 'GET' });
}

/**
 * POST request helper
 */
export function post(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request helper
 */
export function put(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request helper
 */
export function del(endpoint) {
  return apiRequest(endpoint, { method: 'DELETE' });
}

export default { get, post, put, delete: del };

