import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';

const PRICING_URL = `${API_CONFIG.baseURL}/merch/pricing`;

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
    const response = await axios.get(`${PRICING_URL}/skus`);
    const data = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return { success: true, data: list.map(toSkuFrontend) };
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
    const response = await axios.put(`${PRICING_URL}/skus/${id}`, payload);
    const d = response.data?.data ?? response.data;
    return { success: true, data: d ? toSkuFrontend(d) : d };
  },

  async getSurgeRules() {
    const response = await axios.get(`${PRICING_URL}/surge-rules`);
    const data = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return { success: true, data: list };
  },

  async createSurgeRule(data: Record<string, unknown>) {
    const response = await axios.post(`${PRICING_URL}/surge-rules`, data);
    return { success: true, data: response.data?.data ?? response.data };
  },

  async updateSurgeRule(id: string, data: Record<string, unknown>) {
    const response = await axios.put(`${PRICING_URL}/surge-rules/${id}`, data);
    return { success: true, data: response.data?.data ?? response.data };
  },

  async deleteSurgeRule(id: string) {
    const response = await axios.delete(`${PRICING_URL}/surge-rules/${id}`);
    return { success: true, data: response.data?.data };
  },

  async getSurgeEnabled(): Promise<boolean> {
    try {
      const response = await axios.get(`${PRICING_URL}/surge-config`);
      const enabled = response.data?.data?.enabled;
      return enabled !== false;
    } catch {
      return true;
    }
  },

  async setSurgeEnabled(enabled: boolean): Promise<void> {
    await axios.put(`${PRICING_URL}/surge-config`, { enabled });
  },

  async getPendingUpdates() {
    const response = await axios.get(`${PRICING_URL}/pending-updates`);
    const data = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return { success: true, data: list };
  },

  async handlePendingUpdate(id: string, status: string, _reason?: string) {
    const response = await axios.put(`${PRICING_URL}/pending-updates/${id}`, { status });
    return { success: true, data: response.data?.data ?? response.data };
  },

  async getPriceRules() {
    const response = await axios.get(`${PRICING_URL}/price-rules`);
    const data = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return { success: true, data: list };
  },

  async createPriceRule(rule: Record<string, unknown>) {
    const response = await axios.post(`${PRICING_URL}/price-rules`, rule);
    return { success: true, data: response.data?.data ?? response.data };
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
