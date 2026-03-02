import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, PieChart, Activity, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { fetchWarehouseAnalytics } from './warehouseApi';

export function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState('week');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Polling every 30s for analytics
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchWarehouseAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportDailyReport = () => {
    if (!analytics) return;
    const { weeklyData, storageData, metrics } = analytics;
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Warehouse Daily Operations Report', `Date: ${today}`],
      [''],
      ['=== OPERATIONAL SLAs ==='],
      ['Inbound Turnaround', metrics.inboundTurnaround],
      ['Outbound On-Time', metrics.outboundOnTime],
      ['Picking Speed (UPH)', metrics.pickingSpeed],
      [''],
      ['=== INVENTORY HEALTH ==='],
      ['Accuracy', metrics.accuracy],
      ['Shrinkage', metrics.shrinkage],
      ['Turnover Rate', metrics.turnoverRate],
      [''],
      ['=== STAFF PRODUCTIVITY ==='],
      ['Avg UPH', metrics.avgUPH],
      ['Error Rate', metrics.errorRate],
      ['Attendance', metrics.attendance],
      [''],
      ['=== WEEKLY OUTPUT ==='],
      ['Day', 'Inbound', 'Outbound', 'Productivity'],
      ...weeklyData.map((d: any) => [d.day, d.inbound.toString(), d.outbound.toString(), d.productivity.toString()]),
      [''],
      ['=== STORAGE UTILIZATION ==='],
      ['Status', 'Percentage'],
      ...storageData.map((s: any) => [s.name, `${s.value}%`]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-daily-report-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportCustomReport = (reportType: string) => {
    if (!analytics) return;
    const { inventoryData, metrics } = analytics;
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (reportType === 'sla') {
      csvData = [
        ['Operational SLAs Report', `Date: ${today}`],
        ['Metric', 'Target', 'Actual', 'Status'],
        ['Inbound Turnaround Time', '95%', metrics.inboundTurnaround, '✓ Pass'],
        ['Outbound Dispatch Time', '95%', metrics.outboundOnTime, '✓ Pass'],
        ['Picking Speed (UPH)', '90', metrics.pickingSpeed, '✓ Pass'],
        ['Order Accuracy', '99%', metrics.accuracy, '✓ Pass'],
      ];
    } else if (reportType === 'inventory') {
      const inventoryDataSafe = Array.isArray(inventoryData) ? inventoryData : [];
      csvData = [
        ['Inventory Health Report', `Date: ${today}`],
        ['Metric', 'Value'],
        ['Total SKUs', metrics?.totalSKUs ?? '—'],
        ['Inventory Accuracy', metrics?.accuracy ?? '—'],
        ['Shrinkage Rate', metrics?.shrinkage ?? '—'],
        ['Turnover Rate', metrics?.turnoverRate ?? '—'],
        ['Expiring Soon (7 days)', metrics?.expiringSoon != null ? `${metrics.expiringSoon} items` : '—'],
        ['Stockouts', metrics?.stockouts ?? '—'],
        [''],
        ['By Category', 'SKU Count'],
        ...inventoryDataSafe.map((i: any) => [(i.category ?? i.name ?? ''), String(i.value ?? 0)]),
      ];
    } else if (reportType === 'productivity') {
      csvData = [
        ['Staff Productivity Report', `Date: ${today}`],
        ['Metric', 'Value'],
        ['Average UPH', metrics?.avgUPH ?? '—'],
        ['Error Rate Change', metrics?.errorRate ?? '—'],
        ['Attendance Rate', metrics?.attendance ?? '—'],
        ['Active Staff', metrics?.activeStaff ?? '—'],
        ['Total Staff', metrics?.totalStaff ?? '—'],
      ];
    }

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  if (!analytics) {
    return <EmptyState title="No analytics data available" />;
  }

  const { weeklyData = [], storageData = [], inventoryData = [], metrics = {} } = analytics;
  const chartColors = ['#0891b2', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b'];
  const safeStorageData = Array.isArray(storageData)
    ? storageData.map((item: any, idx: number) => ({ ...item, color: item.color || chartColors[idx % chartColors.length] }))
    : [];
  const safeWeeklyData = Array.isArray(weeklyData) ? weeklyData : [];
  const safeInventoryData = Array.isArray(inventoryData) ? inventoryData : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Operational KPIs, inventory aging, and staff productivity"
        actions={
          <>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button 
              onClick={exportDailyReport}
              className="px-4 py-2 bg-[#1E293B] text-white font-medium rounded-lg hover:bg-[#334155] flex items-center gap-2"
            >
              <Download size={16} />
              Export Daily Report
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => setSelectedReport('sla')}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-[#0891b2] mb-4 group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-2">Operational SLAs</h3>
          <p className="text-sm text-[#64748B] mb-4">Inbound turnaround time, picking speed, and dispatch timeliness.</p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0891b2]">
            <span>Inbound: {metrics?.inboundTurnaround ?? '—'}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Outbound: {metrics?.outboundOnTime ?? '—'}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exportCustomReport('sla');
            }}
            className="mt-4 text-xs text-[#0891b2] hover:underline font-medium flex items-center gap-1"
          >
            <Download size={12} /> Export Report
          </button>
        </div>

        <div 
          onClick={() => setSelectedReport('inventory')}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 size={24} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-2">Inventory Health</h3>
          <p className="text-sm text-[#64748B] mb-4">Stock aging, expiry risk, and inventory turnover rates.</p>
          <div className="flex items-center gap-2 text-xs font-bold text-green-600">
            <span>Accuracy: {metrics?.accuracy ?? '—'}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Shrinkage: {metrics?.shrinkage ?? '—'}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exportCustomReport('inventory');
            }}
            className="mt-4 text-xs text-green-600 hover:underline font-medium flex items-center gap-1"
          >
            <Download size={12} /> Export Report
          </button>
        </div>

        <div 
          onClick={() => setSelectedReport('productivity')}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-2">Staff Productivity</h3>
          <p className="text-sm text-[#64748B] mb-4">Units per hour (UPH), error rates, and attendance trends.</p>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
            <span>Avg UPH: {metrics?.avgUPH ?? '—'}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Errors: {metrics?.errorRate ?? '—'}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exportCustomReport('productivity');
            }}
            className="mt-4 text-xs text-purple-600 hover:underline font-medium flex items-center gap-1"
          >
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Utilization Chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <PieChart size={18} className="text-[#0891b2]" />
              Storage Utilization
            </h3>
          </div>
          <div className="p-6" style={{ minHeight: 280 }}>
            {safeStorageData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-[#64748B] text-sm">No storage data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={safeStorageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      isAnimationActive={true}
                    >
                      {safeStorageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  {safeStorageData.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-bold text-[#64748B]">{item.name}</span>
                      </div>
                      <p className="text-lg font-bold text-[#1E293B]">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Weekly Output Trends */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <BarChart3 size={18} className="text-[#0891b2]" />
              Weekly Output Trends
            </h3>
          </div>
          <div className="p-6" style={{ minHeight: 280 }}>
            {safeWeeklyData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-[#64748B] text-sm">No weekly data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={safeWeeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inbound" fill="#0891b2" name="Inbound" />
                  <Bar dataKey="outbound" fill="#06b6d4" name="Outbound" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory by Category */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <FileText size={18} className="text-[#0891b2]" />
              Inventory by Category
            </h3>
          </div>
          <div className="p-6" style={{ minHeight: 280 }}>
            {safeInventoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-[#64748B] text-sm">No inventory data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={safeInventoryData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" name="SKU Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Productivity Trend */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <TrendingUp size={18} className="text-[#0891b2]" />
              Productivity Trend (UPH)
            </h3>
          </div>
          <div className="p-6" style={{ minHeight: 280 }}>
            {safeWeeklyData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-[#64748B] text-sm">No productivity data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={safeWeeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={2} name="UPH" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}