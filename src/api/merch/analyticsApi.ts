import { apiRequest } from '../apiClient';

const BASE_PATH = '/merch';

export const pricingApi = {
  calculatePrice: async (sku: string, factors: any) => {
    return apiRequest(`${BASE_PATH}/pricing/calculate`, 'POST', { sku, factors });
  },
  optimizePrice: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/pricing/${sku}/optimize`, 'POST');
  },
  getPriceHistory: async (sku: string, daysBack?: number) => {
    return apiRequest(`${BASE_PATH}/pricing/${sku}/history`, 'GET', null, { daysBack });
  },
  createRule: async (data: any) => {
    return apiRequest(`${BASE_PATH}/pricing-rules`, 'POST', data);
  },
  getAllRules: async () => {
    return apiRequest(`${BASE_PATH}/pricing-rules`, 'GET');
  },
  updateRule: async (ruleId: string, data: any) => {
    return apiRequest(`${BASE_PATH}/pricing-rules/${ruleId}`, 'PUT', data);
  },
  calculateBulk: async (skus: string[]) => {
    return apiRequest(`${BASE_PATH}/pricing/bulk-calculate`, 'POST', { skus });
  },
};

export const promotionApi = {
  createCampaign: async (data: any) => {
    return apiRequest(`${BASE_PATH}/campaigns`, 'POST', data);
  },
  getCampaign: async (campaignId: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}`, 'GET');
  },
  approveCampaign: async (campaignId: string, approver: string, comments?: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}/approve`, 'POST', { approver, comments });
  },
  launchCampaign: async (campaignId: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}/launch`, 'POST');
  },
  pauseCampaign: async (campaignId: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}/pause`, 'POST');
  },
  completeCampaign: async (campaignId: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}/complete`, 'POST');
  },
  getMetrics: async (campaignId: string) => {
    return apiRequest(`${BASE_PATH}/campaigns/${campaignId}/metrics`, 'GET');
  },
  getAllCampaigns: async () => {
    return apiRequest(`${BASE_PATH}/campaigns`, 'GET');
  },
};

export const markdownApi = {
  createPolicy: async (data: any) => {
    return apiRequest(`${BASE_PATH}/markdowns`, 'POST', data);
  },
  getPolicy: async (markdownId: string) => {
    return apiRequest(`${BASE_PATH}/markdowns/${markdownId}`, 'GET');
  },
  recordSale: async (markdownId: string, unitsSold: number, revenue: number) => {
    return apiRequest(`${BASE_PATH}/markdowns/${markdownId}/record-sale`, 'POST', { unitsSold, revenue });
  },
  getMetrics: async (markdownId: string) => {
    return apiRequest(`${BASE_PATH}/markdowns/${markdownId}/metrics`, 'GET');
  },
  completeMarkdown: async (markdownId: string) => {
    return apiRequest(`${BASE_PATH}/markdowns/${markdownId}/complete`, 'POST');
  },
  getAllMarkdowns: async () => {
    return apiRequest(`${BASE_PATH}/markdowns`, 'GET');
  },
};

export const competitorApi = {
  trackPrice: async (data: any) => {
    return apiRequest(`${BASE_PATH}/competitor-prices`, 'POST', data);
  },
  updatePrice: async (trackingId: string, newPrice: number, newAvailability?: string) => {
    return apiRequest(`${BASE_PATH}/competitor-prices/${trackingId}`, 'PUT', { newPrice, newAvailability });
  },
  getComparison: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/pricing/${sku}/comparison`, 'GET');
  },
  getRecommendations: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/pricing/${sku}/recommendations`, 'GET');
  },
  getAnalysis: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/pricing/${sku}/analysis`, 'GET');
  },
  getAllPrices: async () => {
    return apiRequest(`${BASE_PATH}/competitor-prices`, 'GET');
  },
};

export const analyticsApi = {
  calculateSalesAnalytics: async (period?: string) => {
    return apiRequest(`${BASE_PATH}/analytics/sales`, 'POST', { period });
  },
  calculateInventoryAnalytics: async () => {
    return apiRequest(`${BASE_PATH}/analytics/inventory`, 'POST');
  },
  getSalesAnalytics: async (period?: string, daysBack?: number) => {
    return apiRequest(`${BASE_PATH}/analytics/sales`, 'GET', null, { period, daysBack });
  },
  getInventoryAnalytics: async (daysBack?: number) => {
    return apiRequest(`${BASE_PATH}/analytics/inventory`, 'GET', null, { daysBack });
  },
  getTrendAnalysis: async () => {
    return apiRequest(`${BASE_PATH}/analytics/trends`, 'GET');
  },
};

export const forecastApi = {
  createDemandForecast: async (sku: string, daysAhead?: number) => {
    return apiRequest(`${BASE_PATH}/forecasts/demand`, 'POST', { sku, daysAhead });
  },
  createSalesForecast: async (daysAhead?: number) => {
    return apiRequest(`${BASE_PATH}/forecasts/sales`, 'POST', { daysAhead });
  },
  getDemandForecast: async (sku: string) => {
    return apiRequest(`${BASE_PATH}/forecasts/demand/${sku}`, 'GET');
  },
  getSalesForecast: async () => {
    return apiRequest(`${BASE_PATH}/forecasts/sales`, 'GET');
  },
  getAllForecasts: async () => {
    return apiRequest(`${BASE_PATH}/forecasts`, 'GET');
  },
};

export const dashboardApi = {
  getExecutiveDashboard: async () => {
    return apiRequest(`${BASE_PATH}/dashboards/executive`, 'GET');
  },
  getSalesMetricsDashboard: async (daysBack?: number) => {
    return apiRequest(`${BASE_PATH}/dashboards/sales-metrics`, 'GET', null, { daysBack });
  },
  getInventoryMetricsDashboard: async (daysBack?: number) => {
    return apiRequest(`${BASE_PATH}/dashboards/inventory-metrics`, 'GET', null, { daysBack });
  },
  getForecastingDashboard: async () => {
    return apiRequest(`${BASE_PATH}/dashboards/forecasting`, 'GET');
  },
};

export default {
  pricing: pricingApi,
  promotion: promotionApi,
  markdown: markdownApi,
  competitor: competitorApi,
  analytics: analyticsApi,
  forecast: forecastApi,
  dashboard: dashboardApi,
};
