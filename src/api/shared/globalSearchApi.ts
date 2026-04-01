import { apiRequest } from '../apiClient';

export interface GlobalSearchResult {
  query: string;
  results: {
    orders: SearchItem[];
    products: SearchItem[];
    users: SearchItem[];
    vendors: SearchItem[];
    riders: SearchItem[];
    inventory: SearchItem[];
  };
  total: number;
  took: number;
}

export interface SearchItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status: string;
  metadata: Record<string, any>;
}

export interface SearchSuggestion {
  text: string;
  type: string;
  category: string;
}

/** Scopes shared search to the dashboard that issued the request (backend filters modules + recent). */
export type SearchDashboardScope = 'admin' | 'warehouse';

export interface GlobalSearchRequestOptions {
  dashboard?: SearchDashboardScope;
}

const RESULT_KEYS = ['orders', 'products', 'users', 'vendors', 'riders', 'inventory'] as const;

function emptyResults(): GlobalSearchResult['results'] {
  return {
    orders: [],
    products: [],
    users: [],
    vendors: [],
    riders: [],
    inventory: [],
  };
}

function emptyGlobalSearchResult(query: string): GlobalSearchResult {
  return {
    query: query.trim(),
    results: emptyResults(),
    total: 0,
    took: 0,
  };
}

function normalizeGlobalSearchResult(query: string, raw: unknown): GlobalSearchResult {
  if (raw == null || typeof raw !== 'object') {
    return emptyGlobalSearchResult(query);
  }
  const root = raw as Record<string, unknown>;
  const payload =
    root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const resultsRaw = payload.results;
  const resultsObj =
    resultsRaw != null && typeof resultsRaw === 'object' && !Array.isArray(resultsRaw)
      ? (resultsRaw as Record<string, unknown>)
      : {};

  const results = emptyResults();
  for (const key of RESULT_KEYS) {
    const arr = resultsObj[key];
    if (Array.isArray(arr)) {
      results[key] = arr as SearchItem[];
    }
  }

  const total = RESULT_KEYS.reduce((sum, k) => sum + results[k].length, 0);
  const tookRaw = payload.took;
  const took =
    typeof tookRaw === 'number' && Number.isFinite(tookRaw) && tookRaw >= 0 ? tookRaw : 0;
  const qRaw = payload.query;
  const q = typeof qRaw === 'string' ? qRaw : query.trim();

  return { query: q, results, total, took };
}

function appendDashboardQuery(
  pathWithQuery: string,
  options?: GlobalSearchRequestOptions
): string {
  if (!options?.dashboard) return pathWithQuery;
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  return `${pathWithQuery}${sep}dashboard=${encodeURIComponent(options.dashboard)}`;
}

/**
 * Perform global search via `/shared/search` only.
 * Pass `dashboard` from admin or warehouse top bars so the API returns only that surface’s modules.
 */
export async function globalSearch(
  query: string,
  type: string = 'all',
  limit: number = 10,
  options?: GlobalSearchRequestOptions
): Promise<GlobalSearchResult> {
  try {
    const qs = new URLSearchParams({
      q: query,
      type,
      limit: String(limit),
    });
    if (options?.dashboard) qs.set('dashboard', options.dashboard);
    const data = await apiRequest<GlobalSearchResult | { data: GlobalSearchResult }>(
      `/shared/search?${qs.toString()}`
    );
    return normalizeGlobalSearchResult(query, data);
  } catch {
    return emptyGlobalSearchResult(query);
  }
}

/**
 * Get search suggestions from `/shared/search/suggestions`.
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5,
  options?: GlobalSearchRequestOptions
): Promise<SearchSuggestion[]> {
  try {
    const base = `/shared/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await apiRequest<{ success: boolean; data: SearchSuggestion[] }>(
      appendDashboardQuery(base, options)
    );
    if (response == null || typeof response !== 'object') return [];
    const data = (response as { data?: unknown }).data;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (s): s is SearchSuggestion =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as SearchSuggestion).text === 'string' &&
        (s as SearchSuggestion).text.length > 0
    );
  } catch {
    return [];
  }
}

/**
 * Get recent searches from `/shared/search/recent`.
 */
export async function getRecentSearches(
  limit: number = 10,
  options?: GlobalSearchRequestOptions
): Promise<string[]> {
  try {
    const base = `/shared/search/recent?limit=${limit}`;
    const response = await apiRequest<{ success: boolean; data: string[] }>(
      appendDashboardQuery(base, options)
    );
    if (response == null || typeof response !== 'object') return [];
    const data = (response as { data?: unknown }).data;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}
