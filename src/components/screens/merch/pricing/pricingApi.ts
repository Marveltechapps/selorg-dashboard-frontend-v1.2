import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { getAuthToken } from '../../../../contexts/AuthContext';

const PRICING_URL = `${API_CONFIG.baseURL}/merch/pricing`;

function buildAuthHeaders() {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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
    marginReviewed: s.marginReviewed ?? false,
    history: s.history ?? [],
    category: s.category,
    region: s.region,
  };
}

function parseMultiplier(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const raw = String(value ?? '').replace(/x/gi, '').trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 1.2;
}

export function toSurgeRuleDisplay(rule: any) {
  const zoneNames = rule.conditions?.zoneNames?.join(', ')
    || (Array.isArray(rule.conditions?.zones) ? rule.conditions.zones.length + ' zone(s)' : 'All zones');
  const triggerMap: Record<string, string> = {
    demand_based: 'High Demand',
    time_based: 'Time of Day',
    zone_based: 'Zone Based',
    event_based: 'Special Event',
  };
  return {
    ...rule,
    id: rule.id ?? rule._id,
    zone: zoneNames,
    trigger: triggerMap[rule.type] || rule.description || rule.name || 'Surge rule',
    multiplier: typeof rule.multiplier === 'number' ? `${rule.multiplier}x` : String(rule.multiplier ?? '1.2x'),
    active: (rule.status ?? 'active') === 'active',
    status: rule.status ?? 'active',
  };
}

export function buildSurgeRulePayload(form: {
  name: string;
  description?: string;
  type: string;
  multiplier: string | number;
  zoneId?: string;
  priority?: string | number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const multiplier = parseMultiplier(form.multiplier);
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description?.trim() || '',
    type: form.type,
    multiplier,
    conditions: {},
    applicableCategories: [],
    applicableProducts: [],
    priority: parseInt(String(form.priority ?? 5), 10) || 5,
    status: form.status || 'active',
    startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
  };
  if (form.type === 'zone_based' && form.zoneId) {
    payload.conditions = { zones: [form.zoneId] };
  } else if (form.type === 'demand_based') {
    payload.conditions = { demandThreshold: 500 };
  } else if (form.type === 'time_based') {
    payload.conditions = {
      timeSlots: [{ start: '18:00', end: '21:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }],
    };
  }
  return payload;
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

  async updateSkuPrice(id: string, data: { base?: number; sell?: number; competitor?: number; margin?: number; marginStatus?: string; marginReviewed?: boolean }) {
    const payload: Record<string, unknown> = {};
    if (data.base !== undefined) payload.basePrice = data.base;
    if (data.sell !== undefined) payload.sellingPrice = data.sell;
    if (data.competitor !== undefined) payload.competitorAvg = data.competitor;
    if (data.margin !== undefined) payload.margin = data.margin;
    if (data.marginStatus !== undefined) payload.marginStatus = data.marginStatus;
    if (data.marginReviewed !== undefined) payload.marginReviewed = data.marginReviewed;
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

  async bulkUpdateSkus(updates: Array<{ id: string; base?: number; sell?: number; margin?: number; marginStatus?: string }>) {
    try {
      const response = await axios.post(`${PRICING_URL}/skus/bulk`, { updates }, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      return { success: true, count: response.data?.count ?? list.length, data: list.map(toSkuFrontend) };
    } catch (error) {
      throw toApiError(error, 'Failed to bulk update SKUs');
    }
  },

  async getReferencesZones() {
    try {
      const response = await axios.get(`${PRICING_URL}/references/zones`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      throw toApiError(error, 'Failed to load zones');
    }
  },

  async getReferencesCategories() {
    try {
      const response = await axios.get(`${PRICING_URL}/references/categories`, { headers: buildAuthHeaders() });
      const data = response.data?.data ?? response.data ?? [];
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      throw toApiError(error, 'Failed to load categories');
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
        if (s.marginReviewed) return false;
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

  async fixMarginRisk(sku: any, targetMargin = 15) {
    const cost = sku.cost ?? 0;
    if (cost <= 0) throw new Error('SKU cost is missing');
    const newSell = parseFloat((cost / (1 - targetMargin / 100)).toFixed(2));
    return this.updateSkuPrice(sku.id ?? sku._id, {
      sell: newSell,
      margin: targetMargin,
      marginStatus: targetMargin < 10 ? 'critical' : targetMargin < 15 ? 'warning' : 'healthy',
    });
  },

  async markMarginReviewed(id: string) {
    return this.updateSkuPrice(id, { marginReviewed: true });
  },
};
