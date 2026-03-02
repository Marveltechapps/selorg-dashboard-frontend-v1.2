import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Package, AlertTriangle, Truck, Activity } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { fetchWarehouseMetrics, fetchOrderFlow, WarehouseMetrics, PicklistFlow } from './warehouseApi';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, subValue, trend, trendUp, icon, color = "cyan" }: MetricCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#64748B] font-medium text-xs uppercase tracking-wider">{label}</span>
        {icon && <div className={`text-${color}-600 p-1.5 bg-${color}-50 rounded-lg`}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#1E293B]">{value}</span>
        {subValue && <span className="text-sm text-[#64748B] mb-1">{subValue}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export function WarehouseOverview() {
  const [metrics, setMetrics] = useState<WarehouseMetrics | null>(null);
  const [orderFlow, setOrderFlow] = useState<PicklistFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, flow] = await Promise.all([
          fetchWarehouseMetrics(),
          fetchOrderFlow()
        ]);
        setMetrics(m);
        setOrderFlow(flow);
      } catch (error) {
        console.error('Failed to load warehouse data:', error);
        toast.error('Failed to load warehouse data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    // Fast polling for "real-time" behavior (10 seconds)
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics && orderFlow.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  if (!loading && !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Warehouse Overview" subtitle="Real-time capacity, inbound/outbound flow, and critical alerts" />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-[#64748B]">
          Failed to load warehouse metrics. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Warehouse Overview"
        subtitle="Real-time capacity, inbound/outbound flow, and critical alerts"
        actions={
          <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
            onClick={() => {
              // Generate daily report data
              const today = new Date().toISOString().split('T')[0];
              const reportData = [
                ['Warehouse Daily Report', `Date: ${today}`],
                [''],
                ['Metric', 'Value', 'Status'],
                ['Inbound Queue', `${metrics?.inboundQueue || 0} Trucks Waiting`, 'Live'],
                ['Outbound Queue', `${metrics?.outboundQueue || 0} Orders Pending`, 'Live'],
                ['Inventory Health', `${metrics?.inventoryHealth || 0}% Accuracy`, 'Stable'],
                ['Critical Alerts', `${metrics?.criticalAlerts || 0}`, 'Action Required'],
                [''],
                ['Capacity Utilization'],
                ['Storage Bins', `${metrics?.capacityUtilization?.bins ?? 0}%`],
                ['Cold Storage', `${metrics?.capacityUtilization?.coldStorage ?? 0}%`],
                ['Ambient', `${metrics?.capacityUtilization?.ambient ?? 0}%`],
              ];
              
              // Convert to CSV
              const csv = reportData.map(row => row.join(',')).join('\n');
              
              // Create and download file
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `warehouse-daily-report-${today}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            Daily Report
          </button>
          <button className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
            onClick={() => {
              // Generate operations view data
              const today = new Date().toISOString().split('T')[0];
              const time = new Date().toLocaleTimeString();
              const reportData = [
                ['Warehouse Operations View', `Date: ${today}`, `Time: ${time}`],
                [''],
                ['=== ACTIVE OPERATIONS ==='],
                [''],
                ['Inbound Queue', metrics?.inboundQueue || 0],
                ['Outbound Queue', metrics?.outboundQueue || 0],
                [''],
                ['=== LIVE ORDER FLOW ==='],
                ['Order ID', 'Destination', 'Status', 'Items'],
                ...orderFlow.map(f => [f.orderId, f.customer, f.status, f.items]),
                [''],
                ['=== CAPACITY UTILIZATION ==='],
                ['Storage Bins', `${metrics?.capacityUtilization?.bins ?? 0}%`],
                ['Cold Storage', `${metrics?.capacityUtilization?.coldStorage ?? 0}%`],
                ['Ambient', `${metrics?.capacityUtilization?.ambient ?? 0}%`],
              ];
              
              // Convert to CSV
              const csv = reportData.map(row => row.join(',')).join('\n');
              
              // Create and download file
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `warehouse-operations-view-${today}-${time.replace(/:/g, '-')}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            Operations View
          </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Inbound Queue" 
          value={metrics?.inboundQueue.toString() || "0"} 
          subValue="Trucks Waiting"
          trend={metrics && metrics.inboundQueue > 10 ? "High Volume" : "Normal"}
          trendUp={false}
          icon={<ArrowDownToLine size={18} />}
          color="blue"
        />
        <MetricCard 
          label="Outbound Queue" 
          value={metrics?.outboundQueue.toString() || "0"} 
          subValue="Orders Pending"
          trend="Moving Fast"
          trendUp={true}
          icon={<ArrowUpFromLine size={18} />}
          color="green"
        />
        <MetricCard 
          label="Inventory Health" 
          value={`${metrics?.inventoryHealth || 0}%`} 
          subValue="Accuracy"
          trend="Stable"
          trendUp={true}
          icon={<Package size={18} />}
          color="cyan"
        />
        <MetricCard 
          label="Critical Alerts" 
          value={metrics?.criticalAlerts.toString() || "0"} 
          trend={metrics && metrics.criticalAlerts > 0 ? "Action Required" : "All Clear"}
          trendUp={false}
          icon={<AlertTriangle size={18} />}
          color="amber"
        />
      </div>

      {/* (Additional analytics cards removed as requested) */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Warehouse Capacity */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm p-6">
              <h3 className="font-bold text-[#1E293B] mb-4">Capacity Utilization</h3>
              <div className="space-y-6">
                  <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                          <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-cyan-600 bg-cyan-200">
                                  Storage Bins
                              </span>
                          </div>
                          <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-cyan-600">
                                  {metrics?.capacityUtilization?.bins ?? 0}%
                              </span>
                          </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-cyan-100">
                          <div style={{ width: `${metrics?.capacityUtilization?.bins ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#0891b2]"></div>
                      </div>
                  </div>

                  <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                          <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-amber-600 bg-amber-200">
                                  Cold Storage
                              </span>
                          </div>
                          <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-amber-600">
                                  {metrics?.capacityUtilization?.coldStorage ?? 0}%
                              </span>
                          </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-amber-100">
                          <div style={{ width: `${metrics?.capacityUtilization?.coldStorage ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"></div>
                      </div>
                  </div>

                  <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                          <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                  Ambient Storage
                              </span>
                          </div>
                          <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-green-600">
                                  {metrics?.capacityUtilization?.ambient ?? 0}%
                              </span>
                          </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100">
                          <div style={{ width: `${metrics?.capacityUtilization?.ambient ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Live Order Flow */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#1E293B]">Live Order Flow (To Dark Stores)</h3>
              <div className="flex gap-2">
                 <span className="text-xs font-medium px-2 py-1 bg-[#F1F5F9] text-[#64748B] rounded flex items-center gap-1">
                    <Activity size={12} className="animate-pulse text-green-500" /> Real-time
                 </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Destination</th>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {orderFlow.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-mono text-[#475569]">{order.orderId}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{order.customer}</td>
                      <td className="px-6 py-4 text-[#64748B]">{order.items}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'picking' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                          order.status === 'dispatching' ? 'bg-[#FFEDD5] text-[#C2410C]' :
                          'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${
                          order.priority === 'high' ? 'text-red-600' :
                          order.priority === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                        }`}>
                          {order.priority.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orderFlow.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#64748B]">
                        No active orders in flow
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  );
}