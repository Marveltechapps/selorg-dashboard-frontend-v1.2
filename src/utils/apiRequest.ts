import { API_CONFIG } from '../config/api';
import { getAuthToken } from '../contexts/AuthContext';
import { logger } from './logger';

/**
 * Shared API request utility
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  moduleName: string = 'API'
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const token = getAuthToken();

  logger.apiRequest(moduleName, url);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    logger.apiResponse(moduleName, response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[${moduleName}] Error response:`, errorText);
      let error: { message?: string; error?: { message?: string } } = { message: errorText || 'Request failed' };
      try {
        error = JSON.parse(errorText);
      } catch {
        /* use default */
      }
      const message = error?.error?.message || error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    logger.apiSuccess(moduleName, data);
    return data;
  } catch (error) {
    logger.apiError(moduleName, url, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running.`);
    }
    throw error;
  }
}
