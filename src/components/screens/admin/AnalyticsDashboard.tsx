import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchRealtimeMetrics,
  fetchTimeSeriesData,
  fetchProductPerformance,
  fetchCategoryAnalytics,
  fetchRegionalPerformance,
  fetchCustomerMetrics,
  fetchOperationalMetrics,
  fetchRevenueBreakdown,
  fetchGrowthTrends,
  fetchPeakHours,
  fetchConversionFunnel,
  fetchPaymentMethods,
  fetchOrdersByHour,
  fetchRiderPerformance,
  fetchInventoryHealth,
  fetchFinancialSummary,
  createCustomReport,
  exportAnalyticsReport,
  type ExportFormat,
  type InventoryHealthItem,
  type FinancialSummary,
  type RiderPerformanceItem,
  RealtimeMetrics,
  TimeSeriesData,
  ProductPerformance,
  CategoryAnalytics,
  RegionalPerformance,
  CustomerMetrics,
  OperationalMetrics,
  RevenueBreakdown,
  GrowthTrend,
  PeakHourData,
  ConversionFunnel,
  PaymentMethodAnalytics,
} from './analyticsApi';
import { toast } from 'sonner';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Users,
  Target,
  Package,
  MapPin,
  Clock,
  Star,
  Activity,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export function AnalyticsDashboard() {
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics[]>([]);
  const [regionalPerformance, setRegionalPerformance] = useState<RegionalPerformance[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [growthTrends, setGrowthTrends] = useState<GrowthTrend[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [ordersByHour, setOrdersByHour] = useState<{ hour: string; orders: number; revenue: number }[]>([]);
  const [riderPerformance, setRiderPerformance] = useState<RiderPerformanceItem[]>([]);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealthItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [customReportResult, setCustomReportResult] = useState<unknown[]>([]);
  const [customReportLoading, setCustomReportLoading] = useState(false);
  const [customDimensions, setCustomDimensions] = useState<string[]>(['day', 'month']);
  const [customMetrics, setCustomMetrics] = useState<string[]>(['revenue', 'orders']);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        metrics,
        timeSeries,
        products,
        categories,
        regions,
        customers,
        operations,
        revenue,
        growth,
        peaks,
        funnel,
        payments,
        ordersHour,
        riders,
        inventory,
        finance,
      ] = await Promise.all([
        fetchRealtimeMetrics(timeRange),
        fetchTimeSeriesData(timeRange),
        fetchProductPerformance(),
        fetchCategoryAnalytics(),
        fetchRegionalPerformance(),
        fetchCustomerMetrics(),
        fetchOperationalMetrics(),
        fetchRevenueBreakdown(),
        fetchGrowthTrends(),
        fetchPeakHours(),
        fetchConversionFunnel(),
        fetchPaymentMethods(),
        fetchOrdersByHour(timeRange === '24h' ? '7d' : timeRange),
        fetchRiderPerformance(),
        fetchInventoryHealth(),
        fetchFinancialSummary(timeRange),
      ]);

      setRealtimeMetrics(metrics);
      setTimeSeriesData(timeSeries);
      setProductPerformance(products);
      setCategoryAnalytics(categories);
      setRegionalPerformance(regions);
      setCustomerMetrics(customers);
      setOperationalMetrics(operations);
      setRevenueBreakdown(revenue);
      setGrowthTrends(growth);
      setPeakHours(peaks);
      setConversionFunnel(funnel);
      setPaymentMethods(payments);
      setOrdersByHour(ordersHour);
      setRiderPerformance(riders);
      setInventoryHealth(inventory);
      setFinancialSummary(finance);
    } catch (error: any) {
      console.error('Analytics load error:', error);
      toast.error(`Failed to load analytics data: ${error?.message || 'Unknown error'}`);
      // Set default values to prevent crash
      setRealtimeMetrics(null);
      setTimeSeriesData([]);
      setProductPerformance([]);
      setCategoryAnalytics([]);
      setRegionalPerformance([]);
      setCustomerMetrics(null);
      setOperationalMetrics(null);
      setRevenueBreakdown([]);
      setGrowthTrends([]);
      setPeakHours([]);
      setConversionFunnel([]);
      setPaymentMethods([]);
      setOrdersByHour([]);
      setRiderPerformance([]);
      setInventoryHealth([]);
      setFinancialSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `₹${(value / 1000).toFixed(1)}K`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpRight className="text-emerald-500" size={16} />
    ) : (
      <ArrowDownRight className="text-rose-500" size={16} />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  const handleExportAnalytics = async () => {
    try {
      if (exportFormat === 'csv') {
        const blob = await exportAnalyticsReport('csv', timeRange, 'overview');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const data = {
          realtimeMetrics,
          timeSeriesData,
          productPerformance,
          categoryAnalytics,
          regionalPerformance,
          customerMetrics,
          operationalMetrics,
          revenueBreakdown,
          growthTrends,
          peakHours,
          conversionFunnel,
          paymentMethods,
          ordersByHour,
          riderPerformance,
          inventoryHealth,
          financialSummary,
          exportedAt: new Date().toISOString(),
          timeRange,
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      toast.success('Analytics data exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export analytics: ${error?.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Analytics Dashboard</h1>
          <p className="text-[#71717a] text-sm">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar size={14} className="mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={async () => {
              await loadData();
              toast.success('Analytics data refreshed');
            }} 
            variant="outline"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleExportAnalytics}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowCustomReport(true)}
          >
            Create Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Revenue</p>
            <IndianRupee className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            ₹{(realtimeMetrics?.totalRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {getGrowthIcon(realtimeMetrics?.revenueGrowth || 0)}
            <span className={`text-xs font-medium ${getGrowthColor(realtimeMetrics?.revenueGrowth || 0)}`}>
              {realtimeMetrics?.revenueGrowth}% vs last period
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Orders</p>
            <ShoppingCart className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {(realtimeMetrics?.totalOrders || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {getGrowthIcon(realtimeMetrics?.ordersGrowth || 0)}
            <span className={`text-xs font-medium ${getGrowthColor(realtimeMetrics?.ordersGrowth || 0)}`}>
              {realtimeMetrics?.ordersGrowth}% vs last period
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Users</p>
            <Users className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {(realtimeMetrics?.activeUsers || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {getGrowthIcon(realtimeMetrics?.usersGrowth || 0)}
            <span className={`text-xs font-medium ${getGrowthColor(realtimeMetrics?.usersGrowth || 0)}`}>
              {realtimeMetrics?.usersGrowth}% vs last period
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Avg Order Value</p>
            <Target className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            ₹{(realtimeMetrics?.averageOrderValue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[#71717a] mt-2">
            Conversion: {realtimeMetrics?.conversionRate}%
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 size={14} className="mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart size={14} className="mr-1.5" /> Orders
          </TabsTrigger>
          <TabsTrigger value="riders">
            <Users size={14} className="mr-1.5" /> Riders
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package size={14} className="mr-1.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="finance">
            <IndianRupee size={14} className="mr-1.5" /> Finance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4">
            {/* Revenue & Orders Timeline */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm col-span-2">
              <h3 className="font-bold text-[#18181b] mb-4">Revenue & Orders Over Time</h3>
              {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    stroke="#71717a"
                    fontSize={12}
                  />
                  <YAxis yAxisId="left" stroke="#71717a" fontSize={12} tickFormatter={formatCurrency} />
                  <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px' }}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any) => [typeof value === 'number' ? formatCurrency(value) : value]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="Revenue"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <p className="text-[#71717a] py-12 text-center">No time series data for this period</p>
              )}
            </div>

            {/* Revenue Breakdown Pie Chart */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-[#18181b] mb-4">Revenue by Category</h3>
              {revenueBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <p className="text-[#71717a] py-12 text-center">No revenue breakdown data</p>
              )}
            </div>

            {/* Peak Hours */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-[#18181b] mb-4">Peak Hours Analysis</h3>
              {peakHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="hour" stroke="#71717a" fontSize={10} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px' }}
                  />
                  <Bar dataKey="orders" fill="#f59e0b" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <p className="text-[#71717a] py-12 text-center">No peak hours data</p>
              )}
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm col-span-2">
              <h3 className="font-bold text-[#18181b] mb-4">Conversion Funnel</h3>
              {conversionFunnel.length > 0 ? (
              <div className="space-y-3">
                {conversionFunnel.map((stage, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#18181b]">{stage.stage}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#71717a]">{formatNumber(stage.users)} users</span>
                        <span className="text-sm font-bold text-[#18181b]">{stage.conversionRate}%</span>
                      </div>
                    </div>
                    <div className="w-full h-8 bg-[#e4e4e7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-end pr-3"
                        style={{ width: `${stage.conversionRate}%` }}
                      >
                        {idx < conversionFunnel.length - 1 && stage.dropoffRate > 0 && (
                          <span className="text-xs text-white font-medium">
                            -{stage.dropoffRate.toFixed(1)}% drop
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <p className="text-[#71717a] py-8 text-center">No conversion funnel data</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab - Orders by hour template */}
        <TabsContent value="orders">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-[#18181b] mb-4">Orders by Hour</h3>
            <p className="text-sm text-[#71717a] mb-4">Order volume and revenue by hour of day</p>
            {ordersByHour.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={ordersByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="hour" stroke="#71717a" fontSize={10} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[#71717a] py-8 text-center">No orders data for this period</p>
            )}
          </div>
        </TabsContent>

        {/* Riders Tab - Rider performance template */}
        <TabsContent value="riders">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Rider Performance</h3>
              <p className="text-xs text-[#71717a] mt-1">Deliveries and metrics by rider</p>
            </div>
            {riderPerformance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Avg Delivery (min)</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riderPerformance.map((r) => (
                    <TableRow key={r.riderId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.deliveries}</TableCell>
                      <TableCell>{r.avgDeliveryTime}</TableCell>
                      <TableCell>{r.rating}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-[#71717a] py-12 text-center">No rider performance data available</p>
            )}
          </div>
        </TabsContent>

        {/* Inventory Tab - Inventory health template */}
        <TabsContent value="inventory">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Inventory Health</h3>
              <p className="text-xs text-[#71717a] mt-1">Stock levels and low-stock items</p>
            </div>
            {inventoryHealth.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryHealth.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.stockLevel}</TableCell>
                      <TableCell>{item.lowStockThreshold}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'low' ? 'destructive' : 'secondary'}>
                          {item.status === 'low' ? 'Low' : 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-[#71717a] py-12 text-center">No inventory data available</p>
            )}
          </div>
        </TabsContent>

        {/* Finance Tab - Financial summary template */}
        <TabsContent value="finance">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm col-span-2">
              <h3 className="font-bold text-[#18181b] mb-4">Financial Summary</h3>
              {financialSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="border border-[#e4e4e7] rounded-lg p-4">
                    <p className="text-xs text-[#71717a]">Total Revenue</p>
                    <p className="text-xl font-bold text-emerald-600">₹{financialSummary.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="border border-[#e4e4e7] rounded-lg p-4">
                    <p className="text-xs text-[#71717a]">Total Orders</p>
                    <p className="text-xl font-bold text-[#18181b]">{financialSummary.totalOrders.toLocaleString()}</p>
                  </div>
                  <div className="border border-[#e4e4e7] rounded-lg p-4">
                    <p className="text-xs text-[#71717a]">Avg Order Value</p>
                    <p className="text-xl font-bold text-[#18181b]">₹{financialSummary.averageOrderValue.toLocaleString()}</p>
                  </div>
                  <div className="border border-[#e4e4e7] rounded-lg p-4">
                    <p className="text-xs text-[#71717a]">Total Discount</p>
                    <p className="text-xl font-bold text-amber-600">₹{(financialSummary.totalDiscount || 0).toLocaleString()}</p>
                  </div>
                  <div className="border border-[#e4e4e7] rounded-lg p-4">
                    <p className="text-xs text-[#71717a]">Delivery Fees</p>
                    <p className="text-xl font-bold text-[#18181b]">₹{(financialSummary.totalDeliveryFee || 0).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#71717a] py-8">No financial data for this period</p>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* Custom Report Builder Modal */}
      <Dialog open={showCustomReport} onOpenChange={setShowCustomReport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom Report Builder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#71717a]">Select dimensions and metrics to build a custom report from order data.</p>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-[#18181b]">Dimensions</label>
              <p className="text-xs text-[#71717a]">hour, day, month, year, city</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['hour', 'day', 'month', 'year', 'city'].map((d) => (
                  <Badge
                    key={d}
                    variant={customDimensions.includes(d) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCustomDimensions((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#18181b]">Metrics</label>
              <p className="text-xs text-[#71717a]">revenue, orders</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['revenue', 'orders'].map((m) => (
                  <Badge
                    key={m}
                    variant={customMetrics.includes(m) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCustomMetrics((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            {customReportResult.length > 0 && (
              <div className="max-h-48 overflow-auto rounded border border-[#e4e4e7] p-3">
                <p className="text-xs font-medium text-[#71717a] mb-2">Result ({customReportResult.length} rows)</p>
                <pre className="text-xs text-[#18181b] whitespace-pre-wrap">
                  {JSON.stringify(customReportResult.slice(0, 5), null, 2)}
                  {customReportResult.length > 5 && '\n...'}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomReport(false)}
            >
              Close
            </Button>
            <Button
              disabled={customReportLoading || customDimensions.length === 0 || customMetrics.length === 0}
              onClick={async () => {
                setCustomReportLoading(true);
                try {
                  const result = await createCustomReport({
                    dimensions: customDimensions,
                    metrics: customMetrics,
                    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dateTo: new Date().toISOString().split('T')[0],
                  });
                  setCustomReportResult(result as unknown[]);
                  toast.success('Custom report generated');
                } catch (e: any) {
                  toast.error(e?.message || 'Failed to generate report');
                } finally {
                  setCustomReportLoading(false);
                }
              }}
            >
              {customReportLoading ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
