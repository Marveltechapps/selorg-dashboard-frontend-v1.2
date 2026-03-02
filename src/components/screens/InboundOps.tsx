import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, ClipboardCheck, ArrowDownToLine, AlertTriangle, CheckCircle2, 
  Map, BarChart2, Clock, ShieldAlert, History, RefreshCw, Filter, Search, ChevronRight, X, Package, ArrowRight
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, InlineNotification } from '../ui/ux-components';
import { DeleteConfirmation, StatusChangeConfirmation } from '../ui/confirmation-dialog';
import { toast } from "sonner";
import {
  getInboundSummary,
  getGRNList,
  getGRNDetails,
  startGRNProcessing,
  updateGRNItemQuantity,
  completeGRNProcessing,
  getInterStoreTransfers,
  receiveInterStoreTransfer,
  syncInterStoreTransfers,
} from '../../api/inventory-management';
import {
  fetchPutawayTasks as getPutawayTasks,
  assignPutawayTask,
  completePutawayTask,
} from '../../api/inventory-management/putaway.api';
import { ActionHistoryViewer } from '../ui/action-history-viewer';

export function InboundOps() {
  const [activeTab, setActiveTab] = useState<'grn' | 'putaway' | 'transfers'>('grn');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadSummary(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadSummary(true);
      }
    }, 20000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [storeId]);

  const loadSummary = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await getInboundSummary(storeId);
      if (isMountedRef.current) {
        if (data && data.success !== false) {
          setSummary(data);
        } else {
          setSummary({ summary: { trucks_today: 0, pending_grn: 0, putaway_tasks: 0, inter_store_transfers: 0 } });
        }
        setLastRefresh(new Date());
        if (!silent) {
          toast.success("Summary refreshed", { duration: 2000 });
        }
      }
    } catch (error: any) {
      console.error('Failed to load inbound summary:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load summary", {
          description: error.message || "Please check your connection",
        });
      }
      if (isMountedRef.current) {
        setSummary({ summary: { trucks_today: 0, pending_grn: 0, putaway_tasks: 0, inter_store_transfers: 0 } });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbound Operations"
        subtitle="Manage GRN processing, putaway tasks, and inter-store transfers."
        actions={
          <div className="flex gap-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#E6F7FF] text-[#1677FF] rounded-lg">
                <Truck size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Inbound Today</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : summary?.summary.trucks_today || 0} Trucks
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FFF7E6] text-[#D46B08] rounded-lg">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Pending GRN</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : summary?.summary.pending_grn || 0} Orders
                </div>
              </div>
            </div>
            <button
              onClick={() => loadSummary(false)}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg border border-[#E0E0E0] disabled:opacity-50"
              title="Refresh summary"
            >
              <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            </button>
            {lastRefresh && (
              <span className="text-xs text-[#757575] hidden sm:inline">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="grn" label="GRN Processing" icon={ClipboardCheck} active={activeTab} onClick={setActiveTab} />
        <TabButton id="putaway" label="Putaway Manager" icon={ArrowDownToLine} active={activeTab} onClick={setActiveTab} />
        <TabButton id="transfers" label="Inter-Store Transfers" icon={Truck} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'grn' && <GRNTab />}
        {activeTab === 'putaway' && <PutawayTab />}
        {activeTab === 'transfers' && <TransfersTab />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
        active === id 
          ? "border-[#1677FF] text-[#1677FF] bg-[#F0F7FF]" 
          : "border-transparent text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5]"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function GRNTab() {
  const [selectedGRN, setSelectedGRN] = useState<string | null>(null);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [grnDetails, setGrnDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    isMountedRef.current = true;
    loadGRNList(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadGRNList(true);
      }
    }, 15000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (selectedGRN) {
      loadGRNDetails(selectedGRN);
    } else {
      setGrnDetails(null);
    }
  }, [selectedGRN]);

  const loadGRNList = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getGRNList({ 
        storeId, 
        status: statusFilter, 
        search: debouncedSearch,
        page: 1, 
        limit: 50 
      });
      if (isMountedRef.current) {
        const list = response?.grn_orders ?? response?.grn_list ?? response?.grns;
        if (response && (response.success !== false) && Array.isArray(list) && list.length > 0) {
          setGrnList(list);
        } else if (response && Array.isArray(list)) {
          setGrnList(list);
        } else {
          setGrnList([]);
        }
      }
    } catch (error: any) {
      console.error('Failed to load GRN list:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load GRN list");
      }
      if (isMountedRef.current) setGrnList([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const loadGRNDetails = async (grnId: string) => {
    try {
      setDetailsLoading(true);
      const response = await getGRNDetails(grnId);
      if (isMountedRef.current && response && response.grn) {
        const grn = response.grn;
        const items = Array.isArray(grn.items) ? grn.items : [];
        setGrnDetails({ ...response, grn: { ...grn, items } });
      }
    } catch (error: any) {
      console.error('Failed to load GRN details:', error);
      if (isMountedRef.current) {
        const fallback = await getGRNDetails(grnId);
        if (fallback && fallback.grn) setGrnDetails(fallback);
      }
    } finally {
      if (isMountedRef.current) setDetailsLoading(false);
    }
  };

  const handleStartProcessing = async (grnId: string) => {
    const currentGRN = grnList.find(g => g.grn_id === grnId);
    if (currentGRN) {
      setGrnList(prev => prev.map(g => g.grn_id === grnId ? { ...g, status: 'in_progress' } : g));
      if (grnDetails && grnDetails.grn.grn_id === grnId) {
        setGrnDetails(prev => ({ ...prev, grn: { ...prev.grn, status: 'in_progress' } }));
      }
    }
    setActionLoading(prev => new Set(prev).add(grnId));
    try {
      await startGRNProcessing(grnId, { actual_arrival: new Date().toISOString(), notes: 'Processing started' });
      if (isMountedRef.current) {
        toast.success('GRN processing started');
        loadGRNList(true);
        if (selectedGRN === grnId) loadGRNDetails(grnId);
      }
    } catch (error: any) {
      console.error('Failed to start GRN processing:', error);
      if (isMountedRef.current && currentGRN) {
        setGrnList(prev => prev.map(g => g.grn_id === grnId ? currentGRN : g));
        if (grnDetails && grnDetails.grn.grn_id === grnId) loadGRNDetails(grnId);
      }
      toast.error(error.message || 'Failed to start GRN processing');
    } finally {
      if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(grnId); return next; });
    }
  };

  const handleUpdateItem = async (grnId: string, sku: string, receivedQty: number, damagedQty: number = 0) => {
    const actionKey = `${grnId}-${sku}`;
    const currentItem = grnDetails?.grn?.items?.find((i: any) => i.sku === sku);
    if (grnDetails && currentItem) {
      setGrnDetails(prev => ({
        ...prev,
        grn: {
          ...prev.grn,
          items: prev.grn.items.map((item: any) =>
            item.sku === sku ? { ...item, received_quantity: receivedQty, damaged_quantity: damagedQty, status: receivedQty > 0 ? 'received' : item.status } : item
          ),
        },
      }));
    }
    setActionLoading(prev => new Set(prev).add(actionKey));
    try {
      await updateGRNItemQuantity(grnId, sku, { received_quantity: receivedQty, damaged_quantity: damagedQty });
      if (isMountedRef.current) {
        toast.success('Item quantity updated');
        loadGRNDetails(grnId);
      }
    } catch (error: any) {
      console.error('Failed to update item quantity:', error);
      if (isMountedRef.current && currentItem) loadGRNDetails(grnId);
      toast.error(error.message || 'Failed to update item quantity');
    } finally {
      if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(actionKey); return next; });
    }
  };

  const handleCompleteGRN = async (grnId: string) => {
    const currentGRN = grnList.find(g => g.grn_id === grnId);
    if (currentGRN) {
      setGrnList(prev => prev.map(g => g.grn_id === grnId ? { ...g, status: 'completed' } : g));
      if (grnDetails && grnDetails.grn.grn_id === grnId) {
        setGrnDetails(prev => ({ ...prev, grn: { ...prev.grn, status: 'completed' } }));
      }
    }
    setActionLoading(prev => new Set(prev).add(grnId));
    try {
      const response = await completeGRNProcessing(grnId, { auto_create_putaway: true });
      if (isMountedRef.current) {
        toast.success(response.putaway_tasks_created ? `GRN completed. ${response.putaway_tasks_created} putaway tasks created` : 'GRN processing completed');
        loadGRNList(true);
        if (selectedGRN === grnId) loadGRNDetails(grnId);
      }
    } catch (error: any) {
      console.error('Failed to complete GRN processing:', error);
      if (isMountedRef.current && currentGRN) {
        setGrnList(prev => prev.map(g => g.grn_id === grnId ? currentGRN : g));
        if (grnDetails && grnDetails.grn.grn_id === grnId) loadGRNDetails(grnId);
      }
      toast.error(error.message || 'Failed to complete GRN processing');
    } finally {
      if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(grnId); return next; });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       <div className="col-span-12 md:col-span-4 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Incoming Shipments</h3>
             <div className="flex gap-2">
                <button 
                  onClick={() => setShowSearch(!showSearch)} 
                  className={cn("p-1.5 rounded transition-colors", (showSearch || searchQuery) ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#E0E0E0] text-[#616161]")}
                >
                  <Search size={16} />
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={cn("p-1.5 rounded transition-colors", (showFilters || statusFilter !== 'all') ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#E0E0E0] text-[#616161]")}
                >
                  <Filter size={16} />
                </button>
             </div>
          </div>
          {showSearch && (
            <div className="p-3 bg-white border-b border-[#E0E0E0] relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GRN ID or Supplier..."
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1677FF]"
                autoFocus
              />
              <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#212121]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          {showFilters && (
            <div className="p-3 bg-[#F9FAFB] border-b border-[#E0E0E0] flex gap-2 overflow-x-auto custom-scrollbar">
              {['all', 'pending', 'in_progress', 'completed'].map(status => (
                <button 
                  key={status} 
                  onClick={() => setStatusFilter(status)} 
                  className={cn(
                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors border whitespace-nowrap",
                    statusFilter === status 
                      ? "bg-[#1677FF] border-[#1677FF] text-white" 
                      : "bg-white border-[#E0E0E0] text-[#616161] hover:bg-[#F5F5F5]"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-[#9E9E9E]">Loading GRN orders...</div>
            ) : grnList.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-[#9E9E9E]">No GRN orders found</div>
            ) : (
              grnList.map(grn => {
                  const progress = grn.received_quantity > 0 && grn.total_quantity > 0 ? Math.round((grn.received_quantity / grn.total_quantity) * 100) : 0;
                  const time = new Date(grn.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <div key={grn.grn_id} onClick={() => setSelectedGRN(grn.grn_id)} className={cn("p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm", selectedGRN === grn.grn_id ? "bg-[#F0F7FF] border-[#1677FF] ring-1 ring-[#1677FF]" : "bg-white border-[#E0E0E0]")}>
                      <div className="flex justify-between items-start mb-2">
                        <div><div className="font-bold text-[#212121] text-sm">{grn.supplier}</div><div className="text-xs text-[#757575]">{grn.grn_id}</div></div>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", grn.status === 'pending' ? "bg-[#FFF7E6] text-[#D46B08]" : grn.status === 'in_progress' ? "bg-[#E6F7FF] text-[#1677FF]" : grn.status === 'rejected' ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#F0FDF4] text-[#16A34A]")}>{grn.status}</span>
                      </div>
                      {grn.status === 'in_progress' && progress > 0 && (
                        <div className="mb-2"><div className="flex justify-between text-[10px] mb-1"><span>Processing...</span><span className="font-bold">{progress}%</span></div><div className="w-full bg-[#E0E0E0] h-1 rounded-full overflow-hidden"><div className="bg-[#1677FF] h-full rounded-full" style={{ width: `${progress}%` }} /></div></div>
                      )}
                      <div className="flex items-center justify-between text-xs text-[#616161] mt-2 pt-2 border-t border-[#F5F5F5]"><span className="flex items-center gap-1"><Truck size={12}/> {grn.truck_id}</span><span className="flex items-center gap-1"><Package size={12}/> {grn.items_count} Items</span><span className="flex items-center gap-1"><Clock size={12}/> {time}</span></div>
                    </div>
                  );
                })
            )}
          </div>
       </div>
       <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
          {selectedGRN ? (
             <>
               {detailsLoading ? 
                 <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-[#E0E0E0] text-[#9E9E9E]">Loading GRN details...</div>
                : grnDetails ? 
                 <>
                   <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex justify-between items-center">
                     <div>
                       <h2 className="text-xl font-bold text-[#212121]">{grnDetails.grn.grn_id}</h2>
                       <p className="text-sm text-[#757575]">Vendor: <span className="font-bold text-[#212121]">{grnDetails.grn.supplier}</span> • Truck: <span className="font-bold text-[#212121]">{grnDetails.grn.truck_id}</span></p>
                     </div>
                     <div className="flex gap-3">
                       {grnDetails.grn.status === 'pending' && (
                         <button onClick={() => handleStartProcessing(grnDetails.grn.grn_id)} disabled={actionLoading.has(grnDetails.grn.grn_id)} className="px-4 py-2 bg-[#E6F7FF] text-[#1677FF] rounded-lg font-bold text-sm hover:bg-[#BAE7FF] border border-[#91CAFF] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                           <CheckCircle2 size={16} className={actionLoading.has(grnDetails.grn.grn_id) ? "animate-spin" : ""} /> Start Processing
                         </button>
                       )}
                       {grnDetails.grn.status === 'in_progress' && (
                         <button onClick={() => handleCompleteGRN(grnDetails.grn.grn_id)} disabled={actionLoading.has(grnDetails.grn.grn_id)} className="px-4 py-2 bg-[#212121] text-white rounded-lg font-bold text-sm hover:bg-black flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                           <CheckCircle2 size={16} className={actionLoading.has(grnDetails.grn.grn_id) ? "animate-spin" : ""} /> Complete GRN
                         </button>
                       )}
                     </div>
                   </div>
                   <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex-1 flex flex-col overflow-hidden">
                     <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                       <h3 className="font-bold text-[#212121]">Line Items Verification</h3>
                       <div className="text-xs font-bold text-[#757575] uppercase">Scanned: <span className="text-[#212121]">{grnDetails.grn.items.filter((i: any) => i.received_quantity > 0).length} of {grnDetails.grn.items.length}</span></div>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                       <table className="w-full text-left text-sm">
                         <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                           <tr>
                             <th className="px-4 py-3 font-medium">SKU</th>
                             <th className="px-4 py-3 font-medium">Product Name</th>
                             <th className="px-4 py-3 font-medium">Expected</th>
                             <th className="px-4 py-3 font-medium">Received</th>
                             <th className="px-4 py-3 font-medium">Damaged</th>
                             <th className="px-4 py-3 font-medium">Status</th>
                             <th className="px-4 py-3 font-medium">Actions</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[#F0F0F0]">
                           {grnDetails.grn.items.map((item: any, i: number) => { 
                             const hasDiscrepancy = item.received_quantity !== item.expected_quantity && item.received_quantity > 0; 
                             const isDamaged = item.damaged_quantity > 0; 
                             return (
                               <tr key={i} className={cn("hover:bg-[#F9FAFB]", hasDiscrepancy ? "bg-[#FFF7E6]" : isDamaged ? "bg-[#FEF2F2]" : "")}>
                                 <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                                 <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                 <td className="px-4 py-3 text-[#616161]">{item.expected_quantity}</td>
                                 <td className="px-4 py-3 font-bold">{item.received_quantity}</td>
                                 <td className="px-4 py-3 font-bold text-[#EF4444]">{item.damaged_quantity || 0}</td>
                                 <td className="px-4 py-3">
                                   <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", item.status === 'completed' ? "bg-[#F0FDF4] text-[#16A34A]" : item.status === 'received' ? "bg-[#E6F7FF] text-[#1677FF]" : item.status === 'damaged' ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#F5F5F5] text-[#757575]")}>{item.status}</span>
                                 </td>
                                 <td className="px-4 py-3">
                                   {grnDetails.grn.status === 'in_progress' && (
                                     <button onClick={() => { 
                                       const newQty = prompt(`Enter received quantity for ${item.product_name} (Expected: ${item.expected_quantity}):`, item.received_quantity.toString()); 
                                       if (newQty !== null) { 
                                         const qty = parseInt(newQty); 
                                         const damaged = prompt(`Enter damaged quantity (if any):`, item.damaged_quantity.toString()) || '0'; 
                                         handleUpdateItem(grnDetails.grn.grn_id, item.sku, qty, parseInt(damaged)); 
                                       } 
                                     }} disabled={actionLoading.has(`${grnDetails.grn.grn_id}-${item.sku}`)} className="text-[#1677FF] font-bold text-xs hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                                       {actionLoading.has(`${grnDetails.grn.grn_id}-${item.sku}`) ? 'Updating...' : 'Update'}
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
                 </>
                : 
                 <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-[#E0E0E0] text-[#9E9E9E]">Failed to load GRN details</div>
               }
             </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-[#E0E0E0] text-[#9E9E9E]">
              <ClipboardCheck size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-[#212121]">Select a GRN</h3>
              <p>Choose a shipment from the list to start receiving items.</p>
            </div>
          )}
       </div>
    </div>
  );
}

function PutawayTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadPutawayTasks(false);
    refreshIntervalRef.current = setInterval(() => { if (isMountedRef.current) loadPutawayTasks(true); }, 15000);
    return () => { isMountedRef.current = false; if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [storeId]);

  const loadPutawayTasks = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getPutawayTasks({ storeId, status: 'all', page: 1, limit: 50 });
      if (isMountedRef.current) {
        if (response && response.putaway_tasks) {
          setTasks(response.putaway_tasks);
          if (response.putaway_tasks.length > 0 && !selectedTask) setSelectedTask(response.putaway_tasks.find((t: any) => t.status === 'pending') || response.putaway_tasks[0]);
        } else setTasks([]);
      }
    } catch (error: any) {
      console.error('Failed to load putaway tasks:', error);
      if (isMountedRef.current && !silent) toast.error("Failed to load putaway tasks");
      if (isMountedRef.current) setTasks([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleAssignTask = async (taskId: string) => {
    const currentTask = tasks.find(t => t.task_id === taskId);
    if (currentTask) {
      setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'assigned', assigned_to: 'John D.', staff_id: 'STAFF-001', staff_name: 'John D.' } : t));
      if (selectedTask?.task_id === taskId) setSelectedTask((prev: any) => ({ ...prev, status: 'assigned', assigned_to: 'John D.', staff_id: 'STAFF-001', staff_name: 'John D.' }));
    }
    setActionLoading(prev => new Set(prev).add(taskId));
    try {
      await assignPutawayTask(taskId, { staff_id: 'STAFF-001', staff_name: 'John D.' });
      if (isMountedRef.current) { toast.success('Task assigned successfully'); loadPutawayTasks(true); }
    } catch (error: any) {
      console.error('Failed to assign task:', error);
      if (isMountedRef.current && currentTask) { setTasks(prev => prev.map(t => t.task_id === taskId ? currentTask : t)); if (selectedTask?.task_id === taskId) setSelectedTask(currentTask); }
      toast.error(error.message || 'Failed to assign task');
    } finally {
      if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const currentTask = tasks.find(t => t.task_id === taskId);
    if (currentTask) {
      setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'completed', actual_location: selectedTask?.location || 'A-12-03' } : t));
      if (selectedTask?.task_id === taskId) setSelectedTask((prev: any) => ({ ...prev, status: 'completed', actual_location: selectedTask?.location || 'A-12-03' }));
    }
    setActionLoading(prev => new Set(prev).add(taskId));
    try {
      await completePutawayTask(taskId, { actual_location: selectedTask?.location || 'A-12-03', notes: 'Completed' });
      if (isMountedRef.current) { toast.success('Task completed successfully'); loadPutawayTasks(true); const nextTask = tasks.find(t => t.status === 'pending' && t.task_id !== taskId); if (nextTask) setSelectedTask(nextTask); }
    } catch (error: any) {
      console.error('Failed to complete task:', error);
      if (isMountedRef.current && currentTask) { setTasks(prev => prev.map(t => t.task_id === taskId ? currentTask : t)); if (selectedTask?.task_id === taskId) setSelectedTask(currentTask); }
      toast.error(error.message || 'Failed to complete task');
    } finally {
      if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  };

  const pendingTasks = tasks.filter(t => ['pending', 'assigned', 'in_progress'].includes(t.status));
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm"><div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Putaway Queue</div><div className="text-2xl font-bold text-[#212121]">{loading ? '...' : pendingTasks.length} Tasks</div></div>
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm"><div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Completed Today</div><div className="text-2xl font-bold text-[#212121]">{loading ? '...' : completedTasks.length}</div></div>
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm"><div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Active Staff</div><div className="text-2xl font-bold text-[#1677FF]">{loading ? '...' : new Set(tasks.filter(t => t.staff_id).map(t => t.staff_id)).size} Assigned</div></div>
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm"><div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Total Tasks</div><div className="text-2xl font-bold text-[#22C55E]">{loading ? '...' : tasks.length}</div></div>
       </div>
       <div className="grid grid-cols-12 gap-6 h-[500px]">
          <div className="col-span-8 flex flex-col gap-6">
             {selectedTask ? (
               <>
                 <div className="bg-[#212121] text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#1677FF] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Next Task</span>
                        <span className="text-[#9E9E9E] text-sm">Task ID: {selectedTask.task_id}</span>
                      </div>
                      <h2 className="text-3xl font-bold mb-1">{selectedTask.product_name}</h2>
                      <p className="text-[#9E9E9E]">Qty: <span className="text-white font-bold">{selectedTask.quantity} Units</span> • SKU: <span className="text-white font-bold">{selectedTask.sku}</span></p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-[#9E9E9E] uppercase font-bold mb-1">Target Location</div>
                      <div className="text-4xl font-mono font-bold text-[#4ADE80]">{selectedTask.location}</div>
                      <div className="text-xs text-[#9E9E9E] mt-1">{selectedTask.assigned_to ? `Assigned to: ${selectedTask.assigned_to}` : 'Unassigned'}</div>
                    </div>
                 </div>
                 {selectedTask.status === 'pending' && (
                   <div className="flex gap-3">
                     <button onClick={() => handleAssignTask(selectedTask.task_id)} disabled={actionLoading.has(selectedTask.task_id)} className="px-4 py-2 bg-[#1677FF] text-white rounded-lg font-bold text-sm hover:bg-[#0958D9] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{actionLoading.has(selectedTask.task_id) ? 'Assigning...' : 'Assign Task'}</button>
                   </div>
                 )}
                 {selectedTask.status === 'assigned' && (
                   <div className="flex gap-3">
                     <button onClick={() => handleCompleteTask(selectedTask.task_id)} disabled={actionLoading.has(selectedTask.task_id)} className="px-4 py-2 bg-[#22C55E] text-white rounded-lg font-bold text-sm hover:bg-[#16A34A] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{actionLoading.has(selectedTask.task_id) ? 'Completing...' : 'Complete Task'}</button>
                   </div>
                 )}
               </>
             ) : <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-[#E0E0E0] text-[#9E9E9E]">{loading ? 'Loading tasks...' : 'No tasks available'}</div>}
             <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex-1 p-6 relative overflow-hidden"><div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 rounded border border-[#E0E0E0] shadow-sm"><h4 className="font-bold text-[#212121] text-sm flex items-center gap-2"><Map size={14}/> Routing Guide</h4><p className="text-xs text-[#616161]">Follow the highlighted path to the target shelf.</p></div><div className="w-full h-full bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] relative flex items-center justify-center opacity-75"><div className="grid grid-cols-5 gap-8 w-3/4 h-3/4">{[...Array(10)].map((_, i) => (<div key={i} className={cn("bg-white border-2 rounded flex items-center justify-center text-xs font-bold text-[#E0E0E0]", i === 7 ? "border-[#4ADE80] bg-[#F0FDF4] text-[#16A34A] ring-4 ring-[#4ADE80]/20 scale-110 shadow-lg z-10" : "border-[#E0E0E0]")}>{i === 7 ? 'TARGET' : ''}</div>))}</div><svg className="absolute inset-0 w-full h-full pointer-events-none"><path d="M100,400 Q300,400 350,250 T600,150" fill="none" stroke="#1677FF" strokeWidth="4" strokeDasharray="8 4" className="animate-pulse" /></svg></div></div>
          </div>
          <div className="col-span-4 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]"><h3 className="font-bold text-[#212121]">Up Next</h3></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? <div className="flex items-center justify-center p-4 text-[#9E9E9E]">Loading tasks...</div> : pendingTasks.length === 0 ? <div className="flex items-center justify-center p-4 text-[#9E9E9E]">No pending tasks</div> : pendingTasks.map((task) => (
                <div key={task.task_id} onClick={() => setSelectedTask(task)} className={cn("p-3 bg-white border rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-all", selectedTask?.task_id === task.task_id ? "border-[#1677FF] bg-[#F0F7FF]" : "border-[#E0E0E0]")}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[#212121] text-sm">{task.product_name}</span>
                    <span className="text-xs font-mono font-bold bg-[#F5F5F5] px-1.5 py-0.5 rounded text-[#616161]">{task.location}</span>
                  </div>
                  <div className="text-xs text-[#757575]">{task.quantity} Units • {task.status}</div>
                </div>
              ))}
            </div>
          </div>
       </div>
    </div>
  );
}

function TransfersTab() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadTransfers(false);
    refreshIntervalRef.current = setInterval(() => { if (isMountedRef.current) loadTransfers(true); }, 20000);
    return () => { isMountedRef.current = false; if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [storeId]);

  const loadTransfers = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getInterStoreTransfers({ storeId, status: 'all', page: 1, limit: 50 });
      if (isMountedRef.current) {
        const list = (response && response.transfers) ? response.transfers : [];
        setTransfers(list);
        if (list.length > 0) {
          setSelectedTransfer((prev: any) => {
            const inList = prev ? list.find((t: any) => t.transfer_id === prev.transfer_id) : null;
            return inList ? inList : (list.find((t: any) => t.status === 'pending' || t.status === 'in_transit') || list[0]);
          });
        }
        if (!silent) toast.success("Transfers refreshed");
      }
    } catch (error: any) {
      console.error('Failed to load transfers:', error);
      if (isMountedRef.current && !silent) toast.error("Failed to load transfers");
      if (isMountedRef.current) setTransfers([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleSyncTransfers = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing with central ERP...');
    try {
      const response = await syncInterStoreTransfers(storeId);
      if (response.success) {
        toast.success(response.message || 'Transfers synced successfully', { id: toastId });
        loadTransfers(true);
      } else throw new Error(response.error || 'Failed to sync');
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync transfers', { id: toastId });
    } finally { setSyncing(false); }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    const currentTransfer = transfers.find(t => t.transfer_id === transferId);
    if (currentTransfer) {
      setTransfers(prev => prev.map(t => t.transfer_id === transferId ? { ...t, status: 'received', actual_arrival: new Date().toISOString() } : t));
      if (selectedTransfer?.transfer_id === transferId) setSelectedTransfer((prev: any) => ({ ...prev, status: 'received', actual_arrival: new Date().toISOString() }));
    }
    setActionLoading(prev => new Set(prev).add(transferId));
    try {
      const response = await receiveInterStoreTransfer(transferId, { auto_create_putaway: true });
      if (isMountedRef.current) {
        toast.success(response.putaway_tasks_created ? `Transfer received. ${response.putaway_tasks_created} putaway tasks created` : 'Transfer received successfully');
        loadTransfers(true);
      }
    } catch (error: any) {
      console.error('Failed to receive transfer:', error);
      if (isMountedRef.current && currentTransfer) { setTransfers(prev => prev.map(t => t.transfer_id === transferId ? currentTransfer : t)); if (selectedTransfer?.transfer_id === transferId) setSelectedTransfer(currentTransfer); }
      toast.error(error.message || 'Failed to receive transfer');
    } finally { if (isMountedRef.current) setActionLoading(prev => { const next = new Set(prev); next.delete(transferId); return next; }); }
  };

  const formatETA = (expectedArrival: string) => {
    const date = new Date(expectedArrival);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return 'Arrived';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Soon';
    if (hours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
          <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Scheduled Transfers</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowHistory(!showHistory)} className={cn("text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors", showHistory ? "bg-[#1677FF] text-white" : "text-[#1677FF] hover:bg-[#E6F7FF]")}><History size={12} /> {showHistory ? 'View List' : 'History'}</button>
                  <button onClick={handleSyncTransfers} disabled={syncing} className="text-[#1677FF] text-xs font-bold hover:underline disabled:opacity-50">{syncing ? 'Syncing...' : 'Refresh'}</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto">
                {showHistory ? (
                  <div className="p-4">
                    <ActionHistoryViewer module="inbound" action="SYNC_TRANSFERS" limit={10} />
                  </div>
                ) : 
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Transfer ID</th>
                        <th className="px-4 py-3 font-medium">Origin Store</th>
                        <th className="px-4 py-3 font-medium">ETA</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {loading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9E9E9E]">Loading transfers...</td></tr>
                      ) : transfers.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9E9E9E]">No transfers found</td></tr>
                      ) : (
                        transfers.map((trf) => (
                          <tr key={trf.transfer_id} className={cn("hover:bg-[#F9FAFB] cursor-pointer", selectedTransfer?.transfer_id === trf.transfer_id ? "bg-[#F0F7FF]" : "")} onClick={() => setSelectedTransfer(trf)}>
                            <td className="px-4 py-3 font-medium text-[#212121]">{trf.transfer_id}</td>
                            <td className="px-4 py-3 text-[#616161]">{trf.from_store}</td>
                            <td className="px-4 py-3 text-[#616161]">{formatETA(trf.expected_arrival)}</td>
                            <td className="px-4 py-3">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", trf.status === 'in_transit' ? "bg-[#E6F7FF] text-[#1677FF]" : trf.status === 'received' ? "bg-[#F0FDF4] text-[#16A34A]" : trf.status === 'rejected' ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#F5F5F5] text-[#757575]")}>{trf.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              {trf.status === 'pending' || trf.status === 'in_transit' ? (
                                <button onClick={(e) => { e.stopPropagation(); handleReceiveTransfer(trf.transfer_id); }} disabled={actionLoading.has(trf.transfer_id)} className="px-2 py-1 bg-[#22C55E] text-white rounded text-xs font-bold hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed">{actionLoading.has(trf.transfer_id) ? 'Receiving...' : 'Receive'}</button>
                              ) : (
                                <button className="p-1 hover:bg-[#E0E0E0] rounded text-[#616161]"><ChevronRight size={16} /></button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                }
             </div>
          </div>
          <div className="flex flex-col gap-6">
             {selectedTransfer ? (
               <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
                  <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2"><Truck size={18} /> Transfer Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                      <div>
                        <div className="text-xs font-bold text-[#757575] uppercase">Transfer ID</div>
                        <div className="font-bold text-[#212121]">{selectedTransfer.transfer_id}</div>
                      </div>
                      <div className="h-8 w-px bg-[#E0E0E0]" />
                      <div>
                        <div className="text-xs font-bold text-[#757575] uppercase">From Store</div>
                        <div className="font-bold text-[#212121]">{selectedTransfer.from_store}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                      <div>
                        <div className="text-xs font-bold text-[#757575] uppercase">Total Items</div>
                        <div className="font-bold text-[#212121]">{selectedTransfer.items_count} Items</div>
                      </div>
                      <div className="h-8 w-px bg-[#E0E0E0]" />
                      <div>
                        <div className="text-xs font-bold text-[#757575] uppercase">Total Quantity</div>
                        <div className="font-bold text-[#212121]">{selectedTransfer.total_quantity} Units</div>
                      </div>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                      <div className="text-xs font-bold text-[#757575] uppercase mb-1">Expected Arrival</div>
                      <div className="font-bold text-[#212121]">{new Date(selectedTransfer.expected_arrival).toLocaleString()}</div>
                      {selectedTransfer.actual_arrival && (
                        <>
                          <div className="text-xs font-bold text-[#757575] uppercase mt-2 mb-1">Actual Arrival</div>
                          <div className="font-bold text-[#22C55E]">{new Date(selectedTransfer.actual_arrival).toLocaleString()}</div>
                        </>
                      )}
                    </div>
                    {(selectedTransfer.status === 'pending' || selectedTransfer.status === 'in_transit') && (
                      <button onClick={() => handleReceiveTransfer(selectedTransfer.transfer_id)} disabled={actionLoading.has(selectedTransfer.transfer_id)} className="w-full py-3 bg-[#22C55E] text-white rounded-lg font-bold hover:bg-[#16A34A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircle2 size={16} className={actionLoading.has(selectedTransfer.transfer_id) ? "animate-spin" : ""} /> 
                        {actionLoading.has(selectedTransfer.transfer_id) ? 'Receiving...' : 'Receive Transfer'}
                      </button>
                    )}
                  </div>
               </div>
             ) : <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-[#E0E0E0] text-[#9E9E9E]">{loading ? 'Loading transfer details...' : 'Select a transfer to view details'}</div>}
          </div>
       </div>
    </div>
  );
}
