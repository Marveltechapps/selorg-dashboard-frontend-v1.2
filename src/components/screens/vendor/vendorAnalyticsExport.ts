import { exportToCSV, exportToCSVForExcel } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import {
  fetchSalesOverview,
  fetchSalesData,
  fetchProductPerformance,
  fetchOrderAnalytics,
  fetchCustomerInsights,
  fetchRevenueByCategory,
  fetchTopCustomers,
  fetchFinancialSummary,
  fetchHourlySales,
  type SalesOverview,
  type SalesData,
  type ProductPerformance,
  type OrderAnalytics,
  type CustomerInsight,
  type RevenueByCategory,
  type TopCustomer,
  type FinancialSummary,
  type HourlySales,
} from './reportsApi';

export type VendorAnalyticsExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export type VendorAnalyticsExportScope =
  | 'overview'
  | 'revenue_trend'
  | 'hourly'
  | 'products'
  | 'orders'
  | 'customer_insights'
  | 'revenue_category'
  | 'top_customers'
  | 'financial';

export const VENDOR_ANALYTICS_EXPORT_SCOPES: {
  id: VendorAnalyticsExportScope;
  label: string;
  tab?: string;
}[] = [
  { id: 'overview', label: 'Sales overview (KPIs)', tab: 'overview' },
  { id: 'revenue_trend', label: 'Revenue trend', tab: 'overview' },
  { id: 'hourly', label: 'Hourly sales pattern', tab: 'overview' },
  { id: 'products', label: 'Product performance', tab: 'products' },
  { id: 'orders', label: 'Order analytics', tab: 'orders' },
  { id: 'customer_insights', label: 'Customer insights', tab: 'customers' },
  { id: 'revenue_category', label: 'Revenue by category', tab: 'customers' },
  { id: 'top_customers', label: 'Top customers', tab: 'customers' },
  { id: 'financial', label: 'Financial summary', tab: 'financial' },
];

export interface VendorAnalyticsExportOptions {
  dateRange: string;
  format: VendorAnalyticsExportFormat;
  scopes: VendorAnalyticsExportScope[];
  vendorId?: string;
  productSortBy?: 'revenue' | 'units' | 'growth';
  topCustomersLimit?: number;
  salesGroupBy?: 'day' | 'week' | 'month';
}

export interface VendorAnalyticsExportBundle {
  salesOverview: SalesOverview | null;
  salesData: SalesData[];
  productPerformance: ProductPerformance[];
  orderAnalytics: OrderAnalytics[];
  customerInsights: CustomerInsight[];
  revenueByCategory: RevenueByCategory[];
  topCustomers: TopCustomer[];
  financialSummary: FinancialSummary | null;
  hourlySales: HourlySales[];
}

const DATE_RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  quarter: 'Last 90 Days',
};

export function dateRangeLabel(dateRange: string): string {
  return DATE_RANGE_LABELS[dateRange] ?? dateRange;
}

