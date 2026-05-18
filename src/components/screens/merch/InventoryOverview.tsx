import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Package, Clock, CheckCircle } from 'lucide-react';
import { inventoryApi, replenishmentApi } from '../../../api/merch/inventoryApi';
import { toast } from 'sonner';

export function InventoryOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('STORE-001');

  useEffect(() => {
    loadDashboard();
  }, [selectedStore]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getInventoryHealth(selectedStore);
      if (response.success && response.data) {
        setDashboard(response.data);
      }
    } catch (error) {
      console.error('Failed to load inventory dashboard', error);
      toast.error('Failed to load inventory data');
      setDashboard(mockDashboard);
    } finally {
      setLoading(false);
    }
  };

  const data = dashboard || mockDashboard;
  const stores = ['STORE-001', 'STORE-002', 'STORE-003', 'STORE-004'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Store Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Inventory Management</h1>
          <p className="text-[#757575] text-sm">Real-time inventory tracking, transactions, and operations</p>
        </div>
        <select 
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="px-4 py-2 border border-[#E0E0E0] rounded-lg bg-white text-[#212121] font-medium"
        >
          {stores.map(store => (
            <option key={store} value={store}>{store}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total SKUs"
          value={data.stock?.totalSKUs || 0}
          change={12}
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Out of Stock"
          value={data.stock?.outOfStockProducts || 0}
          change={-5}
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Low Stock"
          value={data.stock?.lowStockProducts || 0}
          change={8}
          icon={TrendingDown}
          color="yellow"
        />
        <KPICard
          title="Total Inventory Value"
          value={`$${(data.stock?.totalValue || 0).toLocaleString()}`}
          change={15}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Status */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E0E0E0] p-6">
          <h2 className="text-lg font-bold text-[#212121] mb-4">Inventory Health</h2>
          <div className="space-y-4">
            <StatusRow
              label="In Stock"
              value={data.stock?.totalSKUs ? data.stock.totalSKUs - data.stock.outOfStockProducts - data.stock.lowStockProducts : 0}
              percentage={85}
              color="green"
            />
            <StatusRow
              label="Low Stock"
              value={data.stock?.lowStockProducts || 0}
              percentage={10}
              color="yellow"
            />
            <StatusRow
              label="Out of Stock"
              value={data.stock?.outOfStockProducts || 0}
              percentage={5}
              color="red"
            />
            <div className="pt-4 border-t border-[#E0E0E0]">
              <p className="text-sm text-[#757575] mb-2">Last Updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-6">
          <h2 className="text-lg font-bold text-[#212121] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <ActionButton
              label="View Transactions"
              icon={Package}
              onClick={() => onNavigate('transactions')}
            />
            <ActionButton
              label="Manage Reservations"
              icon={Clock}
              onClick={() => onNavigate('reservations')}
            />
            <ActionButton
              label="Stock Reconciliation"
              icon={CheckCircle}
              onClick={() => onNavigate('reconciliation')}
            />
            <ActionButton
              label="Replenishment Cycles"
              icon={TrendingUp}
              onClick={() => onNavigate('replenishment')}
            />
            <ActionButton
              label="Expiry Management"
              icon={AlertTriangle}
              onClick={() => onNavigate('expiry')}
            />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] p-6">
        <h2 className="text-lg font-bold text-[#212121] mb-4">Active Alerts</h2>
        <div className="space-y-3">
          {(data.alerts || []).length > 0 ? (
            data.alerts.map((alert: any, idx: number) => (
              <AlertItem key={idx} alert={alert} />
            ))
          ) : (
            <p className="text-[#757575] text-sm">No active alerts</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] p-6">
        <h2 className="text-lg font-bold text-[#212121] mb-4">Recommendations</h2>
        <div className="space-y-3">
          {(data.recommendations || []).length > 0 ? (
            data.recommendations.map((rec: any, idx: number) => (
              <RecommendationItem key={idx} recommendation={rec} />
            ))
          ) : (
            <p className="text-[#757575] text-sm">No recommendations at this time</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, change, icon: Icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg border p-4`}>
      <div className="flex justify-between items-start mb-2">
        <Icon size={24} />
        <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      </div>
      <p className="text-sm font-medium text-[#757575]">{title}</p>
      <p className="text-2xl font-bold text-[#212121]">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, percentage, color }: any) {
  const bgColor = color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-[#212121]">{label}</span>
        <span className="text-sm font-semibold text-[#757575]">{value} ({percentage}%)</span>
      </div>
      <div className="w-full bg-[#E0E0E0] rounded-full h-2">
        <div className={`${bgColor} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-3 transition-colors"
    >
      <Icon size={18} />
      <span className="text-sm">{label}</span>
    </button>
  );
}

function AlertItem({ alert }: any) {
  const severityColor = alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600';
  return (
    <div className="flex items-start gap-3 p-3 bg-[#F5F5F5] rounded-lg">
      <AlertTriangle size={16} className={severityColor} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#212121]">{alert.type}</p>
        <p className="text-xs text-[#757575]">{alert.message}</p>
      </div>
    </div>
  );
}

function RecommendationItem({ recommendation }: any) {
  return (
    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
      <CheckCircle size={16} className="text-blue-600 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#212121]">{recommendation.type}</p>
        <p className="text-xs text-[#757575]">{recommendation.reason}</p>
        {recommendation.priority && (
          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded">
            {recommendation.priority}
          </span>
        )}
      </div>
    </div>
  );
}

const mockDashboard = {
  overallHealth: {
    status: 'healthy',
    score: 78,
    trend: 'stable'
  },
  stock: {
    totalSKUs: 245,
    outOfStockProducts: 12,
    lowStockProducts: 25,
    totalUnits: 5642,
    totalValue: 125430
  },
  expiry: {
    totalBatches: 48,
    expiringIn30Days: 8,
    expiredBatches: 2,
    totalExpiryWaste: 340
  },
  sales: {
    totalSales24h: 1200,
    revenue24h: 8500
  },
  replenishment: {
    ordersPending: 5,
    ordersInTransit: 3
  },
  alerts: [
    {
      type: 'Low Stock Alert',
      severity: 'warning',
      message: '15 SKUs are below minimum stock level'
    },
    {
      type: 'Expiry Alert',
      severity: 'critical',
      message: '3 batches expiring within 7 days'
    },
    {
      type: 'Pending Approval',
      severity: 'info',
      message: '2 replenishment orders awaiting approval'
    }
  ],
  recommendations: [
    {
      type: 'Increase Stock for SKU-1024',
      reason: 'High demand detected in past 7 days',
      priority: 'high'
    },
    {
      type: 'Clear Expiring Batches',
      reason: 'Discount sale recommended for items expiring in 14 days',
      priority: 'medium'
    },
    {
      type: 'Review Slow-Moving Items',
      reason: '12 SKUs have zero sales in past 30 days',
      priority: 'medium'
    }
  ]
};
