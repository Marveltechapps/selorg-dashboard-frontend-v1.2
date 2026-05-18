import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Zap, Eye, Loader2, Calendar, Package } from 'lucide-react';
import { replenishmentApi } from '../../../api/merch/inventoryApi';
import { toast } from 'sonner';

export function ExpiryManagement({ searchQuery = "" }: { searchQuery?: string }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('STORE-001');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadBatches();
  }, [selectedStore, filterStatus]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const [batchResponse, statsResponse] = await Promise.all([
        replenishmentApi.getExpiryBatches(selectedStore),
        replenishmentApi.getExpiryStatistics(selectedStore, 30)
      ]);
      
      if (batchResponse.success && batchResponse.data) {
        setBatches(batchResponse.data);
      } else {
        setBatches(mockBatches);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        setStats(mockStats);
      }
    } catch (error) {
      console.error('Failed to load batches', error);
      toast.error('Failed to load expiry batches');
      setBatches(mockBatches);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    if (searchQuery && !b.batchId.includes(searchQuery) && !b.sku.includes(searchQuery)) {
      return false;
    }
    if (filterStatus !== 'All' && b.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'expiring_soon': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'expired': return 'bg-red-50 text-red-700 border-red-200';
      case 'marked_for_removal': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'removed': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'sold': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stores = ['STORE-001', 'STORE-002', 'STORE-003', 'STORE-004'];
  const statuses = ['All', 'active', 'expiring_soon', 'expired', 'marked_for_removal', 'removed', 'sold'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Expiry Management</h1>
          <p className="text-[#757575] text-sm">Track and manage expiring and expired inventory batches</p>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={stats?.totalBatches || batches.length}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Expiring (30 Days)"
          value={stats?.expiringIn30Days || 0}
          icon={Calendar}
          color="yellow"
        />
        <StatCard
          title="Expired"
          value={stats?.expiredBatches || 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Total Waste"
          value={`$${stats?.totalExpiryWaste || 0}`}
          icon={Trash2}
          color="orange"
        />
      </div>

      {/* Status Filters */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] p-4">
        <div className="flex items-center gap-4">
          <AlertTriangle size={18} className="text-[#757575]" />
          <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-[#F5F5F5] text-[#212121] hover:bg-[#E0E0E0]'
                }`}
              >
                {status === 'All' ? 'All' : status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#E0E0E0]">
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Batch ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Batch Number</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Expiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Days Left</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <Loader2 size={24} className="animate-spin text-[#7C3AED] mx-auto" />
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#757575]">
                    No batches found
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, idx) => {
                  const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                  return (
                    <tr key={idx} className="border-b border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#212121]">{batch.batchId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[#212121]">{batch.sku}</td>
                      <td className="px-6 py-4 text-sm text-[#757575]">{batch.batchNumber}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[#212121]">{batch.quantity}</td>
                      <td className="px-6 py-4 text-sm text-[#757575]">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <span className={daysLeft < 0 ? 'text-red-600' : daysLeft < 14 ? 'text-yellow-600' : 'text-green-600'}>
                          {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch.status)}`}>
                          {batch.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedBatch(batch)}
                          className="text-[#7C3AED] hover:text-[#6D28D9] font-medium flex items-center gap-1 mx-auto"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onRefresh={() => {
            setSelectedBatch(null);
            loadBatches();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg border p-4`}>
      <div className="flex items-start justify-between mb-2">
        <Icon size={24} />
      </div>
      <p className="text-sm font-medium text-[#757575]">{title}</p>
      <p className="text-2xl font-bold text-[#212121]">{value}</p>
    </div>
  );
}

function BatchDetailsModal({ batch, onClose, onRefresh }: any) {
  const [action, setAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleMarkForRemoval = async () => {
    try {
      setLoading(true);
      const response = await replenishmentApi.markBatchForRemoval(batch.batchId, 'admin', 'Batch approaching expiry');
      if (response.success) {
        toast.success('Batch marked for removal');
        onRefresh();
      } else {
        toast.error('Failed to mark batch');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to mark batch');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordRemoval = async () => {
    try {
      setLoading(true);
      const response = await replenishmentApi.recordBatchRemoval(batch.batchId, batch.quantity, 'Expired inventory removal');
      if (response.success) {
        toast.success('Removal recorded successfully');
        onRefresh();
      } else {
        toast.error('Failed to record removal');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to record removal');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountSale = async () => {
    try {
      setLoading(true);
      const response = await replenishmentApi.recordBatchSale(batch.batchId, batch.quantity, 30);
      if (response.success) {
        toast.success('30% discount sale recorded');
        onRefresh();
      } else {
        toast.error('Failed to record sale');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#212121] mb-6">Batch Details</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <DetailRow label="Batch ID" value={batch.batchId} />
            <DetailRow label="SKU" value={batch.sku} />
            <DetailRow label="Product" value={batch.productName} />
            <DetailRow label="Batch Number" value={batch.batchNumber} />
            <DetailRow label="Quantity" value={batch.quantity} />
          </div>
          
          <div className="space-y-4">
            <DetailRow label="Expiry Date" value={new Date(batch.expiryDate).toLocaleDateString()} />
            <DetailRow label="Days Until Expiry" value={daysLeft < 0 ? 'Expired' : `${daysLeft} days`} />
            <DetailRow label="Status" value={batch.status.replace('_', ' ')} />
            <DetailRow label="Supplier" value={batch.metadata?.supplier || 'N/A'} />
            <DetailRow label="Storage Condition" value={batch.metadata?.storageCondition || 'Standard'} />
          </div>
        </div>

        {/* Alerts */}
        {(batch.alerts || []).length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-2">Alerts</h3>
            <ul className="space-y-1">
              {batch.alerts.map((alert: any, idx: number) => (
                <li key={idx} className="text-sm text-yellow-800 flex gap-2">
                  <span>•</span>
                  <span>{alert.alertType.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#F5F5F5] p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-[#212121] mb-3">Available Actions</h3>
          <div className="space-y-2">
            {batch.status !== 'removed' && batch.status !== 'sold' && (
              <>
                <ActionButton
                  label="Mark for Removal"
                  icon={AlertTriangle}
                  onClick={handleMarkForRemoval}
                  disabled={loading}
                />
                {daysLeft > 7 && batch.status === 'active' && (
                  <ActionButton
                    label="Record 30% Discount Sale"
                    icon={Zap}
                    onClick={handleDiscountSale}
                    disabled={loading}
                  />
                )}
                {batch.status === 'marked_for_removal' && (
                  <ActionButton
                    label="Confirm Removal"
                    icon={Trash2}
                    onClick={handleRecordRemoval}
                    disabled={loading}
                    variant="danger"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, disabled, variant = 'primary' }: any) {
  const bgColor = variant === 'danger' ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-white hover:bg-[#F5F5F5] text-[#212121]';
  const borderColor = variant === 'danger' ? 'border-red-200' : 'border-[#E0E0E0]';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2 border ${borderColor} ${bgColor} font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#757575] font-medium">{label}:</span>
      <span className="text-sm font-semibold text-[#212121]">{value}</span>
    </div>
  );
}

const mockBatches = [
  {
    batchId: 'BATCH-001',
    sku: 'SKU-1024',
    productName: 'Organic Cereal',
    batchNumber: 'B-2024-001',
    quantity: 150,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expiring_soon',
    metadata: { supplier: 'Supplier A', storageCondition: 'Cool & Dry' },
    alerts: [
      { alertType: '14_days' },
      { alertType: '7_days' }
    ]
  },
  {
    batchId: 'BATCH-002',
    sku: 'SKU-1025',
    productName: 'Premium Yogurt',
    batchNumber: 'B-2024-002',
    quantity: 200,
    expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    metadata: { supplier: 'Supplier B', storageCondition: 'Refrigerated' },
    alerts: [{ alertType: 'expired' }]
  },
  {
    batchId: 'BATCH-003',
    sku: 'SKU-1026',
    productName: 'Fresh Milk',
    batchNumber: 'B-2024-003',
    quantity: 300,
    expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    metadata: { supplier: 'Supplier A', storageCondition: 'Refrigerated' },
    alerts: []
  },
];

const mockStats = {
  totalBatches: 3,
  expiringIn30Days: 1,
  expiredBatches: 1,
  totalExpiryWaste: 850
};
