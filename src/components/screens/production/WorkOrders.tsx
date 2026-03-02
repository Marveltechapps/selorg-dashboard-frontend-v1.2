import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Search, Filter, Download, X, Eye, Loader2 } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchWorkOrders,
  createWorkOrder,
  getWorkOrder,
  assignWorkOrderOperator,
  updateWorkOrderStatus,
  type WorkOrder,
} from '../../../api/productionApi';

export function WorkOrders() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<WorkOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<WorkOrder | null>(null);
  const [assignOperatorName, setAssignOperatorName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkOrders();
      setOrders(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [newOrder, setNewOrder] = useState({
    product: '',
    quantity: '',
    line: '',
    priority: 'medium' as const,
    dueDate: '',
  });

  const createOrder = async () => {
    if (!newOrder.product || !newOrder.quantity) {
      toast.error('Product and quantity are required');
      return;
    }
    try {
      await createWorkOrder({
        product: newOrder.product,
        quantity: parseInt(newOrder.quantity, 10) || 0,
        line: newOrder.line || undefined,
        priority: newOrder.priority,
        dueDate: newOrder.dueDate || undefined,
      });
      setNewOrder({ product: '', quantity: '', line: '', priority: 'medium', dueDate: '' });
      setShowCreateModal(false);
      toast.success('Work order created');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create work order');
    }
  };

  const updateStatus = async (id: string, newStatus: WorkOrder['status']) => {
    try {
      await updateWorkOrderStatus(id, newStatus);
      toast.success('Status updated');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const openAssignModal = (order: WorkOrder) => {
    setShowAssignModal(order);
    setAssignOperatorName(order.operator || '');
  };

  const handleAssignConfirm = async () => {
    if (!showAssignModal) return;
    const operator = assignOperatorName.trim();
    if (!operator) {
      toast.error('Enter operator name');
      return;
    }
    try {
      await assignWorkOrderOperator(showAssignModal.id, operator);
      setShowAssignModal(null);
      setAssignOperatorName('');
      toast.success('Operator assigned');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign operator');
    }
  };

  const exportOrders = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Work Orders Report', `Date: ${today}`],
      [''],
      ['Order Number', 'Product', 'Quantity', 'Line', 'Operator', 'Status', 'Priority', 'Due Date'],
      ...orders.map(o => [
        o.orderNumber,
        o.product,
        o.quantity.toString(),
        o.line || 'Unassigned',
        o.operator || 'Unassigned',
        o.status,
        o.priority,
        o.dueDate
      ]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredOrders = (orders ?? []).filter(o =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders & Job Cards"
        subtitle="Manage production orders and operator assignments"
        actions={
          <>
            <button 
              onClick={exportOrders}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              <Plus size={16} />
              Create Work Order
            </button>
          </>
        }
      />

      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-[#E0E0E0]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input 
            type="text" 
            placeholder="Search work orders, SKUs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <span className="text-xs text-[#757575] uppercase font-bold">Total Orders</span>
          <p className="text-2xl font-bold text-[#212121] mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <span className="text-xs text-[#757575] uppercase font-bold">In Progress</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{orders.filter(o => o.status === 'in-progress').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <span className="text-xs text-[#757575] uppercase font-bold">Pending</span>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <span className="text-xs text-[#757575] uppercase font-bold">Completed</span>
          <p className="text-2xl font-bold text-green-600 mt-1">{orders.filter(o => o.status === 'completed').length}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3">Order #</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Quantity</th>
              <th className="px-6 py-3">Line</th>
              <th className="px-6 py-3">Operator</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[#757575]">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[#EF4444]">{error}</td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[#757575]">No work orders yet. Create your first order.</td>
              </tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-[#FAFAFA]">
                <td className="px-6 py-4 font-mono font-medium text-[#212121]">{order.orderNumber}</td>
                <td className="px-6 py-4 text-[#616161]">{order.product}</td>
                <td className="px-6 py-4 text-[#212121]">{order.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#616161]">{order.line || '--'}</td>
                <td className="px-6 py-4 text-[#616161]">{order.operator || '--'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    order.priority === 'high' ? 'bg-red-100 text-red-700' :
                    order.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.priority.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                    order.status === 'in-progress' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                    order.status === 'on-hold' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                    'bg-[#FEF9C3] text-[#854D0E]'
                  }`}>
                    {order.status === 'in-progress' ? 'In Progress' : 
                     order.status === 'on-hold' ? 'On Hold' :
                     order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setShowDetailsModal(order)}
                      className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                    >
                      View
                    </button>
                    {order.status === 'pending' && !order.operator && (
                      <button 
                        onClick={() => openAssignModal(order)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                      >
                        Assign
                      </button>
                    )}
                    {order.status === 'in-progress' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="text-green-600 hover:text-green-700 font-medium text-xs"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Create Work Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input 
                  type="text"
                  placeholder="e.g., Organic Oats"
                  value={newOrder.product}
                  onChange={(e) => setNewOrder({...newOrder, product: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Quantity</label>
                <input 
                  type="number"
                  placeholder="5000"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Production Line (Optional)</label>
                <select 
                  value={newOrder.line}
                  onChange={(e) => setNewOrder({...newOrder, line: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Unassigned</option>
                  <option>Line A</option>
                  <option>Line B</option>
                  <option>Line C</option>
                  <option>Line D</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Priority</label>
                <select 
                  value={newOrder.priority}
                  onChange={(e) => setNewOrder({...newOrder, priority: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Due Date</label>
                <input 
                  type="date"
                  value={newOrder.dueDate}
                  onChange={(e) => setNewOrder({...newOrder, dueDate: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={createOrder}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D]"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Operator Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Assign Operator - {showAssignModal.orderNumber}</h3>
              <button onClick={() => { setShowAssignModal(null); setAssignOperatorName(''); }} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Operator Name</label>
                <input
                  type="text"
                  placeholder="e.g., John Smith"
                  value={assignOperatorName}
                  onChange={(e) => setAssignOperatorName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(null); setAssignOperatorName(''); }}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignConfirm}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D]"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Order {showDetailsModal.orderNumber}</h3>
              <button onClick={() => setShowDetailsModal(null)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#757575]">Product</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.product}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Quantity</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Line</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.line || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Operator</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.operator || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Priority</span>
                  <p className="font-bold text-[#212121] capitalize">{showDetailsModal.priority}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Due Date</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.dueDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}