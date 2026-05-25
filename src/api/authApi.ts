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
    hubKey?: string;
  };
}

/** Thrown when login returns 429 (account lockout or auth rate limit). */
export class LoginLockoutError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'LoginLockoutError';
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

/**
 * Browser blocked or could not complete the request (CORS preflight failure, 502, DNS, offline).
 * Often reported as "Failed to fetch" even when the root cause is the API not responding.
 */
export class ApiNetworkError extends Error {
  readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string, cause?: unknown) {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'this site';
    const isCrossOrigin =
      typeof window !== 'undefined' &&
      apiBaseUrl.startsWith('http') &&
      !apiBaseUrl.startsWith(window.location.origin);
    const crossOriginHint = isCrossOrigin
      ? 'Requests from this dashboard need CORS on api.selorg.com, or use same-origin /api/v1 with nginx proxying /api/ to Node (port 3333). '
      : '';
    const sameOriginHint =
      !isCrossOrigin && apiBaseUrl.startsWith('/')
        ? 'Ensure dashboard nginx proxies /api/ to the Node backend (port 3333). '
        : '';
    super(
      `Cannot reach the API at ${apiBaseUrl}. ` +
        crossOriginHint +
        sameOriginHint +
        'The server may be down or misconfigured (common symptom: nginx 502 on api.selorg.com). ' +
        'Start backend: cd selorg-dashboard-backend-v1.1 && npm start (or pm2 start ecosystem.config.cjs).'
    );
    this.name = 'ApiNetworkError';
    this.apiBaseUrl = apiBaseUrl;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

function isFetchNetworkFailure(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
}

function resolveHealthCheckUrl(apiBaseUrl: string): string {
  if (apiBaseUrl.startsWith('http')) {
    try {
      return new URL('/health/ready', new URL(apiBaseUrl).origin).href;
    } catch {
      return '/health/ready';
    }
  }
  return '/health/ready';
}

function isNodeHealthPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  const inner =
    record.success === true && record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;
  const status = inner.status;
  return status === 'healthy' || status === 'ready';
}

/** True when nginx serves a static placeholder instead of the Node backend. */
function isStaleNginxHealthBody(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.includes('api server running') || normalized.startsWith('<!doctype');
}

/**
 * Probe /health/ready (Node) before login POST.
 * api.selorg.com often exposes a static /health page while /api/* returns 502 without CORS headers.
 */
async function assertApiReachable(apiBaseUrl: string): Promise<void> {
  const healthUrl = resolveHealthCheckUrl(apiBaseUrl);
  try {
    const res = await fetch(healthUrl, { method: 'GET', credentials: 'omit', cache: 'no-store' });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = (await res.json().catch(() => null)) as unknown;
        if (isNodeHealthPayload(data)) return;
      } else {
        const text = await res.text().catch(() => '');
        if (isStaleNginxHealthBody(text)) {
          throw new ApiNetworkError(apiBaseUrl);
        }
      }
      throw new ApiNetworkError(apiBaseUrl);
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new ApiNetworkError(apiBaseUrl);
    }
  } catch (err) {
    if (err instanceof ApiNetworkError) throw err;
    if (isFetchNetworkFailure(err)) {
      throw new ApiNetworkError(apiBaseUrl, err);
    }
    throw err;
  }
}

function parseRetryAfterSeconds(response: Response, body: Record<string, unknown>): number {
  const fromBody = body.retryAfterSeconds ?? body.retryAfter;
  if (typeof fromBody === 'number' && Number.isFinite(fromBody) && fromBody > 0) {
    return Math.ceil(fromBody);
  }
  if (typeof fromBody === 'string' && /^\d+$/.test(fromBody.trim())) {
    return Math.ceil(parseInt(fromBody.trim(), 10));
  }

  const retryHeader = response.headers.get('Retry-After');
  if (retryHeader) {
    const n = parseInt(retryHeader.trim(), 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  const resetHeader = response.headers.get('RateLimit-Reset');
  if (resetHeader) {
    const ts = parseInt(resetHeader.trim(), 10);
    if (!Number.isNaN(ts)) {
      const nowSec = Math.floor(Date.now() / 1000);
      const delta = ts - nowSec;
      if (delta > 0) return Math.ceil(delta);
    }
  }

  return 900;
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
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  await assertApiReachable(API_CONFIG.baseURL);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        role: credentials.role,
      }),
    });
  } catch (err) {
    if (isFetchNetworkFailure(err)) {
      throw new ApiNetworkError(API_CONFIG.baseURL, err);
    }
    throw err;
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const nested =
      error && typeof error.error === 'object' && error.error !== null
        ? (error.error as Record<string, unknown>)
        : null;
    let message =
      (typeof error.message === 'string' && error.message) ||
      (nested && typeof nested.message === 'string' && nested.message) ||
      'Login failed';

    if (
      response.status === 503 ||
      /buffering timed out|database is not available/i.test(message)
    ) {
      message =
        'Database is temporarily unavailable. Ensure the backend is running and MongoDB is connected, then try again.';
    }

    if (response.status === 429) {
      const seconds = parseRetryAfterSeconds(response, error);
      throw new LoginLockoutError(message, seconds);
    }

    throw new Error(message);
  }

  const json = (await response.json()) as Record<string, unknown>;

  // Backend may wrap payloads in ResponseFormatter envelope: { success, data: { token, user, ... } }
  if (
    json &&
    typeof json === 'object' &&
    json.success === true &&
    json.data !== null &&
    typeof json.data === 'object'
  ) {
    const inner = json.data as Record<string, unknown>;
    if (typeof inner.token === 'string' && inner.user && typeof inner.user === 'object') {
      return { token: inner.token, user: inner.user as LoginResponse['user'] };
    }
  }

  if (typeof json.token === 'string' && json.user && typeof json.user === 'object') {
    return { token: json.token, user: json.user as LoginResponse['user'] };
  }

  throw new Error('Invalid login response from server');
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
