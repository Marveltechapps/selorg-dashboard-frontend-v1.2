import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '../config/api';

const STORAGE_KEYS = {
  token: 'selorg_auth_token',
  user: 'selorg_auth_user',
  storeId: 'selorg_active_store',
  logout: 'selorg_auth_logout_event',
};

function persistAuth(token: string | null, user: AuthUser | null, storeId: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_KEYS.token, token);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.token);
    }
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.user);
    }
    if (storeId) {
      sessionStorage.setItem(STORAGE_KEYS.storeId, storeId);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.storeId);
    }
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

function loadPersistedAuth(): { token: string | null; user: AuthUser | null; storeId: string | null } {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.token);
    const userStr = sessionStorage.getItem(STORAGE_KEYS.user);
    const storeId = sessionStorage.getItem(STORAGE_KEYS.storeId);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user, storeId };
  } catch {
    return { token: null, user: null, storeId: null };
  }
}

function migrateFromLocalStorage() {
  try {
    if (sessionStorage.getItem(STORAGE_KEYS.token)) return;
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (!token) return;
    const userStr = localStorage.getItem(STORAGE_KEYS.user);
    const storeId = localStorage.getItem(STORAGE_KEYS.storeId);
    sessionStorage.setItem(STORAGE_KEYS.token, token);
    if (userStr) sessionStorage.setItem(STORAGE_KEYS.user, userStr);
    if (storeId) sessionStorage.setItem(STORAGE_KEYS.storeId, storeId);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.storeId);
  } catch {
    // ignore migration errors
  }
}

migrateFromLocalStorage();

// ---------------------------------------------------------------------------
// Module-level in-memory storage (accessible outside React tree)
// ---------------------------------------------------------------------------
const persisted = loadPersistedAuth();
let _token: string | null = persisted.token;
let _user: AuthUser | null = persisted.user;
let _activeStoreId: string | null = persisted.storeId;

export function getAuthToken(): string | null {
  return _token;
}

export function getActiveStoreId(): string | null {
  return _activeStoreId;
}

export function getAuthUser(): AuthUser | null {
  return _user;
}

export function isAuthenticated(): boolean {
  return _token !== null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  assignedStores?: string[];
  primaryStoreId?: string;
}

export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  activeStoreId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  switchStore: (storeCode: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(_token);
  const [user, setUser] = useState<AuthUser | null>(_user);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(_activeStoreId);
  const [isLoading, setIsLoading] = useState(true);
  const sessionChecked = useRef(false);

  const clearAuth = useCallback(() => {
    _token = null;
    _user = null;
    _activeStoreId = null;
    persistAuth(null, null, null);
    setToken(null);
    setUser(null);
    setActiveStoreId(null);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    _token = newToken;
    _user = newUser;
    _activeStoreId = newUser.primaryStoreId ?? newUser.assignedStores?.[0] ?? null;

    persistAuth(newToken, newUser, _activeStoreId);
    setToken(newToken);
    setUser(newUser);
    setActiveStoreId(_activeStoreId);
  }, []);

  const logout = useCallback(() => {
    if (_token && _user?.role) {
      const loginPath = `/auth/login`;
      const logoutPath = loginPath.replace(/\/login$/, '/logout');
      fetch(`${API_CONFIG.baseURL}${logoutPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${_token}` },
      }).catch(() => {});
    }
    clearAuth();
    try {
      localStorage.setItem(STORAGE_KEYS.logout, Date.now().toString());
    } catch { /* ignore */ }
    window.location.href = '/login';
  }, [clearAuth]);

  const switchStore = useCallback((storeCode: string) => {
    if (_user?.assignedStores && !_user.assignedStores.includes(storeCode)) {
      return;
    }
    _activeStoreId = storeCode;
    persistAuth(_token, _user, storeCode);
    setActiveStoreId(storeCode);
  }, []);

  useEffect(() => {
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    if (_token && !isTokenExpired(_token)) {
      setToken(_token);
      setUser(_user);
      setActiveStoreId(_activeStoreId);
      setIsLoading(false);
      return;
    }

    clearAuth();
    setIsLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.logout) {
        clearAuth();
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearAuth]);

  const value: AuthContextType = {
    token,
    user,
    activeStoreId,
    isAuthenticated: token !== null,
    isLoading,
    login,
    logout,
    switchStore,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
