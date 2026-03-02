import React, { useState, useEffect } from 'react';
import { ArrowUpFromLine, ShoppingCart, Box, Truck, X, Download, Search, Plus, CheckCircle, Package, ScanLine, MapPin, Clock, User, List, Zap, Users, Route, Target } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { fetchPicklists, fetchPickers, assignPickerToOrder as apiAssignPicker, fetchBatches, createBatch as apiCreateBatch, fetchMultiOrderPicks, fetchRoutes, optimizeRoute as apiOptimizeRoute, PicklistOrder, PickerAssignment, BatchOrder, MultiOrderPick, RouteOptimization } from './warehouseApi';

export function OutboundOps() {
  const [activeTab, setActiveTab] = useState<'auto-picklist' | 'manual-picklist' | 'batch-picking' | 'multi-order' | 'route-optimization' | 'picker-assignment'>('auto-picklist');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [picklists, setPicklists] = useState<PicklistOrder[]>([]);
  const [pickers, setPickers] = useState<PickerAssignment[]>([]);
  const [batchOrders, setBatchOrders] = useState<BatchOrder[]>([]);
  const [multiOrderPicks, setMultiOrderPicks] = useState<MultiOrderPick[]>([]);
  const [routes, setRoutes] = useState<RouteOptimization[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPickUpdateModal, setShowPickUpdateModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);
  const [showPickerOrdersModal, setShowPickerOrdersModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PicklistOrder | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchOrder | null>(null);
  const [selectedPick, setSelectedPick] = useState<MultiOrderPick | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOptimization | null>(null);
  const [selectedPicker, setSelectedPicker] = useState<PickerAssignment | null>(null);
  const [pickUpdateQty, setPickUpdateQty] = useState('');
  
  // Filter picklists into auto and manual based on type or status
  const autoPicklists = picklists.filter(p => !p.picker || p.status === 'pending' || p.status === 'queued');
  const manualPicklists = picklists.filter(p => p.picker || p.status === 'assigned' || p.status === 'picking');

  useEffect(() => {
    loadData();
    // Real-time polling for picklist and batch status
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'auto-picklist' || activeTab === 'manual-picklist') {
        const [pData, pickersData] = await Promise.all([fetchPicklists(), fetchPickers()]);
        setPicklists(pData);
        setPickers(pickersData);
      } else if (activeTab === 'batch-picking') {
        const bData = await fetchBatches();
        setBatchOrders(bData);
      } else if (activeTab === 'multi-order') {
        const mData = await fetchMultiOrderPicks();
        setMultiOrderPicks(mData);
      } else if (activeTab === 'route-optimization') {
        const rData = await fetchRoutes();
        setRoutes(rData);
      } else if (activeTab === 'picker-assignment') {
        const pData = await fetchPickers();
        setPickers(pData);
      }
    } catch (error) {
      toast.error('Failed to load outbound data');
    } finally {
      setLoading(false);
    }
  };

  const assignPicker = async (orderId: string, pickerName: string) => {
    try {
      await apiAssignPicker(orderId, pickerName);
      toast.success('Picker assigned successfully');
      setShowAssignModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to assign picker');
    }
  };

  const createBatch = async () => {
    try {
      await apiCreateBatch({
        zone: 'Zone A',
        status: 'preparing'
      });
      toast.success('New batch created');
      setShowBatchModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create batch');
    }
  };

  const optimizeRoute = async (routeId: string) => {
    try {
      await apiOptimizeRoute(routeId);
      toast.success('Route optimized successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to optimize route');
    }
  };

  const assignOrderToPicker = (pickerId: string) => {
    setPickers(pickers.map(p => 
      p.id === pickerId ? { ...p, activeOrders: p.activeOrders + 1, status: 'busy' as const } : p
    ));
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'auto-picklist') {
      csvData = [
        ['Auto Picklist Report', `Date: ${today}`],
        [''],
        ['Order ID', 'Customer', 'Items', 'Priority', 'Status', 'Picker', 'Zone'],
        ...autoPicklists.map(o => [o.orderId, o.customer, o.items, o.priority, o.status, o.picker || 'Unassigned', o.zone || 'N/A']),
      ];
    } else if (activeTab === 'manual-picklist') {
      csvData = [
        ['Manual Picklist Report', `Date: ${today}`],
        [''],
        ['Order ID', 'Customer', 'Items', 'Priority', 'Status', 'Picker', 'Zone'],
        ...manualPicklists.map(o => [o.orderId, o.customer, o.items, o.priority, o.status, o.picker || 'Unassigned', o.zone || 'N/A']),
      ];
    } else if (activeTab === 'batch-picking') {
      csvData = [
        ['Batch Picking Report', `Date: ${today}`],
        [''],
        ['Batch ID', 'Order Count', 'Total Items', 'Picker', 'Status', 'Progress %'],
        ...batchOrders.map(b => [b.batchId, b.orderCount, b.totalItems, b.picker, b.status, b.progress]),
      ];
    } else if (activeTab === 'multi-order') {
      csvData = [
        ['Multi-Order Picking Report', `Date: ${today}`],
        [''],
        ['Pick ID', 'Orders', 'SKU', 'Product', 'Location', 'Total Qty', 'Picked Qty', 'Status'],
        ...multiOrderPicks.map(m => [m.pickId, m.orders.join('; '), m.sku, m.productName, m.location, m.totalQty, m.pickedQty, m.status]),
      ];
    } else if (activeTab === 'route-optimization') {
      csvData = [
        ['Route Optimization Report', `Date: ${today}`],
        [''],
        ['Route ID', 'Picker', 'Stops', 'Distance', 'Est. Time', 'Status', 'Efficiency %'],
        ...routes.map(r => [r.routeId, r.picker, r.stops, r.distance, r.estimatedTime, r.status, r.efficiency]),
      ];
    } else {
      csvData = [
        ['Picker Assignment Report', `Date: ${today}`],
        [''],
        ['Picker ID', 'Name', 'Zone', 'Active Orders', 'Completed Today', 'Pick Rate', 'Status'],
        ...pickers.map(p => [p.pickerId, p.pickerName, p.zone, p.activeOrders, p.completedToday, p.pickRate, p.status]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pick-pack-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const updateOrderStatus = (orderId: string, status: 'pending' | 'assigned' | 'picking' | 'completed', isAuto: boolean = true) => {
    setPicklists(picklists.map(o =>
      o.id === orderId ? { ...o, status } : o
    ));
  };

  const startPicking = (orderId: string, isAuto: boolean = true) => {
    updateOrderStatus(orderId, 'picking', isAuto);
  };

  const completeOrder = (orderId: string, isAuto: boolean = true) => {
    updateOrderStatus(orderId, 'completed', isAuto);
  };

  const updateBatchProgress = (batchId: string, newProgress: number) => {
    setBatchOrders(batchOrders.map(b => 
      b.id === batchId ? { 
        ...b, 
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : b.status
      } : b
    ));
  };

  const updatePickQuantity = () => {
    if (selectedPick && pickUpdateQty) {
      const qty = parseInt(pickUpdateQty);
      setMultiOrderPicks(multiOrderPicks.map(p => 
        p.id === selectedPick.id ? { 
          ...p, 
          pickedQty: qty,
          status: qty >= p.totalQty ? 'completed' : qty > 0 ? 'in-progress' : 'pending'
        } : p
      ));
      setShowPickUpdateModal(false);
      setPickUpdateQty('');
      setSelectedPick(null);
    }
  };

  const completeRoute = (routeId: string) => {
    setRoutes(routes.map(r => 
      r.id === routeId ? { ...r, status: 'completed' as const } : r
    ));
  };

  const updatePickerStatus = (pickerId: string, newStatus: 'available' | 'busy' | 'break') => {
    setPickers(pickers.map(p => 
      p.id === pickerId ? { ...p, status: newStatus } : p
    ));
  };

  const filteredAutoPicklists = autoPicklists.filter(o => 
    o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredManualPicklists = manualPicklists.filter(o => 
    o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBatchOrders = batchOrders.filter(b =>
    b.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.picker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMultiOrders = multiOrderPicks.filter(m =>
    m.pickId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoutes = routes.filter(r =>
    r.routeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.picker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPickers = pickers.filter(p =>
    p.pickerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pickerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && picklists.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pick & Pack Operations"
        subtitle="Advanced picking strategies and workforce optimization"
      />
      <div className="flex justify-between items-center">
        <div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
          {activeTab === 'batch-picking' && (
            <button 
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Create Batch
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <List size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B]">{autoPicklists.length}</h3>
          <p className="text-xs text-[#64748B]">Auto Picklists</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Zap size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B]">{manualPicklists.length}</h3>
          <p className="text-xs text-[#64748B]">Manual Picklists</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Package size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B]">{batchOrders.length}</h3>
          <p className="text-xs text-[#64748B]">Active Batches</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Route size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B]">{routes.filter(r => r.status === 'active').length}</h3>
          <p className="text-xs text-[#64748B]">Active Routes</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Users size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B]">{pickers.filter(p => p.status === 'busy').length}</h3>
          <p className="text-xs text-[#64748B]">Active Pickers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => { setActiveTab('auto-picklist'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'auto-picklist' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Auto Picklist
        </button>
        <button
          onClick={() => { setActiveTab('manual-picklist'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'manual-picklist' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Manual Picklist
        </button>
        <button
          onClick={() => { setActiveTab('batch-picking'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'batch-picking' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Batch Picking
        </button>
        <button
          onClick={() => { setActiveTab('multi-order'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'multi-order' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Multi Order
        </button>
        <button
          onClick={() => { setActiveTab('route-optimization'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'route-optimization' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Route Optimization
        </button>
        <button
          onClick={() => { setActiveTab('picker-assignment'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'picker-assignment' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Picker Assignment
        </button>
      </div>

      {/* Auto Picklist Tab */}
      {activeTab === 'auto-picklist' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Automatically Generated Picklists</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">AUTO MODE</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search order or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Zone</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Picker</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAutoPicklists.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                      No auto picklist orders yet.
                    </td>
                  </tr>
                )}
                {filteredAutoPicklists.map(order => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{order.orderId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{order.customer}</td>
                    <td className="px-6 py-4 text-[#64748B]">{order.items} items</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.priority === 'urgent' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        order.priority === 'high' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{order.zone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        order.status === 'picking' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        order.status === 'assigned' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{order.picker || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetailsModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Picklist Tab */}
      {activeTab === 'manual-picklist' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Manual Picklist Assignment</h3>
              <span className="text-xs text-[#64748B]">Manually assign orders to pickers</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search order or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Zone</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Picker</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredManualPicklists.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                      No manual picklist orders. Assign pickers to see orders here.
                    </td>
                  </tr>
                )}
                {filteredManualPicklists.map(order => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{order.orderId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{order.customer}</td>
                    <td className="px-6 py-4 text-[#64748B]">{order.items} items</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.priority === 'urgent' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        order.priority === 'high' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{order.zone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        order.status === 'picking' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        order.status === 'assigned' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{order.picker || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowAssignModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Assign Picker
                        </button>
                      )}
                      {order.status !== 'pending' && (
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailsModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Picking Tab */}
      {activeTab === 'batch-picking' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Batch Picking Operations</h3>
              <span className="text-xs text-[#64748B]">Pick multiple orders simultaneously</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search batch or picker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Batch ID</th>
                  <th className="px-6 py-3">Order Count</th>
                  <th className="px-6 py-3">Total Items</th>
                  <th className="px-6 py-3">Picker</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredBatchOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#64748B]">
                      No batches yet. Click &quot;Create Batch&quot; to create a new picking batch.
                    </td>
                  </tr>
                )}
                {filteredBatchOrders.map(batch => (
                  <tr key={batch.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{batch.batchId}</td>
                    <td className="px-6 py-4 text-[#64748B]">{batch.orderCount} orders</td>
                    <td className="px-6 py-4 text-[#64748B]">{batch.totalItems} items</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{batch.picker}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-[#E2E8F0] rounded-full h-2">
                          <div 
                            className="bg-[#0891b2] h-2 rounded-full"
                            style={{ width: `${batch.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-[#64748B]">{batch.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        batch.status === 'picking' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedBatch(batch);
                          setShowBatchDetailsModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi Order Tab */}
      {activeTab === 'multi-order' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Multi-Order Picking</h3>
              <span className="text-xs text-[#64748B]">Consolidated picks across multiple orders</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search pick, SKU, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Pick ID</th>
                  <th className="px-6 py-3">Orders</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Total Qty</th>
                  <th className="px-6 py-3">Picked Qty</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredMultiOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                      No multi-order picks. Consolidated picks will appear when orders share locations.
                    </td>
                  </tr>
                )}
                {filteredMultiOrders.map(pick => (
                  <tr key={pick.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{pick.pickId}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {pick.orders.slice(0, 2).map((orderId, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-mono">
                            {orderId}
                          </span>
                        ))}
                        {pick.orders.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                            +{pick.orders.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[#1E293B]">{pick.productName}</p>
                        <p className="text-xs text-[#64748B]">{pick.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <MapPin size={14} />
                        <span className="font-mono text-xs">{pick.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{pick.totalQty}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        pick.pickedQty >= pick.totalQty ? 'text-green-600' :
                        pick.pickedQty > 0 ? 'text-amber-600' :
                        'text-[#64748B]'
                      }`}>
                        {pick.pickedQty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pick.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        pick.status === 'in-progress' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {pick.status === 'in-progress' ? 'In Progress' :
                         pick.status.charAt(0).toUpperCase() + pick.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedPick(pick);
                          setShowPickUpdateModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Route Optimization Tab */}
      {activeTab === 'route-optimization' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Route Optimization</h3>
              <span className="text-xs text-[#64748B]">AI-optimized picking routes</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search route or picker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Route ID</th>
                  <th className="px-6 py-3">Picker</th>
                  <th className="px-6 py-3">Stops</th>
                  <th className="px-6 py-3">Distance</th>
                  <th className="px-6 py-3">Est. Time</th>
                  <th className="px-6 py-3">Efficiency</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRoutes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                      No active routes. Routes appear when pickers have assigned orders.
                    </td>
                  </tr>
                )}
                {filteredRoutes.map(route => (
                  <tr key={route.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{route.routeId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{route.picker}</td>
                    <td className="px-6 py-4 text-[#64748B]">{route.stops} stops</td>
                    <td className="px-6 py-4 text-[#64748B]">{route.distance}</td>
                    <td className="px-6 py-4 text-[#64748B]">{route.estimatedTime}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[#E2E8F0] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              route.efficiency >= 90 ? 'bg-green-500' :
                              route.efficiency >= 75 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${route.efficiency}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-[#64748B]">{route.efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        route.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        route.status === 'active' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {route.status === 'planned' && (
                        <button 
                          onClick={() => optimizeRoute(route.id)}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Start Route
                        </button>
                      )}
                      {route.status !== 'planned' && (
                        <button 
                          onClick={() => {
                            setSelectedRoute(route);
                            setShowRouteMapModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          View Map
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Picker Assignment Tab */}
      {activeTab === 'picker-assignment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPickers.length === 0 && (
            <div className="col-span-full text-center py-12 text-[#64748B]">
              No pickers available. Add staff with Picker role to see assignments.
            </div>
          )}
          {filteredPickers.map(picker => (
            <div 
              key={picker.id}
              className={`bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                picker.status === 'busy' ? 'border-blue-300 ring-2 ring-blue-100' :
                picker.status === 'available' ? 'border-green-300 ring-2 ring-green-100' :
                'border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1E293B]">{picker.pickerName ?? picker.name}</h3>
                  <p className="text-xs text-[#64748B] font-mono">{picker.pickerId ?? picker.id}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  picker.status === 'busy' ? 'bg-blue-100 text-blue-700' :
                  picker.status === 'available' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {picker.status.charAt(0).toUpperCase() + picker.status.slice(1)}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Zone</span>
                  <span className="font-medium text-[#1E293B]">{picker.zone}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Active Orders</span>
                  <span className="font-bold text-blue-600">{picker.activeOrders ?? picker.currentOrders ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Completed Today</span>
                  <span className="font-bold text-green-600">{picker.completedToday ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Pick Rate</span>
                  <span className="font-medium text-[#1E293B]">{picker.pickRate ?? 0}/hr</span>
                </div>
                
                <div className="pt-3 border-t border-[#E2E8F0]">
                  {picker.status === 'available' && (
                    <button 
                      onClick={() => assignOrderToPicker(picker.id)}
                      className="w-full py-2 bg-[#0891b2] text-white rounded-lg text-sm font-bold hover:bg-[#06b6d4]"
                    >
                      Assign Order
                    </button>
                  )}
                  {picker.status === 'busy' && (
                    <button 
                      onClick={() => {
                        setSelectedPicker(picker);
                        setShowPickerOrdersModal(true);
                      }}
                      className="w-full py-2 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-lg text-sm font-bold hover:bg-[#F8FAFC]"
                    >
                      View Orders
                    </button>
                  )}
                  {picker.status === 'break' && (
                    <div className="text-center py-2 text-sm text-[#64748B]">
                      <Clock size={16} className="inline mr-1" />
                      On Break
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Picker Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Assign Picker</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">Order: <span className="font-mono font-bold">{selectedOrder.orderId}</span></p>
                <p className="text-sm text-blue-700">Customer: <span className="font-bold">{selectedOrder.customer}</span></p>
                <p className="text-sm text-blue-700">Items: <span className="font-bold">{selectedOrder.items}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Select Picker</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pickers.filter(p => p.status !== 'break').map(picker => (
                    <button
                      key={picker.id}
                      onClick={() => assignPicker(selectedOrder.id, (picker.pickerName ?? picker.name) ?? '')}
                      className="w-full flex items-center justify-between p-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-left"
                    >
                      <div>
                        <p className="font-medium text-[#1E293B]">{picker.pickerName ?? picker.name}</p>
                        <p className="text-xs text-[#64748B]">{picker.zone} • {(picker.activeOrders ?? picker.currentOrders) ?? 0} active orders</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        picker.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {picker.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create New Batch</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700 mb-2">The system will automatically:</p>
                <ul className="text-xs text-purple-600 space-y-1 list-disc list-inside">
                  <li>Select optimal orders for batching</li>
                  <li>Group by zone and product similarity</li>
                  <li>Assign to available picker</li>
                  <li>Generate optimized pick sequence</li>
                </ul>
              </div>
              <div>
                <p className="text-sm text-[#64748B] mb-2">Estimated batch size: <span className="font-bold text-[#1E293B]">8-12 orders</span></p>
                <p className="text-sm text-[#64748B]">Estimated items: <span className="font-bold text-[#1E293B]">96-144 items</span></p>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createBatch}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Pick Quantity Modal */}
      {showPickUpdateModal && selectedPick && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Update Pick Quantity</h3>
              <button onClick={() => setShowPickUpdateModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">Pick ID: <span className="font-mono font-bold">{selectedPick.pickId}</span></p>
                <p className="text-sm text-blue-700">Product: <span className="font-bold">{selectedPick.productName}</span></p>
                <p className="text-sm text-blue-700">Location: <span className="font-bold">{selectedPick.location}</span></p>
                <p className="text-sm text-blue-700">Total Qty: <span className="font-bold">{selectedPick.totalQty}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Enter Picked Quantity</label>
                <input 
                  type="number"
                  value={pickUpdateQty}
                  onChange={(e) => setPickUpdateQty(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowPickUpdateModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={updatePickQuantity}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Update Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Order Details - {selectedOrder.orderId}</h3>
              <button onClick={() => setShowOrderDetailsModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Order ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Customer</label>
                  <p className="font-bold text-[#1E293B]">{selectedOrder.customer}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Items</label>
                  <p className="font-bold text-[#1E293B]">{selectedOrder.items} items</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Priority</label>
                  <p className="font-bold text-[#1E293B]">{selectedOrder.priority.charAt(0).toUpperCase() + selectedOrder.priority.slice(1)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Zone</label>
                  <p className="font-bold text-[#1E293B]">{selectedOrder.zone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className="font-bold text-[#1E293B]">{selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}</p>
                </div>
                {selectedOrder.picker && (
                  <div>
                    <label className="text-xs text-[#64748B] font-medium">Picker</label>
                    <p className="font-bold text-[#1E293B]">{selectedOrder.picker}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowOrderDetailsModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showBatchDetailsModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Batch Details - {selectedBatch.batchId}</h3>
              <button onClick={() => setShowBatchDetailsModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Batch ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedBatch.batchId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Picker</label>
                  <p className="font-bold text-[#1E293B]">{selectedBatch.picker}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Order Count</label>
                  <p className="font-bold text-[#1E293B]">{selectedBatch.orderCount} orders</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Total Items</label>
                  <p className="font-bold text-[#1E293B]">{selectedBatch.totalItems} items</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className="font-bold text-[#1E293B]">{selectedBatch.status.charAt(0).toUpperCase() + selectedBatch.status.slice(1)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Progress</label>
                  <p className="font-bold text-[#1E293B]">{selectedBatch.progress}%</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748B] font-medium mb-2 block">Progress</label>
                <div className="w-full bg-[#E2E8F0] rounded-full h-3">
                  <div 
                    className="bg-[#0891b2] h-3 rounded-full"
                    style={{ width: `${selectedBatch.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowBatchDetailsModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Map Modal */}
      {showRouteMapModal && selectedRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Route Map - {selectedRoute.routeId}</h3>
              <button onClick={() => setShowRouteMapModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Route ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedRoute.routeId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Picker</label>
                  <p className="font-bold text-[#1E293B]">{selectedRoute.picker}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Stops</label>
                  <p className="font-bold text-[#1E293B]">{selectedRoute.stops}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Distance</label>
                  <p className="font-bold text-[#1E293B]">{selectedRoute.distance}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Estimated Time</label>
                  <p className="font-bold text-[#1E293B]">{selectedRoute.estimatedTime}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Efficiency</label>
                  <p className="font-bold text-[#1E293B]">{selectedRoute.efficiency}%</p>
                </div>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">Interactive Route Map</p>
                  <p className="text-sm text-gray-500 mt-2">Map visualization would be integrated here</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowRouteMapModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Picker Orders Modal */}
      {showPickerOrdersModal && selectedPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Orders for {selectedPicker.pickerName ?? selectedPicker.name}</h3>
              <button onClick={() => setShowPickerOrdersModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Picker ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedPicker.pickerId ?? selectedPicker.id}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Zone</label>
                  <p className="font-bold text-[#1E293B]">{selectedPicker.zone}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Active Orders</label>
                  <p className="font-bold text-blue-600">{selectedPicker.activeOrders ?? selectedPicker.currentOrders ?? 0}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Completed Today</label>
                  <p className="font-bold text-green-600">{selectedPicker.completedToday ?? 0}</p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Active Orders</h4>
                <div className="space-y-2">
                  {(autoPicklists.concat(manualPicklists)).filter(o => o.picker === (selectedPicker.pickerName ?? selectedPicker.name)).map(order => (
                    <div key={order.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#1E293B] font-mono">{order.orderId}</p>
                          <p className="text-sm text-[#64748B]">{order.customer} • {order.items} items</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'picking' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'assigned' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(autoPicklists.concat(manualPicklists)).filter(o => o.picker === (selectedPicker.pickerName ?? selectedPicker.name)).length === 0 && (
                    <p className="text-sm text-[#64748B] text-center py-4">No active orders</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowPickerOrdersModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}