export function scopesForTab(tab: string): VendorAnalyticsExportScope[] {
  return VENDOR_ANALYTICS_EXPORT_SCOPES.filter((s) => s.tab === tab).map((s) => s.id);
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function sortProducts(products: ProductPerformance[], sortBy: 'revenue' | 'units' | 'growth') {
  return [...products].sort((a, b) => {
    if (sortBy === 'units') return b.unitsSold - a.unitsSold;
    if (sortBy === 'growth') return b.growthRate - a.growthRate;
    return b.revenue - a.revenue;
  });
}

export async function fetchVendorAnalyticsExportBundle(
  options: Pick<
    VendorAnalyticsExportOptions,
    'dateRange' | 'vendorId' | 'productSortBy' | 'topCustomersLimit' | 'salesGroupBy' | 'scopes'
  >
): Promise<VendorAnalyticsExportBundle> {
  const { dateRange, vendorId, scopes } = options;
  const productSortBy = options.productSortBy ?? 'revenue';
  const topLimit = options.topCustomersLimit ?? 10;
  const groupBy = options.salesGroupBy ?? 'day';
  const apiProductSort = productSortBy === 'units' ? 'units' : 'revenue';
  const need = (s: VendorAnalyticsExportScope) => scopes.includes(s);

  const [
    salesOverview,
    salesData,
    productsRaw,
    orderAnalytics,
    customerInsights,
    revenueByCategory,
    topCustomers,
    financialSummary,
    hourlySales,
  ] = await Promise.all([
    need('overview') ? fetchSalesOverview(dateRange, vendorId) : Promise.resolve(null),
    need('revenue_trend') ? fetchSalesData(dateRange, vendorId, groupBy) : Promise.resolve([]),
    need('products') ? fetchProductPerformance(apiProductSort, vendorId, dateRange) : Promise.resolve([]),
    need('orders') ? fetchOrderAnalytics(vendorId, dateRange) : Promise.resolve([]),
    need('customer_insights') ? fetchCustomerInsights(vendorId, dateRange) : Promise.resolve([]),
    need('revenue_category') ? fetchRevenueByCategory(vendorId, dateRange) : Promise.resolve([]),
    need('top_customers') ? fetchTopCustomers(topLimit, vendorId, dateRange) : Promise.resolve([]),
    need('financial') ? fetchFinancialSummary(vendorId, dateRange) : Promise.resolve(null),
    need('hourly') ? fetchHourlySales(vendorId) : Promise.resolve([]),
  ]);

  const productPerformance =
    need('products') && productSortBy === 'growth' ? sortProducts(productsRaw, 'growth') : productsRaw;

  return {
    salesOverview,
    salesData: salesData ?? [],
    productPerformance,
    orderAnalytics: orderAnalytics ?? [],
    customerInsights: customerInsights ?? [],
    revenueByCategory: revenueByCategory ?? [],
    topCustomers: topCustomers ?? [],
    financialSummary,
    hourlySales: hourlySales ?? [],
  };
}

function buildMetaRows(options: VendorAnalyticsExportOptions): (string | number)[][] {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  return [
    ['Vendor Reports & Analytics Export'],
    ['Generated', `${today} ${time}`],
    ['Date range', dateRangeLabel(options.dateRange)],
    ['Vendor filter', options.vendorId ?? 'All vendors (hub)'],
    ['Sections', options.scopes.join(', ')],
    ['Format', options.format.toUpperCase()],
    [],
  ];
}

export function buildVendorAnalyticsCsv(
  bundle: VendorAnalyticsExportBundle,
  options: VendorAnalyticsExportOptions
): (string | number)[][] {
  const rows: (string | number)[][] = [...buildMetaRows(options)];

  if (options.scopes.includes('overview') && bundle.salesOverview) {
    const o = bundle.salesOverview;
    rows.push(['=== SALES OVERVIEW ===']);
    rows.push(['Total Revenue', formatCurrency(o.totalRevenue)]);
    rows.push(['Revenue Growth', formatPercentage(o.revenueGrowth)]);
    rows.push(['Total Orders', o.totalOrders]);
    rows.push(['Orders Growth', formatPercentage(o.ordersGrowth)]);
    rows.push(['Avg Order Value', formatCurrency(o.avgOrderValue)]);
    rows.push(['Avg Order Growth', formatPercentage(o.avgOrderGrowth)]);
    rows.push(['Total Products', o.totalProducts]);
    rows.push(['Products Growth', formatPercentage(o.productsGrowth)]);
    rows.push([]);
  }

  if (options.scopes.includes('revenue_trend')) {
    rows.push(['=== REVENUE TREND ===']);
    rows.push(['Date', 'Revenue', 'Orders', 'Customers']);
    bundle.salesData.forEach((d) => {
      rows.push([new Date(d.date).toLocaleDateString('en-IN'), d.revenue, d.orders, d.customers]);
    });
    rows.push([]);
  }

  if (options.scopes.includes('hourly')) {
    rows.push(['=== HOURLY SALES ===']);
    rows.push(['Hour', 'Orders', 'Revenue']);
    bundle.hourlySales.forEach((h) => rows.push([h.hour, h.orders, h.revenue]));
    rows.push([]);
  }

  if (options.scopes.includes('products')) {
    rows.push(['=== PRODUCT PERFORMANCE ===']);
    rows.push(['ID', 'Name', 'Category', 'Units Sold', 'Revenue', 'Stock', 'Trend', 'Growth %']);
    bundle.productPerformance.forEach((p) => {
      rows.push([p.id, p.name, p.category, p.unitsSold, p.revenue, p.stock, p.trend, formatPercentage(p.growthRate)]);
    });
    rows.push([]);
  }

  if (options.scopes.includes('orders')) {
    rows.push(['=== ORDER ANALYTICS ===']);
    rows.push(['Status', 'Count', 'Percentage']);
    bundle.orderAnalytics.forEach((o) => rows.push([o.status, o.count, `${o.percentage.toFixed(1)}%`]));
    rows.push([]);
  }

  if (options.scopes.includes('customer_insights')) {
    rows.push(['=== CUSTOMER INSIGHTS ===']);
    rows.push(['Metric', 'Value', 'Change', 'Trend']);
    bundle.customerInsights.forEach((c) => {
      rows.push([c.metric, c.metric.toLowerCase().includes('rate') ? c.value.toFixed(1) : c.value, formatPercentage(c.change), c.trend]);
    });
    rows.push([]);
  }

  if (options.scopes.includes('revenue_category')) {
    rows.push(['=== REVENUE BY CATEGORY ===']);
    rows.push(['Category', 'Revenue', 'Percentage']);
    bundle.revenueByCategory.forEach((r) => rows.push([r.category, r.revenue, `${r.percentage.toFixed(1)}%`]));
    rows.push([]);
  }

  if (options.scopes.includes('top_customers')) {
    rows.push(['=== TOP CUSTOMERS ===']);
    rows.push(['ID', 'Name', 'Email', 'Orders', 'Total Spent', 'Avg Order Value']);
    bundle.topCustomers.forEach((t) => rows.push([t.id, t.name, t.email, t.orders, t.totalSpent, t.avgOrderValue]));
    rows.push([]);
  }

  if (options.scopes.includes('financial') && bundle.financialSummary) {
    const f = bundle.financialSummary;
    rows.push(['=== FINANCIAL SUMMARY ===']);
    rows.push(['Gross Revenue', formatCurrency(f.grossRevenue)]);
    rows.push(['Platform Fee', formatCurrency(f.platformFee)]);
    rows.push(['Delivery Charges', formatCurrency(f.deliveryCharges)]);
    rows.push(['Refunds', formatCurrency(f.refunds)]);
    rows.push(['Net Revenue', formatCurrency(f.netRevenue)]);
    rows.push(['Profit Margin', `${f.profitMargin.toFixed(1)}%`]);
    rows.push([]);
  }

  return rows;
}

function buildPdfSection(title: string, headers: string[], rows: (string | number)[][]): string {
  if (!rows.length) return `<h2>${title}</h2><p>No data for selected filters.</p>`;
  return `<h2>${title}</h2><table><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join('')}</tr>`).join('')}</table>`;
}

export function buildVendorAnalyticsPdfHtml(bundle: VendorAnalyticsExportBundle, options: VendorAnalyticsExportOptions): string {
  const sections: string[] = [];
  if (options.scopes.includes('overview') && bundle.salesOverview) {
    const o = bundle.salesOverview;
    sections.push(buildPdfSection('Sales Overview', ['Metric', 'Value'], [
      ['Total Revenue', formatCurrency(o.totalRevenue)], ['Revenue Growth', formatPercentage(o.revenueGrowth)],
      ['Total Orders', o.totalOrders], ['Avg Order Value', formatCurrency(o.avgOrderValue)],
    ]));
  }
  if (options.scopes.includes('revenue_trend')) {
    sections.push(buildPdfSection('Revenue Trend', ['Date', 'Revenue', 'Orders', 'Customers'],
      bundle.salesData.map((d) => [new Date(d.date).toLocaleDateString('en-IN'), formatCurrency(d.revenue), d.orders, d.customers])));
  }
  if (options.scopes.includes('products')) {
    sections.push(buildPdfSection('Product Performance', ['Product', 'Category', 'Units', 'Revenue', 'Stock', 'Growth'],
      bundle.productPerformance.map((p) => [p.name, p.category, p.unitsSold, formatCurrency(p.revenue), p.stock, formatPercentage(p.growthRate)])));
  }
  if (options.scopes.includes('orders')) {
    sections.push(buildPdfSection('Order Analytics', ['Status', 'Count', '%'],
      bundle.orderAnalytics.map((o) => [o.status, o.count, `${o.percentage.toFixed(1)}%`])));
  }
  if (options.scopes.includes('customer_insights')) {
    sections.push(buildPdfSection('Customer Insights', ['Metric', 'Value', 'Change'],
      bundle.customerInsights.map((c) => [c.metric, c.value, formatPercentage(c.change)])));
  }
  if (options.scopes.includes('revenue_category')) {
    sections.push(buildPdfSection('Revenue by Category', ['Category', 'Revenue', '%'],
      bundle.revenueByCategory.map((r) => [r.category, formatCurrency(r.revenue), `${r.percentage.toFixed(1)}%`])));
  }
  if (options.scopes.includes('top_customers')) {
    sections.push(buildPdfSection('Top Customers', ['Name', 'Email', 'Orders', 'Total Spent'],
      bundle.topCustomers.map((t) => [t.name, t.email, t.orders, formatCurrency(t.totalSpent)])));
  }
  if (options.scopes.includes('financial') && bundle.financialSummary) {
    const f = bundle.financialSummary;
    sections.push(buildPdfSection('Financial Summary', ['Metric', 'Value'], [
      ['Gross Revenue', formatCurrency(f.grossRevenue)], ['Net Revenue', formatCurrency(f.netRevenue)],
      ['Profit Margin', `${f.profitMargin.toFixed(1)}%`],
    ]));
  }
  if (options.scopes.includes('hourly')) {
    sections.push(buildPdfSection('Hourly Sales', ['Hour', 'Orders', 'Revenue'],
      bundle.hourlySales.map((h) => [h.hour, h.orders, formatCurrency(h.revenue)])));
  }
  return `<html><head><title>Vendor Analytics Export</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#1f2937}h1{color:#4F46E5}h2{color:#374151;margin-top:24px;font-size:16px}table{width:100%;border-collapse:collapse;margin:12px 0 24px;font-size:12px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#4F46E5;color:white}tr:nth-child(even){background:#f9fafb}.meta{font-size:13px;color:#6b7280;margin-bottom:20px}</style></head><body><h1>Vendor Reports & Analytics</h1><div class="meta"><p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p><p><strong>Date range:</strong> ${dateRangeLabel(options.dateRange)}</p><p><strong>Vendor:</strong> ${options.vendorId ?? 'All (hub scope)'}</p></div>${sections.join('') || '<p>No sections selected.</p>'}</body></html>`;
}

