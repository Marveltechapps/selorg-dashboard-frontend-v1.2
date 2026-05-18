import React, { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Loader2, TrendingUp, Check, Clock, AlertCircle } from 'lucide-react';
import { replenishmentApi } from '../../../api/merch/inventoryApi';
import { toast } from 'sonner';

export function ReplenishmentOrders({ searchQuery = "" }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('STORE-001');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedStore, filterStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await replenishmentApi.getReplenishmentOrders(selectedStore);
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setOrders(mockOrders);
      }
    } catch (error) {
      console.error('Failed to load orders', error);
      toast.error('Failed to load replenishment orders');
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (searchQuery && !o.orderId.includes(searchQuery) && !o.sku.includes(searchQuery)) {
      return false;
    }
    if (filterStatus !== 'All' && o.orderStatus !== filterStatus) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'pending_approval': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'shipped': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'received': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check size={14} />;
      case 'pending_approval': return <AlertCircle size={14} />;
      case 'shipped': return <TrendingUp size={14} />;
      case 'received': return <Check size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const stores = ['STORE-001', 'STORE-002', 'STORE-003', 'STORE-004'];
  const statuses = ['All', 'draft', 'pending_approval', 'approved', 'shipped', 'received', 'cancelled'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Replenishment Orders</h1>
          <p className="text-[#757575] text-sm">Manage purchase orders and replenishment cycles</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-4 py-2 border border-[#E0E0E0] rounded-lg bg-white text-[#212121] font-medium"
          >
            {stores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] flex items-center gap-2"
          >
            <Plus size={16} />
            Create Order
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] p-4">
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-[#757575]" />
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

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#E0E0E0]">
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Est. Delivery</th>
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
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#757575]">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => (
                  <tr key={idx} className="border-b border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#212121]">{order.orderId}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#212121]">{order.sku}</td>
                    <td className="px-6 py-4 text-sm text-[#757575]">{order.vendorId}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#212121]">{order.quantity}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#212121]">${order.pricing?.totalCost || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 w-fit ${getStatusColor(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus.replace('_', ' ').charAt(0).toUpperCase() + order.orderStatus.replace('_', ' ').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#757575]">
                      {order.delivery?.estimatedDeliveryDate ? new Date(order.delivery.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#7C3AED] hover:text-[#6D28D9] font-medium flex items-center gap-1 mx-auto"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          storeId={selectedStore}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#212121] mb-6">Order Details</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <DetailRow label="Order ID" value={order.orderId} />
            <DetailRow label="SKU" value={order.sku} />
            <DetailRow label="Vendor" value={order.vendorId} />
            <DetailRow label="Quantity" value={order.quantity} />
            <DetailRow label="Unit Cost" value={`$${order.pricing?.unitCost || 0}`} />
          </div>
          
          <div className="space-y-4">
            <DetailRow label="Total Cost" value={`$${order.pricing?.totalCost || 0}`} />
            <DetailRow label="Status" value={order.orderStatus} />
            <DetailRow label="Payment Status" value={order.paymentInfo?.status || 'unpaid'} />
            <DetailRow label="Created" value={new Date(order.timeline?.createdAt).toLocaleDateString()} />
            <DetailRow label="Est. Delivery" value={order.delivery?.estimatedDeliveryDate ? new Date(order.delivery.estimatedDeliveryDate).toLocaleDateString() : 'N/A'} />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#E0E0E0]">
          <h3 className="font-semibold text-[#212121] mb-3">Delivery Information</h3>
          <div className="space-y-2">
            <DetailRow label="Tracking Number" value={order.delivery?.trackingNumber || 'N/A'} />
            <DetailRow label="Received Quantity" value={order.delivery?.receivedQuantity || 'Pending'} />
            <DetailRow label="Actual Delivery" value={order.delivery?.actualDeliveryDate ? new Date(order.delivery.actualDeliveryDate).toLocaleDateString() : 'Pending'} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function CreateOrderModal({ storeId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    sku: '',
    vendorId: '',
    quantity: 0,
    unitCost: 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await replenishmentApi.createReplenishmentOrder({
        storeId,
        ...formData,
        pricing: {
          unitCost: formData.unitCost,
          totalCost: formData.quantity * formData.unitCost,
          finalTotal: formData.quantity * formData.unitCost
        }
      });
      if (response.success) {
        toast.success('Order created successfully');
        onSuccess();
      } else {
        toast.error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-[#212121] mb-6">Create Replenishment Order</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">SKU</label>
            <input
              type="text"
              placeholder="Enter SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">Vendor ID</label>
            <input
              type="text"
              placeholder="Enter vendor ID"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">Quantity</label>
            <input
              type="number"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">Unit Cost</label>
            <input
              type="number"
              placeholder="Enter unit cost"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              required
            />
          </div>

          <div className="bg-[#F5F5F5] p-3 rounded-lg">
            <p className="text-sm text-[#757575]">Total: <span className="font-bold text-[#212121]">${(formData.quantity * formData.unitCost).toFixed(2)}</span></p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

const mockOrders = [
  {
    orderId: 'RPO-001',
    sku: 'SKU-1024',
    vendorId: 'VENDOR-001',
    quantity: 500,
    pricing: { unitCost: 25, totalCost: 12500, finalTotal: 12500 },
    orderStatus: 'approved',
    timeline: { createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    delivery: { estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    paymentInfo: { status: 'unpaid', method: 'COD' }
  },
  {
    orderId: 'RPO-002',
    sku: 'SKU-1025',
    vendorId: 'VENDOR-002',
    quantity: 300,
    pricing: { unitCost: 45, totalCost: 13500, finalTotal: 13500 },
    orderStatus: 'pending_approval',
    timeline: { createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    delivery: { estimatedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },
    paymentInfo: { status: 'unpaid', method: 'NET-30' }
  },
  {
    orderId: 'RPO-003',
    sku: 'SKU-1026',
    vendorId: 'VENDOR-001',
    quantity: 200,
    pricing: { unitCost: 35, totalCost: 7000, finalTotal: 7000 },
    orderStatus: 'shipped',
    timeline: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    delivery: { trackingNumber: 'TRK-2024-1001', estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    paymentInfo: { status: 'partial', method: 'prepaid' }
  },
];
