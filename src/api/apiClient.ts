import { API_CONFIG } from '../config/api';
import { getAuthToken } from '../contexts/AuthContext';

/**
 * Download CSV from API endpoint
 */
export async function apiDownloadCsv(endpoint: string, filename: string = 'export.csv'): Promise<void> {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
}

/**
 * Generic API request with authentication
 * For FormData body, do not set Content-Type (browser sets multipart boundary)
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token || ''}`,
    ...(options.headers as Record<string, string>),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    const err: any = new Error(
      'Cannot connect to the backend server. Please ensure it is running and try again.'
    );
    err.isNetworkError = true;
    throw err;
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `Request failed with status ${response.status}` };
    }

    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (response.status === 403) {
      const errorMsg = errorData.error?.message || errorData.message || 'Permission denied. You do not have access to perform this action.';
      const error: any = new Error(errorMsg);
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    const errorMsg =
      typeof errorData.error === 'string'
        ? errorData.error
        : errorData.error?.message || errorData.message || 'Request failed';
    const error: any = new Error(errorMsg);
    error.response = { data: errorData, status: response.status };
    throw error;
  }

  return response.json();
}