export function buildVendorAnalyticsJson(bundle: VendorAnalyticsExportBundle, options: VendorAnalyticsExportOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    meta: { generatedAt: new Date().toISOString(), dateRange: options.dateRange, dateRangeLabel: dateRangeLabel(options.dateRange), vendorId: options.vendorId ?? null, scopes: options.scopes, productSortBy: options.productSortBy, topCustomersLimit: options.topCustomersLimit, salesGroupBy: options.salesGroupBy },
  };
  if (options.scopes.includes('overview')) payload.salesOverview = bundle.salesOverview;
  if (options.scopes.includes('revenue_trend')) payload.salesData = bundle.salesData;
  if (options.scopes.includes('hourly')) payload.hourlySales = bundle.hourlySales;
  if (options.scopes.includes('products')) payload.productPerformance = bundle.productPerformance;
  if (options.scopes.includes('orders')) payload.orderAnalytics = bundle.orderAnalytics;
  if (options.scopes.includes('customer_insights')) payload.customerInsights = bundle.customerInsights;
  if (options.scopes.includes('revenue_category')) payload.revenueByCategory = bundle.revenueByCategory;
  if (options.scopes.includes('top_customers')) payload.topCustomers = bundle.topCustomers;
  if (options.scopes.includes('financial')) payload.financialSummary = bundle.financialSummary;
  return payload;
}

function downloadJson(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function runVendorAnalyticsExport(options: VendorAnalyticsExportOptions): Promise<void> {
  const bundle = await fetchVendorAnalyticsExportBundle(options);
  const today = new Date().toISOString().split('T')[0];
  const scopeSlug = options.scopes.length <= 2 ? options.scopes.join('-') : 'multi';
  const baseName = `vendor-analytics-${scopeSlug}-${today}`;
  if (options.format === 'json') {
    downloadJson(buildVendorAnalyticsJson(bundle, options), baseName);
    return;
  }
  if (options.format === 'pdf') {
    exportToPDF(buildVendorAnalyticsPdfHtml(bundle, options), baseName);
    return;
  }
  const csvRows = buildVendorAnalyticsCsv(bundle, options);
  if (options.format === 'excel') exportToCSVForExcel(csvRows, baseName);
  else exportToCSV(csvRows, baseName);
}
