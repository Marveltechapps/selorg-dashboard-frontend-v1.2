import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  fetchProductionOverview,
  assignWorkOrderOperator,
  updateWorkOrderStatus,
  type WorkOrder,
} from '../../../api/productionApi';
import { useProductionFactory } from '../../../contexts/ProductionFactoryContext';

export function WorkOrders() {
  const { selectedFactoryId } = useProductionFactory();
  const [orderFormMode, setOrderFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<WorkOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<WorkOrder | null>(null);
  const [assignOperatorName, setAssignOperatorName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedFactoryId) {
        setOrders([]);
        setLineOptions([]);
        return;
      }
      const [data, overview] = await Promise.all([
        fetchWorkOrders(undefined, selectedFactoryId),
        fetchProductionOverview(selectedFactoryId).catch(() => ({ lines: [] })),
      ]);
      setOrders(data ?? []);
      const lines = (overview.lines ?? []).map((l) => l.name).filter(Boolean);
      setLineOptions(lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFactoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const emptyOrderForm = () => ({
    product: '',
    quantity: '',
    line: '',
    operator: '',
    priority: 'medium' as WorkOrder['priority'],
    status: 'pending' as WorkOrder['status'],
    dueDate: '',
  });

  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  const openCreateOrder = () => {
    setEditingOrderId(null);
    setOrderForm(emptyOrderForm());
    setOrderFormMode('create');
  };

  const openEditOrder = (order: WorkOrder) => {
    setEditingOrderId(order.id);
    setOrderForm({
      product: order.product,
      quantity: String(order.quantity),
      line: order.line || '',
      operator: order.operator || '',
      priority: order.priority,
      status: order.status,
      dueDate: order.dueDate || '',
    });
    setOrderFormMode('edit');
    setShowDetailsModal(null);
  };

  const closeOrderForm = () => {
    setOrderFormMode(null);
    setEditingOrderId(null);
    setOrderForm(emptyOrderForm());
  };

  const saveOrderForm = async () => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    if (!orderForm.product.trim() || !orderForm.quantity) {
      toast.error('Product and quantity are required');
      return;
    }
    const quantity = parseInt(orderForm.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const payload = {
      product: orderForm.product.trim(),
      quantity,
      line: orderForm.line.trim() || undefined,
      operator: orderForm.operator.trim() || undefined,
      priority: orderForm.priority,
      status: orderForm.status,
      dueDate: orderForm.dueDate || undefined,
    };

    setSavingOrder(true);
    try {
      if (orderFormMode === 'create') {
        await createWorkOrder(payload, selectedFactoryId);
        toast.success('Work order created');
      } else if (orderFormMode === 'edit' && editingOrderId) {
        await updateWorkOrder(editingOrderId, payload, selectedFactoryId);
        toast.success('Work order updated');
      }
      closeOrderForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save work order');
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete || !selectedFactoryId) return;
    setSavingOrder(true);
    try {
      await deleteWorkOrder(orderToDelete.id, selectedFactoryId);
      toast.success('Work order deleted');
      setOrderToDelete(null);
      if (showDetailsModal?.id === orderToDelete.id) setShowDetailsModal(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete work order');
    } finally {
      setSavingOrder(false);
    }
  };

  const updateStatus = async (id: string, newStatus: WorkOrder['status']) => {
    try {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      await updateWorkOrderStatus(id, newStatus, selectedFactoryId);
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
      if (!selectedFactoryId) throw new Error('Select a factory first');
      await assignWorkOrderOperator(showAssignModal.id, operator, selectedFactoryId);
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
              type="button"
              onClick={openCreateOrder}
              disabled={!selectedFactoryId}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <td colSpan={8} className="px-6 py-8 text-center text-[#757575]">
                  {!selectedFactoryId
                    ? 'Select a factory to view work orders.'
                    : 'No work orders yet. Create your first order.'}
                </td>
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
                  <div className="flex justify-end items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditOrder(order)}
                      className="p-1.5 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg"
                      aria-label={`Edit ${order.orderNumber}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 text-[#EF4444] hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                      aria-label={`Delete ${order.orderNumber}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDetailsModal(order)}
                      className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs px-1"
                    >
                      View
                    </button>
                    {order.status === 'pending' && !order.operator && (
                      <button
                        type="button"
                        onClick={() => openAssignModal(order)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs px-1"
                      >
                        Assign
                      </button>
                    )}
                    {order.status === 'in-progress' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="text-green-600 hover:text-green-700 font-medium text-xs px-1"
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

      {/* Create / Edit Modal */}
      {orderFormMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#212121]">
                {orderFormMode === 'create' ? 'Create Work Order' : 'Edit Work Order'}
              </h3>
              <button type="button" onClick={closeOrderForm} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input
                  type="text"
                  placeholder="e.g., Organic Oats"
                  value={orderForm.product}
                  onChange={(e) => setOrderForm({ ...orderForm, product: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Quantity</label>
                <input
                  type="number"
                  min={1}
                  placeholder="5000"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Production Line (Optional)</label>
                <select
                  value={orderForm.line}
                  onChange={(e) => setOrderForm({ ...orderForm, line: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Unassigned</option>
                  {lineOptions.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Operator (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., John Smith"
                  value={orderForm.operator}
                  onChange={(e) => setOrderForm({ ...orderForm, operator: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Priority</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, priority: e.target.value as WorkOrder['priority'] })
                    }
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Status</label>
                  <select
                    value={orderForm.status}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, status: e.target.value as WorkOrder['status'] })
                    }
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Due Date</label>
                <input
                  type="date"
                  value={orderForm.dueDate}
                  onChange={(e) => setOrderForm({ ...orderForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={closeOrderForm}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveOrderForm}
                disabled={savingOrder}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-60 flex items-center gap-2"
              >
                {savingOrder && <Loader2 size={16} className="animate-spin" />}
                {orderFormMode === 'create' ? 'Create Order' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-[#212121] mb-2">Delete work order?</h3>
            <p className="text-sm text-[#757575] mb-6">
              This will permanently remove{' '}
              <span className="font-medium text-[#212121]">{orderToDelete.orderNumber}</span> (
              {orderToDelete.product}).
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={savingOrder}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] disabled:opacity-60 flex items-center gap-2"
              >
                {savingOrder && <Loader2 size={16} className="animate-spin" />}
                Delete
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
                  <span className="text-xs text-[#757575]">Status</span>
                  <p className="font-bold text-[#212121] capitalize">{showDetailsModal.status}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-[#757575]">Due Date</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.dueDate || '—'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3">
              <button
                type="button"
                onClick={() => openEditOrder(showDetailsModal)}
                className="flex-1 px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center justify-center gap-2"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(null);
                  setOrderToDelete(showDetailsModal);
                }}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}