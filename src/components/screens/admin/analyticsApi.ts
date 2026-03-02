import { apiRequest } from '@/api/apiClient';
import { API_CONFIG } from '@/config/api';
import { getAuthToken } from '@/contexts/AuthContext';

// --- Type Definitions ---

export interface RealtimeMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  conversionRate: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
}

export interface TimeSeriesData {
  timestamp: string;
  revenue: number;
  orders: number;
  users: number;
  conversionRate: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sku: string;
  category: string;
  totalRevenue: number;
  unitsSold: number;
  averagePrice: number;
  growthRate: number;
  stockLevel: number;
  imageUrl?: string;
}

export interface CategoryAnalytics {
  category: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  percentageOfTotal: number;
  growthRate: number;
}

export interface RegionalPerformance {
  region: string;
  city: string;
  revenue: number;
  orders: number;
  activeUsers: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  averageLifetimeValue: number;
  customerAcquisitionCost: number;
  churnRate: number;
}

export interface OperationalMetrics {
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  cancellationRate: number;
  refundRate: number;
  averageRating: number;
  orderFulfillmentRate: number;
}

export interface RevenueBreakdown {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

export interface GrowthTrend {
  period: string;
  revenue: number;
  orders: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface PeakHourData {
  hour: string;
  orders: number;
  revenue: number;
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface PaymentMethodAnalytics {
  method: string;
  transactions: number;
  revenue: number;
  percentage: number;
}

// --- API Functions (real backend only, no mocks) ---

export async function fetchRealtimeMetrics(range?: string): Promise<RealtimeMetrics> {
  const q = range ? `?range=${range}` : '';
  const response = await apiRequest<{ success: boolean; data: RealtimeMetrics }>(`/admin/analytics/realtime${q}`);
  return response.data ?? { totalRevenue: 0, totalOrders: 0, activeUsers: 0, conversionRate: 0, averageOrderValue: 0, revenueGrowth: 0, ordersGrowth: 0, usersGrowth: 0 };
}

export async function fetchTimeSeriesData(range: string = '24h'): Promise<TimeSeriesData[]> {
  const response = await apiRequest<{ success: boolean; data: TimeSeriesData[] }>(`/admin/analytics/timeseries?range=${range}`);
  return response.data ?? [];
}

export async function fetchProductPerformance(): Promise<ProductPerformance[]> {
  const response = await apiRequest<{ success: boolean; data: ProductPerformance[] }>('/admin/analytics/products');
  return response.data ?? [];
}

export async function fetchCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  const response = await apiRequest<{ success: boolean; data: CategoryAnalytics[] }>('/admin/analytics/categories');
  return response.data ?? [];
}

export async function fetchRegionalPerformance(): Promise<RegionalPerformance[]> {
  const response = await apiRequest<{ success: boolean; data: RegionalPerformance[] }>('/admin/analytics/regional');
  return response.data ?? [];
}

export async function fetchCustomerMetrics(): Promise<CustomerMetrics> {
  const response = await apiRequest<{ success: boolean; data: CustomerMetrics }>('/admin/analytics/customers');
  return response.data ?? { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, customerRetentionRate: 0, averageLifetimeValue: 0, customerAcquisitionCost: 0, churnRate: 0 };
}

export async function fetchOperationalMetrics(): Promise<OperationalMetrics> {
  const response = await apiRequest<{ success: boolean; data: OperationalMetrics }>('/admin/analytics/operational');
  return response.data ?? { averageDeliveryTime: 0, onTimeDeliveryRate: 0, cancellationRate: 0, refundRate: 0, averageRating: 0, orderFulfillmentRate: 0 };
}

export async function fetchRevenueBreakdown(): Promise<RevenueBreakdown[]> {
  const response = await apiRequest<{ success: boolean; data: RevenueBreakdown[] }>('/admin/analytics/revenue');
  return response.data ?? [];
}

export async function fetchGrowthTrends(): Promise<GrowthTrend[]> {
  const response = await apiRequest<{ success: boolean; data: GrowthTrend[] }>('/admin/analytics/growth');
  return response.data ?? [];
}

export async function fetchPeakHours(): Promise<PeakHourData[]> {
  const response = await apiRequest<{ success: boolean; data: PeakHourData[] }>('/admin/analytics/peak-hours');
  return response.data ?? [];
}

export async function fetchConversionFunnel(): Promise<ConversionFunnel[]> {
  const response = await apiRequest<{ success: boolean; data: ConversionFunnel[] }>('/admin/analytics/funnel');
  return response.data ?? [];
}

export async function fetchPaymentMethods(): Promise<PaymentMethodAnalytics[]> {
  const response = await apiRequest<{ success: boolean; data: PaymentMethodAnalytics[] }>('/admin/analytics/payment-methods');
  return response.data ?? [];
}

// Template reports
export async function fetchOrdersByHour(range: string = '7d'): Promise<PeakHourData[]> {
  const response = await apiRequest<{ success: boolean; data: PeakHourData[] }>(`/admin/analytics/orders-by-hour?range=${range}`);
  return response.data ?? [];
}

export interface RiderPerformanceItem {
  riderId: string;
  name: string;
  deliveries: number;
  avgDeliveryTime: number;
  rating: number;
}

export async function fetchRiderPerformance(): Promise<RiderPerformanceItem[]> {
  const response = await apiRequest<{ success: boolean; data: RiderPerformanceItem[] }>('/admin/analytics/rider-performance');
  return response.data ?? [];
}

export interface InventoryHealthItem {
  sku: string;
  name: string;
  stockLevel: number;
  lowStockThreshold: number;
  status: 'ok' | 'low';
}

export async function fetchInventoryHealth(): Promise<InventoryHealthItem[]> {
  const response = await apiRequest<{ success: boolean; data: InventoryHealthItem[] }>('/admin/analytics/inventory-health');
  return response.data ?? [];
}

export interface FinancialSummary {
  totalRevenue: number;
  totalOrders: number;
  totalDiscount: number;
  totalDeliveryFee: number;
  averageOrderValue: number;
}

export async function fetchFinancialSummary(range: string = '30d'): Promise<FinancialSummary> {
  const response = await apiRequest<{ success: boolean; data: FinancialSummary }>(`/admin/analytics/financial-summary?range=${range}`);
  return response.data ?? { totalRevenue: 0, totalOrders: 0, totalDiscount: 0, totalDeliveryFee: 0, averageOrderValue: 0 };
}

// Custom report builder
export interface CustomReportParams {
  dimensions: string[];
  metrics: string[];
  filters?: Record<string, unknown>;
  dateFrom?: string;
  dateTo?: string;
}

export async function createCustomReport(params: CustomReportParams): Promise<unknown[]> {
  const response = await apiRequest<{ success: boolean; data: unknown[] }>('/admin/analytics/custom-report', {
    method: 'POST',
    body: JSON.stringify(params),
  } as RequestInit);
  return response?.data ?? [];
}

// Export
export type ExportFormat = 'csv' | 'json' | 'xlsx';

export async function exportAnalyticsReport(format: ExportFormat, range: string, report: string = 'overview'): Promise<Blob> {
  const token = getAuthToken();
  const url = `${API_CONFIG.baseURL}/admin/analytics/export?format=${format}&range=${range}&report=${report}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
