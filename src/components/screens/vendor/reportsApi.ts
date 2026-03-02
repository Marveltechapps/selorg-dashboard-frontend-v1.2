// --- Type Definitions ---

export interface SalesOverview {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  avgOrderValue: number;
  avgOrderGrowth: number;
  totalProducts: number;
  productsGrowth: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  stock: number;
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
}

export interface OrderAnalytics {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CustomerInsight {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}

export interface RevenueByCategory {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
  avgOrderValue: number;
}

export interface FinancialSummary {
  grossRevenue: number;
  platformFee: number;
  deliveryCharges: number;
  refunds: number;
  netRevenue: number;
  profitMargin: number;
}

export interface HourlySales {
  hour: string;
  orders: number;
  revenue: number;
}

import { apiRequest } from '@/api/apiClient';

// Helper function to convert date range string to actual dates
function getDateRange(dateRange: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  
  switch (dateRange) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setDate(end.getDate() - 30);
      break;
    case 'quarter':
      start.setDate(end.getDate() - 90);
      break;
    default:
      // If it's already in "start to end" format, parse it
      if (dateRange.includes(' to ')) {
        const [startStr, endStr] = dateRange.split(' to ');
        return { startDate: startStr, endDate: endStr };
      }
      // Default to week
      start.setDate(end.getDate() - 7);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// --- API Functions ---

export async function fetchSalesOverview(dateRange?: string, vendorId?: string): Promise<SalesOverview> {
  const params = new URLSearchParams();
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }
  if (vendorId) params.append('vendorId', vendorId);

  const response = await apiRequest<{ success: boolean; data: SalesOverview }>(
    `/vendor/reports/sales/overview?${params.toString()}`
  );
  return response.data;
}

export async function fetchSalesData(dateRange?: string, vendorId?: string, groupBy: string = 'day'): Promise<SalesData[]> {
  const params = new URLSearchParams();
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }
  if (vendorId) params.append('vendorId', vendorId);
  params.append('groupBy', groupBy);

  const response = await apiRequest<{ success: boolean; data: SalesData[] }>(
    `/vendor/reports/sales/data?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchProductPerformance(sortBy?: string, vendorId?: string, dateRange?: string): Promise<ProductPerformance[]> {
  const params = new URLSearchParams();
  if (sortBy) params.append('sortBy', sortBy);
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: ProductPerformance[] }>(
    `/vendor/reports/products/performance?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchOrderAnalytics(vendorId?: string, dateRange?: string): Promise<OrderAnalytics[]> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: OrderAnalytics[] }>(
    `/vendor/reports/orders/analytics?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchCustomerInsights(vendorId?: string, dateRange?: string): Promise<CustomerInsight[]> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: CustomerInsight[] }>(
    `/vendor/reports/customers/insights?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchRevenueByCategory(vendorId?: string, dateRange?: string): Promise<RevenueByCategory[]> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: RevenueByCategory[] }>(
    `/vendor/reports/revenue/category?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchTopCustomers(limit?: number, vendorId?: string, dateRange?: string): Promise<TopCustomer[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: TopCustomer[] }>(
    `/vendor/reports/customers/top?${params.toString()}`
  );
  return response.data ?? [];
}

export async function fetchFinancialSummary(vendorId?: string, dateRange?: string): Promise<FinancialSummary> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendorId', vendorId);
  if (dateRange) {
    const { startDate, endDate } = getDateRange(dateRange);
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  const response = await apiRequest<{ success: boolean; data: FinancialSummary }>(
    `/vendor/reports/financial/summary?${params.toString()}`
  );
  return response.data;
}

export async function fetchHourlySales(vendorId?: string, date?: string): Promise<HourlySales[]> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendorId', vendorId);
  if (date) params.append('date', date);

  const response = await apiRequest<{ success: boolean; data: HourlySales[] }>(
    `/vendor/reports/sales/hourly?${params.toString()}`
  );
  return response.data ?? [];
}

export async function exportReport(_reportType: string, _format: 'csv' | 'pdf'): Promise<{ url: string }> {
  // Backend export endpoint not yet implemented - throw to avoid returning mock data
  throw new Error('Report export is not yet available. Use the Export All Data button for client-side export.');
}

const STORAGE_KEYS = {
  salesOverview: 'vendorReports_salesOverview',
  salesData: 'vendorReports_salesData',
  productPerformance: 'vendorReports_productPerformance',
  orderAnalytics: 'vendorReports_orderAnalytics',
  customerInsights: 'vendorReports_customerInsights',
  revenueByCategory: 'vendorReports_revenueByCategory',
  topCustomers: 'vendorReports_topCustomers',
  financialSummary: 'vendorReports_financialSummary',
  hourlySales: 'vendorReports_hourlySales',
  dateRange: 'vendorReports_dateRange',
};

export function saveReportsDataToStorage(_key: string, _data: any) {
}

export function loadReportsDataFromStorage<T>(_key: string): T | null {
  return null;
}

export { STORAGE_KEYS };
