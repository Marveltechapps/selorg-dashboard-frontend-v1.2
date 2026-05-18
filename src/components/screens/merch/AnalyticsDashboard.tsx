import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Loader2, Download } from 'lucide-react';
import { analyticsApi, dashboardApi } from '../../../api/merch/analyticsApi';
import { toast } from 'sonner';

export function AnalyticsDashboard({ searchQuery = "" }: { searchQuery?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const dashboard = await dashboardApi.getExecutiveDashboard().catch(() => null);
      setData(dashboard?.data || mockDashboard);
    } catch (error) {
      setData(mockDashboard);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics & Insights</h1>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Total Sales</p>
          <p className="text-2xl font-bold mt-1">${(data?.sales?.totalSales / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-green-600 mt-1">+{data?.sales?.trend}% from last period</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Units Sold</p>
          <p className="text-2xl font-bold mt-1">{(data?.sales?.totalUnits / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-600 mt-1">Average: {data?.kpis?.avgOrderValue}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Conversion Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{data?.sales?.conversionRate || 2.5}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Avg Order Value</p>
          <p className="text-2xl font-bold mt-1">${data?.kpis?.avgOrderValue || 125}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="font-bold mb-4">Sales Trend</h3>
          <div className="h-40 flex items-end justify-around gap-2">
            {[45, 52, 48, 65, 72, 68, 80].map((value, i) => (
              <div key={i} className="flex-1 bg-blue-600 rounded" style={{ height: `${value}%` }} />
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center mt-2">Last 7 days</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="font-bold mb-4">Category Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Electronics</span>
              <span className="font-semibold">28%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: '28%' }} />
            </div>
            <div className="flex justify-between mt-3">
              <span>Apparel</span>
              <span className="font-semibold">35%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: '35%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-bold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Inventory Turnover</p>
            <p className="text-2xl font-bold mt-1">{data?.inventory?.turnover || 4.2}x</p>
          </div>
          <div>
            <p className="text-gray-600">Stock-out Rate</p>
            <p className="text-2xl font-bold mt-1">{data?.inventory?.stockOutPercentage || 2.1}%</p>
          </div>
          <div>
            <p className="text-gray-600">Inventory Health</p>
            <p className="text-2xl font-bold text-green-600 mt-1">Good</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const mockDashboard = {
  sales: {
    totalSales: 2500000,
    totalUnits: 15000,
    conversionRate: 2.8,
    trend: 15,
  },
  inventory: {
    turnover: 4.2,
    stockOutPercentage: 2.1,
  },
  kpis: {
    avgOrderValue: 165,
    salesTrend: 8,
  },
};
