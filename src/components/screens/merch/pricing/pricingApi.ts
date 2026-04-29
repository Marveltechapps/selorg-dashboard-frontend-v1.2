import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';

const PRICING_URL = `${API_CONFIG.baseURL}/merch/pricing`;

function buildAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

function toApiError(error: unknown, fallback = 'Request failed') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const raw = data?.error ?? data?.message ?? error.message;
    if (typeof raw === 'string' && raw.trim()) return new Error(raw);
    if (raw && typeof raw === 'object') {
      const nested = (raw as Record<string, unknown>).message;
      if (typeof nested === 'string' && nested.trim()) return new Error(nested);
      return new Error(JSON.stringify(raw));
    }
  }
  if (error instanceof Error && error.message) return error;
  return new Error(fallback);
}

function toSkuFrontend(s: any) {
  const id = s.id ?? s._id;
  return {
    id: id ? String(id) : '',
    _id: id ? String(id) : '',
    name: s.name ?? '',
    code: s.code ?? s.sku ?? '',
    sku: s.sku ?? s.code ?? '',
    cost: s.cost ?? 0,
    base: s.base ?? s.basePrice ?? 0,
    basePrice: s.basePrice ?? s.base ?? 0,
    sell: s.sell ?? s.sellingPrice ?? s.currentPrice ?? 0,
    sellingPrice: s.sellingPrice ?? s.sell ?? 0,
    competitor: s.competitor ?? s.competitorPrice ?? s.competitorAvg ?? 0,
    competitorPrice: s.competitor ?? s.competitorAvg ?? 0,
    competitorAvg: s.competitor ?? s.competitorAvg ?? 0,
    margin: s.margin ?? 0,
    marginStatus: s.marginStatus ?? 'healthy',
    history: s.history ?? [],
    category: s.category,
    region: s.region,
  };
}

export const pricingApi = {
  async getPricingSKUs() {
    try {
      const response = await axios.get(`${PRICING_URL}/skus`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      const list = Array.isArray(data) ? data : [];
      return { success: true, data: list.map(toSkuFrontend) };
    } catch (error) {
      throw toApiError(error, 'Failed to load pricing SKUs');
    }
  },

  async getSkus() {
    return this.getPricingSKUs();
  },

  async updateSkuPrice(id: string, data: { base?: number; sell?: number; competitor?: number; margin?: number; marginStatus?: string }) {
    const payload: Record<string, unknown> = {};
    if (data.base !== undefined) payload.basePrice = data.base;
    if (data.sell !== undefined) payload.sellingPrice = data.sell;
    if (data.competitor !== undefined) payload.competitorAvg = data.competitor;
    if (data.margin !== undefined) payload.margin = data.margin;
    if (data.marginStatus !== undefined) payload.marginStatus = data.marginStatus;
    try {
      const response = await axios.put(`${PRICING_URL}/skus/${id}`, payload, { headers: buildAuthHeaders() });
      const d = response.data?.data ?? response.data;
      return { success: true, data: d ? toSkuFrontend(d) : d };
    } catch (error) {
      throw toApiError(error, 'Failed to update SKU price');
    }
  },

  async getSurgeRules() {
    try {
      const response = await axios.get(`${PRICING_URL}/surge-rules`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      const list = Array.isArray(data) ? data : [];
      return { success: true, data: list };
    } catch (error) {
      throw toApiError(error, 'Failed to load surge rules');
    }
  },

  async createSurgeRule(data: Record<string, unknown>) {
    try {
      const response = await axios.post(`${PRICING_URL}/surge-rules`, data, { headers: buildAuthHeaders() });
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      throw toApiError(error, 'Failed to create surge rule');
    }
  },

  async updateSurgeRule(id: string, data: Record<string, unknown>) {
    try {
      const response = await axios.put(`${PRICING_URL}/surge-rules/${id}`, data, { headers: buildAuthHeaders() });
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      throw toApiError(error, 'Failed to update surge rule');
    }
  },

  async deleteSurgeRule(id: string) {
    try {
      const response = await axios.delete(`${PRICING_URL}/surge-rules/${id}`, { headers: buildAuthHeaders() });
      return { success: true, data: response.data?.data };
    } catch (error) {
      throw toApiError(error, 'Failed to delete surge rule');
    }
  },

  async getSurgeEnabled(): Promise<boolean> {
    try {
      const response = await axios.get(`${PRICING_URL}/surge-config`, { headers: buildAuthHeaders() });
      const enabled = response.data?.data?.enabled;
      return enabled !== false;
    } catch {
      return true;
    }
  },

  async setSurgeEnabled(enabled: boolean): Promise<void> {
    try {
      await axios.put(`${PRICING_URL}/surge-config`, { enabled }, { headers: buildAuthHeaders() });
    } catch (error) {
      throw toApiError(error, 'Failed to update surge config');
    }
  },

  async getPendingUpdates() {
    try {
      const response = await axios.get(`${PRICING_URL}/pending-updates`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      const list = Array.isArray(data) ? data : [];
      return { success: true, data: list };
    } catch (error) {
      throw toApiError(error, 'Failed to load pending updates');
    }
  },

  async handlePendingUpdate(id: string, status: string, _reason?: string) {
    try {
      const response = await axios.put(`${PRICING_URL}/pending-updates/${id}`, { status }, { headers: buildAuthHeaders() });
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      throw toApiError(error, 'Failed to update pending request');
    }
  },

  async getPriceRules() {
    try {
      const response = await axios.get(`${PRICING_URL}/price-rules`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      const list = Array.isArray(data) ? data : [];
      return { success: true, data: list };
    } catch (error) {
      throw toApiError(error, 'Failed to load price rules');
    }
  },

  async createPriceRule(rule: Record<string, unknown>) {
    try {
      const response = await axios.post(`${PRICING_URL}/price-rules`, rule, { headers: buildAuthHeaders() });
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      throw toApiError(error, 'Failed to create price rule');
    }
  },

  async getMarginRisks() {
    const { success, data: skus } = await this.getPricingSKUs();
    if (!success || !Array.isArray(skus)) return { success: true, data: [] };
    const risks = skus
      .filter((s: any) => {
        const m = s.margin ?? 0;
        const status = (s.marginStatus ?? '').toLowerCase();
        return m < 15 || status === 'critical' || status === 'warning';
      })
      .map((s: any) => ({
        ...s,
        status: (s.margin ?? 0) < 5 ? 'Critical' : 'Warning',
        category: s.category ?? 'general',
        region: s.region ?? 'east',
      }));
    return { success: true, data: risks };
  },

  updateMarginRisks(_list: any[]) {
    // No backend for "dismissed" risks; parent will refetch SKUs.
    return { success: true };
  },
};
