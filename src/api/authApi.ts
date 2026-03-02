import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import {
  getAuthToken as _getAuthToken,
  getAuthUser,
  isAuthenticated as _isAuthenticated,
} from '../contexts/AuthContext';

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    assignedStores?: string[];
    primaryStoreId?: string;
  };
}

function getLoginEndpoint(role?: string): string {
  if (!role) return API_ENDPOINTS.auth.login;

  const roleMap: Record<string, { login: string }> = {
    darkstore: API_ENDPOINTS.darkstore,
    production: API_ENDPOINTS.production,
    merch: API_ENDPOINTS.merch,
    rider: API_ENDPOINTS.rider,
    finance: API_ENDPOINTS.finance,
    warehouse: API_ENDPOINTS.warehouse,
    admin: API_ENDPOINTS.admin,
    vendor: API_ENDPOINTS.vendor,
  };

  return (roleMap[role] as any)?.auth?.login || API_ENDPOINTS.auth.login;
}

/**
 * Authenticate user with email and password.
 * Returns the response but does NOT persist state — the caller (AuthContext)
 * is responsible for storing the token and user in memory.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const endpoint = getLoginEndpoint(credentials.role);
  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      role: credentials.role,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid credentials');
  }

  return response.json();
}

function getLogoutEndpoint(role?: string): string {
  const loginPath = getLoginEndpoint(role);
  return loginPath.replace(/\/login$/, '/logout');
}

/**
 * Server-side logout (best-effort). State cleanup is handled by AuthContext.
 */
export function serverLogout(): void {
  const token = _getAuthToken();
  const user = getAuthUser();
  if (token && user?.role) {
    const endpoint = getLogoutEndpoint(user.role);
    fetch(`${API_CONFIG.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

export function getCurrentUser() {
  return getAuthUser();
}

export function getAuthToken(): string | null {
  return _getAuthToken();
}

export function isAuthenticated(): boolean {
  return _isAuthenticated();
}

/**
 * @deprecated Use `import { logout } from '../contexts/AuthContext'` via useAuth() hook.
 * Kept as a no-op shim so existing imports don't break at compile time.
 */
export function logout(): void {
  serverLogout();
}
