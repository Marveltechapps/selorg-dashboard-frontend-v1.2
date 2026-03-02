// Real backend API for allocation & stock operations
import { getAuthToken } from '../../../../contexts/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '/api/v1';
const API_BASE_URL = `${API_BASE}/merch/allocation`;

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Group flat allocations by SKU into frontend shape */
function allocationsToSkus(allocations: any[]): any[] {
  if (!allocations || !Array.isArray(allocations)) return [];
  const bySku: Record<string, any> = {};
  for (const a of allocations) {
    const skuId = (a.skuId?._id ?? a.skuId)?.toString?.() ?? String(a.skuId);
    if (!bySku[skuId]) {
      const sku = a.skuId && typeof a.skuId === 'object' ? a.skuId : {};
      bySku[skuId] = {
        id: skuId,
        name: sku.name ?? 'Unknown SKU',
        code: sku.code ?? '',
        packSize: sku.packSize ?? '',
        category: sku.category ?? '',
        totalStock: 0,
        locations: []
      };
    }
    const loc = {
      id: a.locationId ?? `loc-${a._id}`,
      allocationId: a._id,
      name: a.locationName ?? a.locationId ?? 'Unknown',
      allocated: a.allocated ?? 0,
      target: a.target ?? 0,
      onHand: a.onHand ?? 0,
      inTransit: a.inTransit ?? 0,
      safetyStock: a.safetyStock ?? 0
    };
    bySku[skuId].locations.push(loc);
    bySku[skuId].totalStock += (a.onHand ?? 0);
  }
  return Object.values(bySku);
}

export const allocationApi = {
  // SKU allocations - fetch from backend and transform to SKU-centric
  async fetchSKUAllocations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch allocations');
    const json = await response.json();
    const data = json.data ?? json;
    return allocationsToSkus(Array.isArray(data) ? data : []);
  },

  async updateSKUAllocation(allocationId: string, updates: { allocated?: number; target?: number; onHand?: number; inTransit?: number; safetyStock?: number }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/${allocationId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update allocation');
    const json = await response.json();
    return json.data ?? json;
  },

  // Transfer Orders
  async createTransferOrder(order: { skuId: string; skuName: string; fromLocation: string; toLocation: string; quantity: number; requiredDate?: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/transfers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error('Failed to create transfer order');
    const json = await response.json();
    return json.data ?? json;
  },

  // Rebalance - bulk update allocations
  async rebalance(updates: { allocationId: string; allocated?: number; target?: number; onHand?: number; inTransit?: number }[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/rebalance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) throw new Error('Failed to rebalance');
    const json = await response.json();
    return json.data ?? json;
  },

  // Alerts
  async fetchAlerts(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/alerts`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const json = await response.json();
    const data = json.data ?? json;
    return Array.isArray(data) ? data : [];
  },

  async dismissAlert(alertId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'dismissed' }),
    });
    if (!response.ok) throw new Error('Failed to dismiss alert');
  },

  async seedAllocationData(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/seed`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to seed allocation data');
    return response.json();
  },

  async autoRebalance(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/rebalance/auto`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ scope: 'high-priority', strategy: 'minimize-stockouts' }),
    });
    if (!response.ok) throw new Error('Failed to run auto rebalance');
    const json = await response.json();
    return json.data ?? json;
  },

  /** Fetch allocation history for demand/stock chart. Returns [] if endpoint not available. */
  async fetchAllocationHistory(skuId: string): Promise<{ week: string; demand: number; stock: number }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sku/${skuId}/history`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      const json = await response.json();
      const data = json.data ?? json;
      if (!Array.isArray(data)) return [];
      return data.map((d: any) => ({
        week: d.week ?? d.label ?? d.period ?? '',
        demand: Number(d.demand ?? d.unitsSold ?? 0),
        stock: Number(d.stock ?? d.onHand ?? 0),
      }));
    } catch {
      return [];
    }
  },
};
