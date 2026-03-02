import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  STORAGE_KEYS,
  SalesOverview,
  SalesData,
  ProductPerformance,
  OrderAnalytics,
  CustomerInsight,
  RevenueByCategory,
  TopCustomer,
  FinancialSummary,
  HourlySales,
} from './reportsApi';
import { toast } from 'sonner';
import { exportToCSV } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  IndianRupee,
  Download,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Star,
  Percent,
} from 'lucide-react';

export function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  
  // Product performance filter state
  const [productSortBy, setProductSortBy] = useState<string>('revenue');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overview,
        sales,
        products,
        orders,
        customers,
        categories,
        topCust,
        financial,
        hourly,
      ] = await Promise.all([
        fetchSalesOverview(dateRange),
        fetchSalesData(dateRange),
        fetchProductPerformance('revenue', undefined, dateRange),
        fetchOrderAnalytics(undefined, dateRange),
        fetchCustomerInsights(undefined, dateRange),
        fetchRevenueByCategory(undefined, dateRange),
        fetchTopCustomers(5, undefined, dateRange),
        fetchFinancialSummary(undefined, dateRange),
        fetchHourlySales(),
      ]);

      // Update state with real API data
      setSalesOverview(overview);
      setSalesData(sales ?? []);
      setProductPerformance(products ?? []);
      setOrderAnalytics(orders ?? []);
      setCustomerInsights(customers ?? []);
      setRevenueByCategory(categories ?? []);
      setTopCustomers(topCust ?? []);
      setFinancialSummary(financial);
      setHourlySales(hourly ?? []);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      const message = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(message);
      toast.error(message);
      // Clear all state on API error - show genuine empty/error state, no mock data
      setSalesOverview(null);
      setSalesData([]);
      setProductPerformance([]);
      setOrderAnalytics([]);
      setCustomerInsights([]);
      setRevenueByCategory([]);
      setTopCustomers([]);
      setFinancialSummary(null);
      setHourlySales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType: string, format: 'csv' | 'pdf') => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      if (format === 'csv') {
        const csvData: (string | number)[][] = [
          ['Vendor Reports & Analytics', `Date: ${today}`, `Time: ${timestamp}`],
          ['Date Range', dateRange],
          [''],
          
          // Sales Overview
          ['=== SALES OVERVIEW ==='],
          salesOverview ? [
            ['Total Revenue', formatCurrency(salesOverview.totalRevenue)],
            ['Revenue Growth', `${formatPercentage(salesOverview.revenueGrowth)}`],
            ['Total Orders', salesOverview.totalOrders],
            ['Orders Growth', `${formatPercentage(salesOverview.ordersGrowth)}`],
            ['Avg Order Value', formatCurrency(salesOverview.avgOrderValue)],
            ['Avg Order Growth', `${formatPercentage(salesOverview.avgOrderGrowth)}`],
            ['Total Products', salesOverview.totalProducts],
            ['Products Growth', `${formatPercentage(salesOverview.productsGrowth)}`],
          ] : [['No sales overview data']],
          [''],
          
          // Sales Data (Revenue Trend)
          ['=== REVENUE TREND ==='],
          ['Date', 'Revenue', 'Orders', 'Customers'],
          ...salesData.map(d => [
            new Date(d.date).toLocaleDateString('en-US'),
            d.revenue,
            d.orders,
            d.customers,
          ]),
          [''],
          
          // Product Performance
          ['=== PRODUCT PERFORMANCE ==='],
          ['Product ID', 'Product Name', 'Category', 'Units Sold', 'Revenue', 'Stock', 'Growth Rate'],
          ...productPerformance.map(p => [
            p.id,
            p.name,
            p.category,
            p.unitsSold,
            p.revenue,
            p.stock,
            `${formatPercentage(p.growthRate)}`,
          ]),
          [''],
          
          // Order Analytics
          ['=== ORDER ANALYTICS ==='],
          ['Status', 'Count', 'Percentage'],
          ...orderAnalytics.map(o => [
            o.status,
            o.count,
            `${o.percentage.toFixed(1)}%`,
          ]),
          [''],
          
          // Customer Insights
          ['=== CUSTOMER INSIGHTS ==='],
          ['Metric', 'Value', 'Change'],
          ...customerInsights.map(c => [
            c.metric,
            c.metric.includes('Rate') || c.metric.includes('Avg') ? c.value.toFixed(1) : c.value,
            `${formatPercentage(c.change)}`,
          ]),
          [''],
          
          // Revenue by Category
          ['=== REVENUE BY CATEGORY ==='],
          ['Category', 'Revenue', 'Percentage'],
          ...revenueByCategory.map(r => [
            r.category,
            r.revenue,
            `${r.percentage.toFixed(1)}%`,
          ]),
          [''],
          
          // Top Customers
          ['=== TOP CUSTOMERS ==='],
          ['Customer ID', 'Name', 'Email', 'Orders', 'Total Spent', 'Avg Order Value'],
          ...topCustomers.map(t => [
            t.id,
            t.name,
            t.email,
            t.orders,
            t.totalSpent,
            t.avgOrderValue,
          ]),
          [''],
          
          // Financial Summary
          ['=== FINANCIAL SUMMARY ==='],
          financialSummary ? [
            ['Gross Revenue', formatCurrency(financialSummary.grossRevenue)],
            ['Platform Fee', formatCurrency(financialSummary.platformFee)],
            ['Delivery Charges', formatCurrency(financialSummary.deliveryCharges)],
            ['Refunds', formatCurrency(financialSummary.refunds)],
            ['Net Revenue', formatCurrency(financialSummary.netRevenue)],
            ['Profit Margin', `${financialSummary.profitMargin.toFixed(1)}%`],
          ] : [['No financial summary data']],
          [''],
          
          // Hourly Sales
          ['=== HOURLY SALES PATTERN ==='],
          ['Hour', 'Orders', 'Revenue'],
          ...hourlySales.map(h => [
            h.hour,
            h.orders,
            h.revenue,
          ]),
        ];
        exportToCSV(csvData, `vendor-reports-complete-${today}-${timestamp.replace(/:/g, '-')}`);
      } else {
        const htmlContent = `
          <html>
            <head>
              <title>Vendor Reports & Analytics</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #4F46E5; }
                h2 { color: #1F2937; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4F46E5; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <h1>Vendor Reports & Analytics</h1>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Date Range:</strong> ${dateRange}</p>
              
              <h2>Sales Overview</h2>
              ${salesOverview ? `
                <table>
                  <tr><th>Metric</th><th>Value</th></tr>
                  <tr><td>Total Revenue</td><td>${formatCurrency(salesOverview.totalRevenue)}</td></tr>
                  <tr><td>Revenue Growth</td><td>${formatPercentage(salesOverview.revenueGrowth)}</td></tr>
                  <tr><td>Total Orders</td><td>${salesOverview.totalOrders}</td></tr>
                  <tr><td>Orders Growth</td><td>${formatPercentage(salesOverview.ordersGrowth)}</td></tr>
                  <tr><td>Avg Order Value</td><td>${formatCurrency(salesOverview.avgOrderValue)}</td></tr>
                  <tr><td>Total Products</td><td>${salesOverview.totalProducts}</td></tr>
                </table>
              ` : '<p>No sales overview data</p>'}
              
              <h2>Product Performance</h2>
              <table>
                <tr>
                  <th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Stock</th><th>Growth</th>
                </tr>
                ${productPerformance.map(p => `
                  <tr>
                    <td>${p.name}</td><td>${p.category}</td><td>${p.unitsSold}</td>
                    <td>${formatCurrency(p.revenue)}</td><td>${p.stock}</td><td>${formatPercentage(p.growthRate)}</td>
                  </tr>
                `).join('')}
              </table>
              
              <h2>Order Analytics</h2>
              <table>
                <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
                ${orderAnalytics.map(o => `
                  <tr><td>${o.status}</td><td>${o.count}</td><td>${o.percentage.toFixed(1)}%</td></tr>
                `).join('')}
              </table>
              
              <h2>Top Customers</h2>
              <table>
                <tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Avg Order</th></tr>
                ${topCustomers.map(t => `
                  <tr>
                    <td>${t.name}</td><td>${t.email}</td><td>${t.orders}</td>
                    <td>${formatCurrency(t.totalSpent)}</td><td>${formatCurrency(t.avgOrderValue)}</td>
                  </tr>
                `).join('')}
              </table>
              
              ${financialSummary ? `
                <h2>Financial Summary</h2>
                <table>
                  <tr><th>Metric</th><th>Value</th></tr>
                  <tr><td>Gross Revenue</td><td>${formatCurrency(financialSummary.grossRevenue)}</td></tr>
                  <tr><td>Platform Fee</td><td>${formatCurrency(financialSummary.platformFee)}</td></tr>
                  <tr><td>Net Revenue</td><td>${formatCurrency(financialSummary.netRevenue)}</td></tr>
                  <tr><td>Profit Margin</td><td>${financialSummary.profitMargin.toFixed(1)}%</td></tr>
                </table>
              ` : ''}
            </body>
          </html>
        `;
        exportToPDF(htmlContent, `vendor-reports-complete-${today}`);
      }
      toast.success(`Complete report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <ArrowUpRight size={14} className="text-emerald-600" />;
    if (trend === 'down') return <ArrowDownRight size={14} className="text-rose-600" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Filter and sort product performance
  const filteredProductPerformance = useMemo(() => {
    if (!productPerformance.length) return [];
    
    const sorted = [...productPerformance].sort((a, b) => {
      switch (productSortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'units':
          return b.unitsSold - a.unitsSold;
        case 'growth':
          return b.growthRate - a.growthRate;
        default:
          return 0;
      }
    });
    return sorted;
  }, [productPerformance, productSortBy]);

  // Calculate dynamic max values for charts - optimize to fill space better
  const maxRevenue = useMemo(() => {
    if (!salesData.length) return 10000;
    const max = Math.max(...salesData.map(d => d.revenue));
    const min = Math.min(...salesData.map(d => d.revenue));
    // Use max with minimal padding (2-3%) to maximize bar heights and reduce white space
    // If data range is small, use a smaller multiplier to fill more space
    const range = max - min;
    const padding = range > max * 0.5 ? 1.03 : 1.05; // Less padding if data is spread out
    return max * padding;
  }, [salesData]);

  const maxOrders = useMemo(() => {
    if (!salesData.length) return 50;
    const max = Math.max(...salesData.map(d => d.orders));
    const min = Math.min(...salesData.map(d => d.orders));
    // Use max with minimal padding (2-3%) to maximize bar heights
    const range = max - min;
    const padding = range > max * 0.5 ? 1.03 : 1.05; // Less padding if data is spread out
    return max * padding;
  }, [salesData]);

  const maxHourlyOrders = useMemo(() => {
    if (!hourlySales.length) return 50;
    const hourlySlice = hourlySales.slice(6, 24);
    if (!hourlySlice.length) return 50;
    const max = Math.max(...hourlySlice.map(h => h.orders));
    const min = Math.min(...hourlySlice.map(h => h.orders));
    // Use max with minimal padding (2-3%) to maximize bar heights
    const range = max - min;
    const padding = range > max * 0.5 ? 1.03 : 1.05; // Less padding if data is spread out
    return max * padding;
  }, [hourlySales]);

  const { peakHour, slowestHour } = useMemo(() => {
    if (!hourlySales.length) return { peakHour: null, slowestHour: null };
    const withOrders = hourlySales.filter(h => h.orders > 0);
    if (!withOrders.length) return { peakHour: null, slowestHour: null };
    const peak = withOrders.reduce((a, b) => (a.orders >= b.orders ? a : b), withOrders[0]);
    const slow = withOrders.reduce((a, b) => (a.orders <= b.orders ? a : b), withOrders[0]);
    return { peakHour: peak, slowestHour: slow };
  }, [hourlySales]);

  const { orderSuccessRate, totalProcessed } = useMemo(() => {
    if (!orderAnalytics.length) return { orderSuccessRate: null, totalProcessed: 0 };
    const total = orderAnalytics.reduce((sum, o) => sum + o.count, 0);
    const completed = orderAnalytics.find(o =>
      o.status?.toUpperCase() === 'COMPLETED' || o.status === 'Completed'
    );
    const successRate = completed && total > 0 ? (completed.count / total) * 100 : null;
    return { orderSuccessRate: successRate, totalProcessed: total };
  }, [orderAnalytics]);

  if (loading && !salesOverview && !error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error && !salesOverview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Track your sales performance and business metrics</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <p className="text-rose-600 font-medium mb-2">Failed to load reports</p>
          <p className="text-gray-500 text-sm text-center mb-4">{error}</p>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Track your sales performance and business metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value) => {
            setDateRange(value);
            // loadData will be called automatically via useEffect when dateRange changes
          }}>
            <SelectTrigger className="w-40 bg-white border-gray-200 text-gray-900">
              <Calendar size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.preventDefault();
              loadData();
            }} 
            variant="outline" 
            className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => handleExport('complete', 'csv')} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
            <Download size={14} className="mr-1.5" /> Export All Data
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {salesOverview && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <IndianRupee className="text-emerald-600" size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(salesOverview.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {salesOverview.revenueGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  ) : (
                    <ArrowDownRight size={14} className="text-rose-600" />
                  )}
                  <span className={`text-xs font-medium ${salesOverview.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercentage(salesOverview.revenueGrowth)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Total Orders</p>
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingCart className="text-blue-600" size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{salesOverview.totalOrders.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {salesOverview.ordersGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  ) : (
                    <ArrowDownRight size={14} className="text-rose-600" />
                  )}
                  <span className={`text-xs font-medium ${salesOverview.ordersGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercentage(salesOverview.ordersGrowth)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Avg Order Value</p>
              <div className="p-2 bg-purple-50 rounded-lg">
                <BarChart3 className="text-purple-600" size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(salesOverview.avgOrderValue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {salesOverview.avgOrderGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  ) : (
                    <ArrowDownRight size={14} className="text-rose-600" />
                  )}
                  <span className={`text-xs font-medium ${salesOverview.avgOrderGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercentage(salesOverview.avgOrderGrowth)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Active Products</p>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Package className="text-amber-600" size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{salesOverview.totalProducts}</p>
                <div className="flex items-center gap-1 mt-1">
                  {salesOverview.productsGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  ) : (
                    <ArrowDownRight size={14} className="text-rose-600" />
                  )}
                  <span className={`text-xs font-medium ${salesOverview.productsGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercentage(salesOverview.productsGrowth)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-gray-200 bg-transparent rounded-none h-auto p-0">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4F46E5] rounded-none text-gray-500 data-[state=active]:text-[#4F46E5]">
            <BarChart3 size={14} className="mr-1.5" /> Sales Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4F46E5] rounded-none text-gray-500 data-[state=active]:text-[#4F46E5]">
            <Package size={14} className="mr-1.5" /> Product Performance
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4F46E5] rounded-none text-gray-500 data-[state=active]:text-[#4F46E5]">
            <ShoppingCart size={14} className="mr-1.5" /> Order Analytics
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4F46E5] rounded-none text-gray-500 data-[state=active]:text-[#4F46E5]">
            <Users size={14} className="mr-1.5" /> Customer Insights
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4F46E5] rounded-none text-gray-500 data-[state=active]:text-[#4F46E5]">
            <IndianRupee size={14} className="mr-1.5" /> Financial Report
          </TabsTrigger>
        </TabsList>

        {/* Sales Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900">Revenue Trend</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50">Revenue</Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">Orders</Badge>
              </div>
            </div>
            <div className="h-64 flex items-end gap-2">
              {salesData.length > 0 ? salesData.map((day, idx) => {
                const revenueHeight = maxRevenue > 0 ? Math.max((day.revenue / maxRevenue) * 100, 5) : 5; // Minimum 5% height
                const ordersHeight = maxOrders > 0 ? Math.max((day.orders / maxOrders) * 100, 5) : 5; // Minimum 5% height
                return (
                  <div key={idx} className="flex-1 flex flex-col gap-2">
                    <div className="relative flex-1 bg-gray-100 rounded-t min-h-[20px]">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all"
                        style={{ height: `${revenueHeight}%` }}
                      ></div>
                    </div>
                    <div className="relative flex-1 bg-gray-100 rounded-t min-h-[20px]">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all"
                        style={{ height: `${ordersHeight}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-gray-500 text-center mt-1">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                );
              }) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p>No revenue trend data available</p>
                </div>
              )}
            </div>
            {salesData.length > 0 && (() => {
              const peakDay = salesData.reduce((a, b) => (a.revenue >= b.revenue ? a : b), salesData[0]);
              return (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Peak Day</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(peakDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-emerald-600">{formatCurrency(peakDay.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Avg Daily Revenue</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(Math.round(salesData.reduce((sum, d) => sum + d.revenue, 0) / salesData.length))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Customers</p>
                  <p className="text-sm font-bold text-gray-900">
                    {salesData.reduce((sum, d) => sum + d.customers, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              );
            })()}
          </div>

          {/* Revenue by Category & Hourly Sales */}
          <div className="grid grid-cols-2 gap-6">
            {/* Revenue by Category */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Revenue by Category</h3>
              <div className="space-y-4">
                {revenueByCategory.length > 0 ? revenueByCategory.map((category, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                        <span className="text-sm text-gray-900">{category.category}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(category.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{category.percentage.toFixed(1)}% of total revenue</p>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No category data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Sales Pattern */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Hourly Sales Pattern</h3>
              <div className="h-64 flex items-end gap-1">
                {hourlySales.length > 0 ? hourlySales.slice(6, 24).map((hour, idx) => {
                  const hourHeight = maxHourlyOrders > 0 ? Math.max((hour.orders / maxHourlyOrders) * 100, 3) : 3; // Minimum 3% height
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                      <div className="flex-1 w-full bg-gray-100 rounded-t relative overflow-hidden min-h-[15px]">
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t group-hover:from-purple-400 group-hover:to-purple-300 transition-all"
                          style={{ height: `${hourHeight}%` }}
                        ></div>
                      </div>
                      <p className="text-[8px] text-gray-500 mt-1">{hour.hour.split(':')[0]}</p>
                      <div className="absolute -top-8 bg-white border border-gray-200 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm z-10">
                        <p className="text-xs text-gray-900 font-bold">{hour.orders} orders</p>
                        <p className="text-[10px] text-gray-500">{formatCurrency(hour.revenue)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <p>No hourly data available</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Peak Hour</p>
                    <p className="text-sm font-bold text-gray-900">
                      {peakHour ? `${peakHour.hour} - ${String(parseInt(peakHour.hour, 10) + 1).padStart(2, '0')}:00` : '—'}
                    </p>
                    <p className="text-xs text-purple-600">{peakHour ? `${peakHour.orders} orders` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Slowest Hour</p>
                    <p className="text-sm font-bold text-gray-900">
                      {slowestHour ? `${slowestHour.hour} - ${String(parseInt(slowestHour.hour, 10) + 1).padStart(2, '0')}:00` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">{slowestHour ? `${slowestHour.orders} orders` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="products" className="mt-6 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Product Performance</h3>
              <Select value={productSortBy} onValueChange={setProductSortBy}>
                <SelectTrigger className="w-40 bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                  <SelectItem value="units">By Units Sold</SelectItem>
                  <SelectItem value="growth">By Growth Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-500">Product</TableHead>
                  <TableHead className="text-gray-500">Category</TableHead>
                  <TableHead className="text-gray-500">Units Sold</TableHead>
                  <TableHead className="text-gray-500">Revenue</TableHead>
                  <TableHead className="text-gray-500">Stock</TableHead>
                  <TableHead className="text-gray-500">Trend</TableHead>
                  <TableHead className="text-gray-500">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductPerformance.length > 0 ? filteredProductPerformance.map((product) => (
                  <TableRow key={product.id} className="border-gray-200 hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-600 border-gray-200">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-900 font-medium">{product.unitsSold.toLocaleString()}</TableCell>
                    <TableCell className="text-gray-900 font-medium">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell>
                      <span className={product.stock < 100 ? 'text-amber-600' : 'text-gray-500'}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>{getTrendIcon(product.trend)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${product.growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {product.growthRate >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span className="text-sm font-medium">{formatPercentage(product.growthRate)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No product performance data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Order Analytics Tab */}
        <TabsContent value="orders" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Order Status Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Order Status Distribution</h3>
              <div className="space-y-4">
                {orderAnalytics.length > 0 ? orderAnalytics.map((status, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                        <span className="text-sm text-gray-900">{status.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{status.count.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">{status.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${status.percentage}%`, backgroundColor: status.color }}
                      ></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No order analytics data available</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {orderSuccessRate != null ? `${orderSuccessRate.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Processed</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProcessed.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Top Performing Days */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Daily Performance</h3>
              <div className="space-y-3">
                {salesData.length > 0 ? salesData.slice().reverse().map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        idx === 0 ? 'bg-emerald-50 text-emerald-600' :
                        idx === 1 ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {idx === 0 ? <Star size={16} /> : <Calendar size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500">{day.orders} orders • {day.customers} customers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(day.revenue)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No daily performance data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="customers" className="mt-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {customerInsights.length > 0 ? customerInsights.map((insight, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 mb-2">{insight.metric}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    {insight.metric.includes('Rate') || insight.metric.includes('Avg') 
                      ? insight.value.toFixed(1)
                      : insight.value.toLocaleString()}
                  </p>
                  <div className={`flex items-center gap-1 ${insight.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {insight.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="text-xs font-medium">{formatPercentage(insight.change)}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-4 text-center py-8 text-gray-400">
                <p>No customer insights data available</p>
              </div>
            )}
          </div>

          {/* Top Customers Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Top Customers</h3>
              <p className="text-xs text-gray-500 mt-1">Customers with highest lifetime value</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-500">Customer</TableHead>
                  <TableHead className="text-gray-500">Email</TableHead>
                  <TableHead className="text-gray-500">Orders</TableHead>
                  <TableHead className="text-gray-500">Total Spent</TableHead>
                  <TableHead className="text-gray-500">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.length > 0 ? topCustomers.map((customer, idx) => (
                  <TableRow key={customer.id} className="border-gray-200 hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{customer.email}</TableCell>
                    <TableCell className="text-gray-900 font-medium">{customer.orders}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className="text-gray-900">{formatCurrency(customer.avgOrderValue)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                      No top customers data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Financial Report Tab */}
        <TabsContent value="financial" className="mt-6 space-y-6">
          {financialSummary && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Gross Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(financialSummary.grossRevenue)}</p>
                  <p className="text-xs text-gray-500">Total sales before deductions</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Net Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600 mb-1">{formatCurrency(financialSummary.netRevenue)}</p>
                  <p className="text-xs text-gray-500">After all deductions</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Profit Margin</p>
                  <p className="text-3xl font-bold text-purple-600 mb-1">{financialSummary.profitMargin.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Net / Gross revenue</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <IndianRupee className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Gross Revenue</p>
                        <p className="text-xs text-gray-500">Total sales amount</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(financialSummary.grossRevenue)}</p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                        <Percent className="text-rose-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Platform Fee (10%)</p>
                        <p className="text-xs text-gray-500">Service charges</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-rose-600">-{formatCurrency(financialSummary.platformFee)}</p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Package className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Delivery Charges</p>
                        <p className="text-xs text-gray-500">Logistics costs</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-blue-600">+{formatCurrency(financialSummary.deliveryCharges)}</p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <ArrowDownRight className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Refunds & Returns</p>
                        <p className="text-xs text-gray-500">Customer refunds</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-amber-600">-{formatCurrency(financialSummary.refunds)}</p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-lg mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <IndianRupee className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Net Revenue</p>
                        <p className="text-xs text-emerald-600">Final amount after all adjustments</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(financialSummary.netRevenue)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
