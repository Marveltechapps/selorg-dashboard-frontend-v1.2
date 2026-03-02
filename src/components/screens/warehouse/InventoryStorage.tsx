import React, { useState, useEffect } from 'react';
import { Package, Grid, Layers, RefreshCw, Search, Download, X, Edit2, Plus, AlertTriangle, TrendingUp, TrendingDown, BarChart3, ClipboardCheck, ArrowRightLeft, Bell } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, InlineNotification } from '../../ui/ux-components';
import { toast } from 'sonner';
import { 
  fetchInventoryItems, 
  fetchStorageLocations, 
  fetchAdjustments, 
  createAdjustment as apiCreateAdjustment,
  fetchCycleCounts,
  createCycleCount as apiCreateCycleCount,
  startCycleCount as apiStartCycleCount,
  completeCycleCount as apiCompleteCycleCount,
  fetchInternalTransfers,
  createInternalTransfer as apiCreateInternalTransfer,
  updateTransferStatus as apiUpdateTransferStatus,
  fetchStockAlerts,
  InventoryItem,
  StorageLocation,
  Adjustment,
  CycleCount,
  InternalTransfer,
  StockAlert
} from './warehouseApi';

export function InventoryStorage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'stock-levels' | 'cycle-counts' | 'transfers' | 'alerts'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showCycleCountModal, setShowCycleCountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedAlertForReorder, setSelectedAlertForReorder] = useState<StockAlert | null>(null);
  
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [storage, setStorage] = useState<StorageLocation[]>([]);

  const [newAdjustment, setNewAdjustment] = useState({
    type: 'Cycle Count Adj.',
    sku: '',
    productName: '',
    change: '',
    reason: '',
  });

  const [newCycleCount, setNewCycleCount] = useState({
    zone: '',
    assignedTo: '',
    scheduledDate: '',
  });

  const [newTransfer, setNewTransfer] = useState({
    fromLocation: '',
    toLocation: '',
    sku: '',
    quantity: '',
  });

  const [newReorder, setNewReorder] = useState({
    sku: '',
    productName: '',
    currentStock: 0,
    minStock: 0,
    reorderQuantity: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    notes: '',
  });

  useEffect(() => {
    loadData();
    // Real-time polling for inventory alerts and transfers
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [locs, adjs, items, counts, alerts] = await Promise.all([
          fetchStorageLocations(),
          fetchAdjustments(),
          fetchInventoryItems(),
          fetchCycleCounts(),
          fetchStockAlerts()
        ]);
        setStorage(locs);
        setAdjustments(adjs);
        setInventoryItems(items);
        setCycleCounts(counts);
        setStockAlerts(alerts);
      } else if (activeTab === 'stock-levels') {
        const items = await fetchInventoryItems();
        setInventoryItems(items);
      } else if (activeTab === 'cycle-counts') {
        const counts = await fetchCycleCounts();
        setCycleCounts(counts);
      } else if (activeTab === 'transfers') {
        const trfs = await fetchInternalTransfers();
        setTransfers(trfs);
      } else if (activeTab === 'alerts') {
        const alerts = await fetchStockAlerts();
        setStockAlerts(alerts);
      }
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const createAdjustment = async () => {
    if (newAdjustment.sku && newAdjustment.change) {
      try {
        await apiCreateAdjustment({
          sku: newAdjustment.sku,
          change: parseInt(newAdjustment.change),
          reason: newAdjustment.reason,
          type: newAdjustment.type
        });
        toast.success('Adjustment created successfully');
        setShowAdjustmentModal(false);
        setNewAdjustment({ type: 'Cycle Count Adj.', sku: '', productName: '', change: '', reason: '' });
        loadData();
      } catch (error: any) {
        toast.error(error.message || 'Failed to create adjustment');
      }
    }
  };

  const startCycleCount = async (id: string) => {
    try {
      await apiStartCycleCount(id);
      toast.success('Cycle count started');
      loadData();
    } catch (error) {
      toast.error('Failed to start cycle count');
    }
  };

  const completeCycleCount = async (id: string) => {
    try {
      await apiCompleteCycleCount(id);
      toast.success('Cycle count completed');
      loadData();
    } catch (error) {
      toast.error('Failed to complete cycle count');
    }
  };

  const createCycleCount = async () => {
    if (newCycleCount.zone && newCycleCount.assignedTo && newCycleCount.scheduledDate) {
      try {
        await apiCreateCycleCount({
          zone: newCycleCount.zone,
          assignedTo: newCycleCount.assignedTo,
          scheduledDate: newCycleCount.scheduledDate
        });
        toast.success('Cycle count scheduled successfully');
        setShowCycleCountModal(false);
        setNewCycleCount({ zone: '', assignedTo: '', scheduledDate: '' });
        loadData();
      } catch (error) {
        toast.error('Failed to schedule cycle count');
      }
    }
  };

  const createTransfer = async () => {
    if (newTransfer.fromLocation && newTransfer.toLocation && newTransfer.sku && newTransfer.quantity) {
      try {
        await apiCreateInternalTransfer({
          fromLocation: newTransfer.fromLocation,
          toLocation: newTransfer.toLocation,
          sku: newTransfer.sku,
          quantity: parseInt(newTransfer.quantity)
        });
        toast.success('Internal transfer initiated');
        setShowTransferModal(false);
        setNewTransfer({ fromLocation: '', toLocation: '', sku: '', quantity: '' });
        loadData();
      } catch (error) {
        toast.error('Failed to initiate transfer');
      }
    }
  };

  const handleAdjustClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewAdjustment({
      type: 'Cycle Count Adj.',
      sku: item.sku,
      productName: item.productName,
      change: '',
      reason: '',
    });
    setShowAdjustmentModal(true);
  };

  const handleCreateReorder = (alert: StockAlert) => {
    const item = inventoryItems.find(i => i.sku === alert.sku);
    const suggestedQuantity = alert.type === 'out-of-stock' 
      ? alert.threshold * 2 
      : alert.threshold - alert.currentLevel;
    
    setSelectedAlertForReorder(alert);
    setNewReorder({
      sku: alert.sku,
      productName: alert.productName,
      currentStock: alert.currentLevel,
      minStock: alert.threshold,
      reorderQuantity: suggestedQuantity.toString(),
      priority: alert.priority,
      notes: `Reorder for ${alert.type.replace('-', ' ')} alert`,
    });
    setShowReorderModal(true);
  };

  const createReorder = () => {
    if (newReorder.sku && newReorder.reorderQuantity) {
      // In a real app, this would call an API to create a purchase order/reorder request
      toast.success(`Reorder request created for ${newReorder.productName}`, {
        description: `Quantity: ${newReorder.reorderQuantity} units`,
      });
      
      // Update the alert if it was out of stock or low stock
      if (selectedAlertForReorder && (selectedAlertForReorder.type === 'out-of-stock' || selectedAlertForReorder.type === 'low-stock')) {
        setStockAlerts(stockAlerts.filter(a => a.id !== selectedAlertForReorder.id));
      }
      
      setNewReorder({
        sku: '',
        productName: '',
        currentStock: 0,
        minStock: 0,
        reorderQuantity: '',
        priority: 'medium',
        notes: '',
      });
      setShowReorderModal(false);
      setSelectedAlertForReorder(null);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'stock-levels') {
      csvData = [
        ['Stock Levels Report', `Date: ${today}`],
        [''],
        ['SKU', 'Product Name', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Location', 'Value'],
        ...inventoryItems.map(i => [i.sku, i.productName, i.category, i.currentStock, i.minStock, i.maxStock, i.location, i.value]),
      ];
    } else if (activeTab === 'cycle-counts') {
      csvData = [
        ['Cycle Counts Report', `Date: ${today}`],
        [''],
        ['Count ID', 'Zone', 'Assigned To', 'Scheduled Date', 'Status', 'Items Total', 'Items Counted', 'Discrepancies'],
        ...cycleCounts.map(c => [c.countId, c.zone, c.assignedTo, c.scheduledDate, c.status, c.itemsTotal, c.itemsCounted, c.discrepancies]),
      ];
    } else if (activeTab === 'transfers') {
      csvData = [
        ['Transfers Report', `Date: ${today}`],
        [''],
        ['Transfer ID', 'From', 'To', 'SKU', 'Product', 'Quantity', 'Status', 'Initiated By', 'Timestamp'],
        ...transfers.map(t => [t.transferId, t.fromLocation, t.toLocation, t.sku, t.productName, t.quantity, t.status, t.initiatedBy, t.timestamp]),
      ];
    } else if (activeTab === 'alerts') {
      csvData = [
        ['Stock Alerts Report', `Date: ${today}`],
        [''],
        ['Type', 'SKU', 'Product', 'Current Level', 'Threshold', 'Priority'],
        ...stockAlerts.map(a => [a.type, a.sku, a.productName, a.currentLevel, a.threshold, a.priority]),
      ];
    } else {
      csvData = [
        ['Inventory Overview Report', `Date: ${today}`],
        [''],
        ['Summary Metrics'],
        ['Total Bins', storage.length.toString()],
        ['Occupied Bins', storage.filter(s => s.status === 'occupied').length.toString()],
        ['Total SKUs', inventoryItems.length.toString()],
        ['Total Stock Value', `₹${inventoryItems.reduce((sum, i) => sum + i.value, 0).toLocaleString()}`],
        [''],
        ['Adjustments'],
        ['Type', 'SKU', 'Product', 'Change', 'Reason', 'User', 'Timestamp'],
        ...adjustments.map(a => [a.type, a.sku, a.productName, a.change, a.reason, a.user, a.timestamp]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const occupiedBins = storage.filter(s => s.status === 'occupied').length;
  const totalBins = storage.length;
  const occupancyRate = totalBins > 0 ? Math.round((occupiedBins / totalBins) * 100) : 0;
  const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.value, 0);
  
  const filteredInventoryItems = inventoryItems.filter(i =>
    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCycleCounts = cycleCounts.filter(c =>
    c.countId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransfers = transfers.filter(t =>
    t.transferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle="Stock levels, bin management, and inventory operations"
      />
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button 
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
          {activeTab === 'overview' && (
            <button 
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <RefreshCw size={16} />
              New Adjustment
            </button>
          )}
          {activeTab === 'cycle-counts' && (
            <button 
              onClick={() => setShowCycleCountModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Schedule Count
            </button>
          )}
          {activeTab === 'transfers' && (
            <button 
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              New Transfer
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Grid size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Total Bins</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{totalBins}</p>
          <p className="text-xs text-[#64748B]">{occupancyRate}% Occupied</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Package size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Total SKUs</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{inventoryItems.length}</p>
          <p className="text-xs text-[#64748B]">In Stock</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Stock Value</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">₹{(totalStockValue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-[#64748B]">Total Value</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ClipboardCheck size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Cycle Counts</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{cycleCounts.filter(c => c.status === 'in-progress').length}</p>
          <p className="text-xs text-[#64748B]">In Progress</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Alerts</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{stockAlerts.filter(a => a.priority === 'high').length}</p>
          <p className="text-xs text-[#64748B]">High Priority</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => { setActiveTab('stock-levels'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'stock-levels' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Stock Levels
        </button>
        <button
          onClick={() => { setActiveTab('cycle-counts'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cycle-counts' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Cycle Counts
        </button>
        <button
          onClick={() => { setActiveTab('transfers'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'transfers' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Transfers
        </button>
        <button
          onClick={() => { setActiveTab('alerts'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'alerts' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Alerts
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#1E293B]">Storage Layout Map</h3>
              <div className="text-xs text-[#64748B]">
                {occupiedBins} / {totalBins} bins occupied
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {storage.length === 0 ? (
                  <div className="col-span-4 py-12 text-center text-[#64748B] text-sm">No storage locations configured</div>
                ) : ['A', 'B', 'C', 'D'].map((aisle) => (
                  <div key={aisle} className="space-y-2">
                    <h4 className="text-center font-bold text-[#64748B] text-xs">Aisle {aisle}</h4>
                    <div className="grid grid-rows-6 gap-1">
                      {storage.filter(s => s.aisle === aisle || (s.aisle && s.aisle.startsWith(aisle))).map((location) => (
                        <div 
                          key={location.id}
                          onClick={() => setSelectedLocation(location)}
                          className={`h-8 rounded border text-[10px] flex items-center justify-center font-mono cursor-pointer transition-colors ${
                            location.status === 'restricted' ? 'bg-gray-100 border-gray-300 text-gray-400' :
                            location.status === 'occupied' ? 'bg-cyan-100 border-cyan-300 text-cyan-800 hover:bg-cyan-200' : 
                            'bg-white border-dashed border-gray-300 text-gray-300 hover:border-gray-400'
                          }`}
                          title={location.sku ? `${location.sku} (${location.quantity} units)` : location.status}
                        >
                          {location.id}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-6 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-cyan-100 border border-cyan-300 rounded"></span> Occupied
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-white border border-dashed border-gray-300 rounded"></span> Empty
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></span> Restricted
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#1E293B]">Recent Adjustments</h3>
              <button 
                onClick={() => setShowAdjustmentModal(true)}
                className="text-xs text-[#0891b2] hover:underline font-medium"
              >
                + New
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto">
              {adjustments.length === 0 ? (
                <div className="py-8 text-center text-[#64748B] text-sm">No adjustments yet</div>
              ) : adjustments.map(adj => (
                <div key={adj.id} className="p-4 hover:bg-[#F8FAFC]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-[#1E293B]">{adj.type}</span>
                    <span className={`font-bold ${adj.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adj.change > 0 ? '+' : ''}{adj.change}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">{adj.sku} • {adj.productName}</p>
                  <p className="text-xs text-[#64748B] mt-1">{adj.reason}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    User: {adj.user} • {adj.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Levels Tab */}
      {activeTab === 'stock-levels' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search SKU or product name..."
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
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Current Stock</th>
                  <th className="px-6 py-3">Min / Max</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Value</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredInventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-[#64748B]">No inventory items found</td>
                  </tr>
                ) : filteredInventoryItems.map(item => {
                  const stockPercentage = (item.maxStock && item.maxStock > 0) ? (item.currentStock / item.maxStock) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-mono text-[#475569]">{item.sku}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{item.productName}</td>
                      <td className="px-6 py-4 text-[#64748B]">{item.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            item.currentStock === 0 ? 'text-red-600' :
                            item.currentStock < item.minStock ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {item.currentStock}
                          </span>
                          {item.currentStock < item.minStock && item.currentStock > 0 && (
                            <TrendingDown size={14} className="text-amber-600" />
                          )}
                          {item.currentStock > item.maxStock && (
                            <TrendingUp size={14} className="text-blue-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{item.minStock} / {item.maxStock}</td>
                      <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{item.location}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">₹{item.value}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleAdjustClick(item)}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cycle Counts Tab */}
      {activeTab === 'cycle-counts' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search count ID or zone..."
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
                  <th className="px-6 py-3">Count ID</th>
                  <th className="px-6 py-3">Zone</th>
                  <th className="px-6 py-3">Assigned To</th>
                  <th className="px-6 py-3">Scheduled Date</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Discrepancies</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
<tbody className="divide-y divide-[#E2E8F0]">
              {filteredCycleCounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#64748B]">No cycle counts found</td>
                </tr>
              ) : filteredCycleCounts.map(count => {
                  const progress = count.itemsTotal > 0 ? (count.itemsCounted / count.itemsTotal) * 100 : 0;
                  return (
                    <tr key={count.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-mono text-[#475569]">{count.countId}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{count.zone}</td>
                      <td className="px-6 py-4 text-[#64748B]">{count.assignedTo}</td>
                      <td className="px-6 py-4 text-[#64748B]">{count.scheduledDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#E2E8F0] rounded-full h-2">
                            <div 
                              className="bg-[#0891b2] h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-[#64748B]">
                            {count.itemsCounted}/{count.itemsTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${count.discrepancies > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {count.discrepancies}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          count.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          count.status === 'in-progress' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                          'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {count.status === 'in-progress' ? 'In Progress' :
                           count.status.charAt(0).toUpperCase() + count.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {count.status === 'scheduled' && (
                          <button 
                            onClick={() => startCycleCount(count.id)}
                            className="text-[#0891b2] hover:underline text-xs font-bold"
                          >
                            Start
                          </button>
                        )}
                        {count.status === 'in-progress' && (
                          <button 
                            onClick={() => completeCycleCount(count.id)}
                            className="text-green-600 hover:underline text-xs font-bold"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search transfer ID or SKU..."
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
                  <th className="px-6 py-3">Transfer ID</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">From Location</th>
                  <th className="px-6 py-3">To Location</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Initiated By</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
<tbody className="divide-y divide-[#E2E8F0]">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#64748B]">No internal transfers found</td>
                </tr>
              ) : filteredTransfers.map(transfer => (
                  <tr key={transfer.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{transfer.transferId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[#1E293B]">{transfer.productName}</p>
                        <p className="text-xs text-[#64748B]">{transfer.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{transfer.fromLocation}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{transfer.toLocation}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{transfer.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transfer.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        transfer.status === 'in-transit' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {transfer.status === 'in-transit' ? 'In Transit' :
                         transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{transfer.initiatedBy}</td>
                    <td className="px-6 py-4 text-right">
                      {transfer.status === 'pending' && (
                        <button 
                          onClick={async () => {
                            try {
                              await apiUpdateTransferStatus(transfer.id, 'in-transit');
                              toast.success('Transfer started');
                              loadData();
                            } catch (error) {
                              toast.error('Failed to start transfer');
                            }
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Start Transfer
                        </button>
                      )}
                      {transfer.status === 'in-transit' && (
                        <button 
                          onClick={async () => {
                            try {
                              await apiUpdateTransferStatus(transfer.id, 'completed');
                              toast.success('Transfer completed');
                              loadData();
                            } catch (error) {
                              toast.error('Failed to complete transfer');
                            }
                          }}
                          className="text-green-600 hover:underline text-xs font-bold"
                        >
                          Complete
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

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stockAlerts.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-[#64748B] text-sm border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
              No stock alerts
            </div>
          ) : stockAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`bg-white border rounded-xl p-6 shadow-sm ${
                alert.type === 'out-of-stock' ? 'border-red-300 ring-2 ring-red-100' :
                alert.type === 'low-stock' ? 'border-amber-300 ring-2 ring-amber-100' :
                alert.type === 'expiring' ? 'border-orange-300 ring-2 ring-orange-100' :
                'border-blue-300 ring-2 ring-blue-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    alert.type === 'out-of-stock' ? 'bg-red-50 text-red-600' :
                    alert.type === 'low-stock' ? 'bg-amber-50 text-amber-600' :
                    alert.type === 'expiring' ? 'bg-orange-50 text-orange-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E293B]">
                      {alert.type === 'out-of-stock' ? 'Out of Stock' :
                       alert.type === 'low-stock' ? 'Low Stock' :
                       alert.type === 'expiring' ? 'Expiring Soon' :
                       'Overstock'}
                    </h3>
                    <p className="text-xs text-[#64748B]">{alert.sku}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  alert.priority === 'high' ? 'bg-red-100 text-red-700' :
                  alert.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                </span>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium text-[#1E293B]">{alert.productName}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Current Level:</span>
                  <span className={`font-bold ${
                    alert.currentLevel === 0 ? 'text-red-600' :
                    alert.currentLevel < alert.threshold ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {alert.currentLevel} units
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Threshold:</span>
                  <span className="font-medium text-[#1E293B]">{alert.threshold} units</span>
                </div>
                
                <div className="pt-3 border-t border-[#E2E8F0] mt-3">
                  <button 
                    onClick={() => handleCreateReorder(alert)}
                    className="w-full py-2 bg-[#0891b2] text-white rounded-lg text-sm font-bold hover:bg-[#06b6d4]"
                  >
                    Create Reorder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Location Details Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Location {selectedLocation.id}</h3>
              <button onClick={() => setSelectedLocation(null)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B]">Status</label>
                  <p className="font-bold text-[#1E293B] capitalize">{selectedLocation.status}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B]">Aisle</label>
                  <p className="font-bold text-[#1E293B]">{selectedLocation.aisle}</p>
                </div>
              </div>
              {selectedLocation.status === 'occupied' && (
                <>
                  <div>
                    <label className="text-xs text-[#64748B]">SKU</label>
                    <p className="font-bold text-[#1E293B]">{selectedLocation.sku}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Quantity</label>
                    <p className="font-bold text-[#1E293B]">{selectedLocation.quantity} units</p>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setSelectedLocation(null)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">New Inventory Adjustment</h3>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Type</label>
                <select 
                  value={newAdjustment.type}
                  onChange={(e) => setNewAdjustment({...newAdjustment, type: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option>Cycle Count Adj.</option>
                  <option>Damage Write-off</option>
                  <option>Expiry Removal</option>
                  <option>Found Items</option>
                  <option>Manual Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">SKU</label>
                <input 
                  type="text"
                  placeholder="SKU-XXXX"
                  value={newAdjustment.sku}
                  onChange={(e) => setNewAdjustment({...newAdjustment, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Product Name</label>
                <input 
                  type="text"
                  placeholder="Product name"
                  value={newAdjustment.productName}
                  onChange={(e) => setNewAdjustment({...newAdjustment, productName: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Quantity Change</label>
                <input 
                  type="number"
                  placeholder="Use negative for reductions"
                  value={newAdjustment.change}
                  onChange={(e) => setNewAdjustment({...newAdjustment, change: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Reason</label>
                <textarea 
                  placeholder="Explain the adjustment..."
                  value={newAdjustment.reason}
                  onChange={(e) => setNewAdjustment({...newAdjustment, reason: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createAdjustment}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cycle Count Modal */}
      {showCycleCountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Schedule Cycle Count</h3>
              <button onClick={() => setShowCycleCountModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Zone</label>
                <select 
                  value={newCycleCount.zone}
                  onChange={(e) => setNewCycleCount({...newCycleCount, zone: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select zone</option>
                  <option>Zone A</option>
                  <option>Zone B</option>
                  <option>Zone C</option>
                  <option>Zone D</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Assign To</label>
                <select 
                  value={newCycleCount.assignedTo}
                  onChange={(e) => setNewCycleCount({...newCycleCount, assignedTo: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select picker</option>
                  <option>Mike T.</option>
                  <option>Sarah L.</option>
                  <option>Emma K.</option>
                  <option>John D.</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Scheduled Date</label>
                <input 
                  type="date"
                  value={newCycleCount.scheduledDate}
                  onChange={(e) => setNewCycleCount({...newCycleCount, scheduledDate: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowCycleCountModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createCycleCount}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Schedule Count
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">New Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">SKU</label>
                <input 
                  type="text"
                  placeholder="SKU-XXXX"
                  value={newTransfer.sku}
                  onChange={(e) => setNewTransfer({...newTransfer, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">From Location</label>
                  <input 
                    type="text"
                    placeholder="A-12-03"
                    value={newTransfer.fromLocation}
                    onChange={(e) => setNewTransfer({...newTransfer, fromLocation: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">To Location</label>
                  <input 
                    type="text"
                    placeholder="B-15-02"
                    value={newTransfer.toLocation}
                    onChange={(e) => setNewTransfer({...newTransfer, toLocation: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Quantity</label>
                <input 
                  type="number"
                  placeholder="Enter quantity"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer({...newTransfer, quantity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createTransfer}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      {showReorderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create Reorder Request</h3>
              <button onClick={() => setShowReorderModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-xs text-[#64748B]">SKU</label>
                    <p className="font-bold text-[#1E293B] font-mono">{newReorder.sku}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Product</label>
                    <p className="font-bold text-[#1E293B]">{newReorder.productName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Current Stock</label>
                    <p className={`font-bold ${newReorder.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {newReorder.currentStock} units
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Min Stock</label>
                    <p className="font-bold text-[#1E293B]">{newReorder.minStock} units</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  Reorder Quantity <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number"
                  placeholder="Enter quantity to reorder"
                  value={newReorder.reorderQuantity}
                  onChange={(e) => setNewReorder({...newReorder, reorderQuantity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  min="1"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Suggested: {newReorder.minStock - newReorder.currentStock > 0 ? newReorder.minStock - newReorder.currentStock : newReorder.minStock * 2} units
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Priority</label>
                <select 
                  value={newReorder.priority}
                  onChange={(e) => setNewReorder({...newReorder, priority: e.target.value as 'high' | 'medium' | 'low'})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Notes</label>
                <textarea 
                  placeholder="Additional notes for the reorder request..."
                  value={newReorder.notes}
                  onChange={(e) => setNewReorder({...newReorder, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowReorderModal(false);
                  setSelectedAlertForReorder(null);
                }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createReorder}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Reorder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}