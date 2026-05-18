import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

const BASE = `${API_CONFIG.baseURL}/admin/platform-config`;

function headers(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type PlatformConfigRow = {
  _id?: string;
  key: string;
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchPlatformConfigs(prefix?: string): Promise<PlatformConfigRow[]> {
  const q = prefix?.trim() ? `?prefix=${encodeURIComponent(prefix.trim())}` : '';
  const res = await fetch(`${BASE}${q}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error?.message || `HTTP ${res.status}`);
  }
  return Array.isArray(body.data) ? body.data : [];
}

export async function savePlatformConfig(
  key: string,
  payload: { value: unknown; valueType: PlatformConfigRow['valueType']; description?: string }
): Promise<PlatformConfigRow> {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error?.message || `HTTP ${res.status}`);
  }
  return body.data as PlatformConfigRow;
}

export async function deletePlatformConfig(key: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error?.message || `HTTP ${res.status}`);
  }
}
