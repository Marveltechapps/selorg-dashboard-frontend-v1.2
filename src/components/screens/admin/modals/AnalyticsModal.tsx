import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  TrendingUp,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AnalyticsData,
  fetchAnalyticsData
} from '../citywideControlApi';
import { 
  LineChart, 
  Line, 
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
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ open, onClose }: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAnalytics();
    }
  }, [open]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await fetchAnalyticsData();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!analytics) return;

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const reportData: (string | number)[][] = [
        ['Citywide Analytics Report', `Generated: ${new Date().toLocaleString()}`],
        [''],
      ];
      if (analytics.orderFlowHistory?.length) {
        reportData.push(['Order Flow History'], ['Time', 'Orders/min'], ...analytics.orderFlowHistory.map(item => [item.time, item.orders.toString()]), ['']);
      }
      if (analytics.slaPerformanceByZone?.length) {
        reportData.push(['SLA Performance by Zone'], ['Zone', 'Actual (mins)', 'Target (mins)'], ...analytics.slaPerformanceByZone.map(item => [item.zone, item.actual.toString(), item.target.toString()]), ['']);
      }
      if (analytics.riderUtilization?.length) {
        reportData.push(['Rider Utilization'], ['Status', 'Count', 'Percentage'], ...analytics.riderUtilization.map(item => [item.status, item.count.toString(), `${item.percent}%`]));
      }

      const csv = reportData.map(row => (Array.isArray(row) ? row : [row]).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citywide-analytics-report-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Analytics report exported successfully');
    } catch (error) {
      console.error('Failed to export report:', error);
      toast.error('Failed to export report');
    }
  };

  const PIE_COLORS = ['#10b981', '#f59e0b', '#6b7280'];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="py-12 text-center text-[#71717a]">Loading analytics...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analytics) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 size={24} />
              Real-Time Analytics Dashboard
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-[#71717a]">No analytics data available</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="text-blue-500" size={28} />
                Real-Time Analytics Dashboard
              </DialogTitle>
              <p className="text-sm text-[#71717a] mt-1">
                Comprehensive operations insights and performance metrics
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download size={16} className="mr-2" />
              Export Report
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Order Flow Chart */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">Order Flow (Last 2 Hours)</h4>
              <div className="text-sm text-[#71717a]">5-minute intervals</div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.orderFlowHistory ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  stroke="#71717a"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#71717a"
                  label={{ value: 'Orders/min', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SLA Performance by Zone */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">Delivery SLA Performance by Zone</h4>
              <div className="text-sm text-[#71717a]">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded mr-1"></span> Actual
                <span className="inline-block w-3 h-3 bg-rose-500 rounded ml-3 mr-1"></span> Target
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.slaPerformanceByZone ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis 
                  dataKey="zone" 
                  tick={{ fontSize: 11 }}
                  stroke="#71717a"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#71717a"
                  label={{ value: 'Time (mins)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="actual" fill="#10b981" name="Actual Time" />
                <Bar dataKey="target" fill="#ef4444" name="Target" opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rider Utilization */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Rider Utilization</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.riderUtilization ?? []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percent }) => `${String(status).split(' ')[0]}: ${percent}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percent"
                  >
                    {(analytics.riderUtilization ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {(analytics.riderUtilization ?? []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      ></div>
                      <span>{item.status}</span>
                    </div>
                    <span className="font-bold">{item.count ?? 0} riders</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}