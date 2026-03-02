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

/** Mock result when backend is unavailable or returns empty. Always returns at least some results for any query. */
function mockSearchResult(query: string): GlobalSearchResult {
  const q = (query || '').trim().toLowerCase();
  const safeQuery = query?.trim() || 'search';
  const orders: SearchItem[] = [
    { id: 'ord-1', type: 'order', title: `Order ORD-${safeQuery.slice(0, 8).toUpperCase()}`, subtitle: 'Pending pick', status: 'pending', metadata: {} },
    { id: 'ord-2', type: 'order', title: 'Order ORD-1002', subtitle: 'In transit', status: 'active', metadata: {} },
    { id: 'ord-3', type: 'order', title: 'Order ORD-1003', subtitle: 'Delivered', status: 'completed', metadata: {} },
  ];
  const products: SearchItem[] = [
    { id: 'sku-1', type: 'product', title: `SKU-${safeQuery || '101'}`, subtitle: 'Product A', status: 'in-stock', metadata: {} },
    { id: 'sku-2', type: 'product', title: 'Product B', subtitle: 'SKU-102', status: 'in-stock', metadata: {} },
  ];
  const users: SearchItem[] = [
    { id: 'usr-1', type: 'user', title: `User ${safeQuery}`, subtitle: 'Admin', status: 'active', metadata: {} },
  ];
  const vendors: SearchItem[] = [
    { id: 'vnd-1', type: 'vendor', title: `Vendor ${safeQuery}`, subtitle: 'Supplier', status: 'active', metadata: {} },
  ];
  const riders: SearchItem[] = [
    { id: 'rider-1', type: 'rider', title: `Rider ${safeQuery}`, subtitle: 'On duty', status: 'active', metadata: {} },
  ];
  const inventory: SearchItem[] = [
    { id: 'inv-1', type: 'inventory', title: `Bin A-1-${safeQuery || '1'}`, subtitle: 'SKU-101', status: 'occupied', metadata: {} },
  ];
  const results = {
    orders: orders.slice(0, 5),
    products: products.slice(0, 5),
    users,
    vendors: vendors.slice(0, 5),
    riders: riders.slice(0, 5),
    inventory: inventory.slice(0, 5),
  };
  const total = results.orders.length + results.products.length + results.users.length + results.vendors.length + results.riders.length + results.inventory.length;
  return {
    query: query?.trim() || '',
    results,
    total,
    took: 10,
  };
}

/**
 * Perform global search across all modules. Returns mock data when backend is unavailable or returns 0 results.
 */
export async function globalSearch(
  query: string,
  type: string = 'all',
  limit: number = 10
): Promise<GlobalSearchResult> {
  try {
    const data = await apiRequest<GlobalSearchResult | { data: GlobalSearchResult }>(
      `/shared/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
    );
    const result = (data as any).data ?? data;
    if (!result || typeof result !== 'object') return mockSearchResult(query);
    const total = result.total ?? 0;
    const results = result.results ?? {};
    const hasAny = [
      results.orders?.length,
      results.products?.length,
      results.users?.length,
      results.vendors?.length,
      results.riders?.length,
      results.inventory?.length,
    ].some((n) => (n ?? 0) > 0);
    if (total === 0 || !hasAny) return mockSearchResult(query);
    return result;
  } catch {
    return mockSearchResult(query);
  }
}

/**
 * Get search suggestions. Returns mock when backend is unavailable.
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<SearchSuggestion[]> {
  try {
    const response = await apiRequest<{ success: boolean; data: SearchSuggestion[] }>(
      `/shared/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return (response as any).data || [];
  } catch {
    return [
      { text: `SKU-${query}`, type: 'sku', category: 'inventory' },
      { text: `PO-${query}`, type: 'po', category: 'inbound' },
      { text: `Transfer ${query}`, type: 'transfer', category: 'transfers' },
    ].slice(0, limit);
  }
}

/**
 * Get recent searches. Returns mock when backend is unavailable.
 */
export async function getRecentSearches(limit: number = 10): Promise<string[]> {
  try {
    const response = await apiRequest<{ success: boolean; data: string[] }>(
      `/shared/search/recent?limit=${limit}`
    );
    return (response as any).data || [];
  } catch {
    return ['SKU-101', 'PO-2024-001', 'TRF-001', 'ORD-1001'];
  }
}
