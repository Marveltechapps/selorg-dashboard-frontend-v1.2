import React, { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Truck, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { transferOrderApi } from '../../../api/merch/warehouseApi';
import { toast } from 'sonner';

interface TransferOrder {
  transferId: string;
  referenceNumber: string;
  status: 'DRAFT' | 'APPROVED' | 'SHIPPED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  sourceWarehouse: { warehouseName: string };
  destinationWarehouse: { warehouseName: string };
  items: Array<{ sku: string; quantityRequested: number }>;
  totalValue: number;
  timeline: {
    createdDate: string;
    shipmentDate?: string;
    expectedDeliveryDate?: string;
    actualDeliveryDate?: string;
  };
  shippingInfo: {
    carrier?: string;
    trackingNumber?: string;
  };
}

export function TransferOrdersManagement({ searchQuery = "" }: { searchQuery?: string }) {
  const [transferOrders, setTransferOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TransferOrder | null>(null);

  useEffect(() => {
    loadTransferOrders();
  }, []);

  const loadTransferOrders = async () => {
    try {
      setLoading(true);
      const data = await transferOrderApi.getAllTransferOrders();
      setTransferOrders(data?.data || mockTransferOrders);
    } catch (error) {
      console.error('Error loading transfer orders:', error);
      setTransferOrders(mockTransferOrders);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = transferOrders.filter(o => {
    const matchesSearch = o.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800';
      case 'RECEIVED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'NORMAL':
        return 'text-blue-600';
      case 'LOW':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return <Truck size={14} className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const stats = {
    total: transferOrders.length,
    pending: transferOrders.filter(o => ['DRAFT', 'APPROVED'].includes(o.status)).length,
    inTransit: transferOrders.filter(o => ['SHIPPED', 'IN_TRANSIT'].includes(o.status)).length,
    completed: transferOrders.filter(o => o.status === 'RECEIVED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transfer Orders</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Transfer
        </button>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Total Orders</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">In Transit</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.inTransit}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Completed</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} />
          <h3 className="font-semibold">Filter by Status</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'DRAFT', 'APPROVED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded text-sm transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'all' ? 'All Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Transfer Orders Table */}
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Reference #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Route</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No transfer orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.transferId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{order.referenceNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>{order.sourceWarehouse?.warehouseName || 'N/A'} → {order.destinationWarehouse?.warehouseName || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">${order.totalValue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${getPriorityColor(order.priority)}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedOrder.referenceNumber}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">From</p>
                  <p className="font-semibold">{selectedOrder.sourceWarehouse?.warehouseName}</p>
                </div>
                <div>
                  <p className="text-gray-600">To</p>
                  <p className="font-semibold">{selectedOrder.destinationWarehouse?.warehouseName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Status</p>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-600">Priority</p>
                  <span className={`font-semibold ${getPriorityColor(selectedOrder.priority)}`}>
                    {selectedOrder.priority}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-gray-600 mb-2">Items</p>
                <div className="bg-gray-50 rounded p-2 space-y-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{item.sku}</span>
                      <span className="font-semibold">{item.quantityRequested} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-gray-600">Total Value</p>
                <p className="text-lg font-bold">${selectedOrder.totalValue.toLocaleString()}</p>
              </div>

              {selectedOrder.shippingInfo?.carrier && (
                <div>
                  <p className="text-gray-600">Carrier</p>
                  <p className="font-semibold">{selectedOrder.shippingInfo.carrier}</p>
                  {selectedOrder.shippingInfo.trackingNumber && (
                    <p className="text-xs text-gray-600">Track: {selectedOrder.shippingInfo.trackingNumber}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success('Transfer order updated');
                  setSelectedOrder(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Transfer Order</h2>
            <div className="space-y-3">
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Source Warehouse</option>
                <option>DC Main</option>
                <option>Hub Northeast</option>
              </select>
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Destination Warehouse</option>
                <option>Store NYC-1</option>
                <option>Hub Chicago</option>
              </select>
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Priority</option>
                <option>URGENT</option>
                <option>HIGH</option>
                <option>NORMAL</option>
                <option>LOW</option>
              </select>
              <input
                type="number"
                placeholder="Quantity"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Transfer order created successfully');
                  setShowCreateModal(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mockTransferOrders: TransferOrder[] = [
  {
    transferId: 'TO-001',
    referenceNumber: 'TRF-20240501',
    status: 'RECEIVED',
    priority: 'HIGH',
    sourceWarehouse: { warehouseName: 'Main DC' },
    destinationWarehouse: { warehouseName: 'Northeast Hub' },
    items: [{ sku: 'SKU-001', quantityRequested: 500 }],
    totalValue: 15000,
    timeline: {
      createdDate: '2024-05-01',
      shipmentDate: '2024-05-02',
      expectedDeliveryDate: '2024-05-05',
      actualDeliveryDate: '2024-05-05',
    },
    shippingInfo: { carrier: 'FedEx', trackingNumber: 'TRACK-123456' },
  },
  {
    transferId: 'TO-002',
    referenceNumber: 'TRF-20240509',
    status: 'IN_TRANSIT',
    priority: 'NORMAL',
    sourceWarehouse: { warehouseName: 'Northeast Hub' },
    destinationWarehouse: { warehouseName: 'Manhattan Store' },
    items: [{ sku: 'SKU-002', quantityRequested: 200 }],
    totalValue: 8000,
    timeline: {
      createdDate: '2024-05-09',
      shipmentDate: '2024-05-10',
      expectedDeliveryDate: '2024-05-12',
    },
    shippingInfo: { carrier: 'UPS', trackingNumber: 'TRACK-789012' },
  },
  {
    transferId: 'TO-003',
    referenceNumber: 'TRF-20240511',
    status: 'APPROVED',
    priority: 'URGENT',
    sourceWarehouse: { warehouseName: 'Main DC' },
    destinationWarehouse: { warehouseName: 'Chicago Hub' },
    items: [{ sku: 'SKU-003', quantityRequested: 1000 }],
    totalValue: 25000,
    timeline: { createdDate: '2024-05-11' },
    shippingInfo: {},
  },
];
