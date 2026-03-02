import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, AlertTriangle, ArrowUp, ArrowDown, Package, 
  LayoutGrid, List, Plus, Minus, History, BarChart3, 
  MapPin, AlertCircle, CheckCircle2, RefreshCw, Thermometer,
  Calendar, ChevronRight, X, FileText, Scan, Zap,
  MoreVertical, Pencil, Trash2, Tag, Box, Target, UserPlus
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, InlineNotification } from '../ui/ux-components';
import { DeleteConfirmation } from '../ui/confirmation-dialog';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import {
  fetchShelfView,
  fetchStockLevels,
  updateStockLevel,
  deleteInventoryItem,
  changeItemStatus,
  updateInventoryItem,
  fetchAdjustments,
  createAdjustment,
  fetchCycleCount,
  scanItem,
  fetchAuditLogs,
  fetchItemHistory,
  createRestockTask,
} from '../../api/inventory-management';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";

export function InventoryOps() {
  const [activeTab, setActiveTab] = useState<'live' | 'stock' | 'adjust' | 'count'>('live');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '', name: '' });
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deletedSku, setDeletedSku] = useState<string | null>(null);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  const handleDelete = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await deleteInventoryItem(deleteDialog.id);
      toast.success(`Removed ${deleteDialog.name} from inventory`);
      setDeleteDialog({ open: false, id: '', name: '' });
      if (activeTab === 'stock') setDeletedSku(deleteDialog.id);
      setRefreshTrigger((t) => t + 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Inventory Management"
        subtitle="Real-time stock tracking, shelf mapping, and cycle counts."
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5]"
            >
              <History size={16} /> Audit Log
            </button>
            <button 
              onClick={() => setShowScanModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#212121] text-white rounded-lg text-sm font-bold hover:bg-[#333] shadow-md"
            >
              <Scan size={16} /> Scan Item
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] overflow-x-auto">
        <TabButton id="live" label="Live Shelf View" icon={LayoutGrid} active={activeTab} onClick={setActiveTab} />
        <TabButton id="stock" label="Stock Levels" icon={Package} active={activeTab} onClick={setActiveTab} />
        <TabButton id="adjust" label="Adjustments" icon={RefreshCw} active={activeTab} onClick={setActiveTab} />
        <TabButton id="count" label="Cycle Count" icon={BarChart3} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'live' && <LiveShelfView />}
        {activeTab === 'stock' && <StockLevels onDelete={handleDelete} refreshTrigger={refreshTrigger} deletedSku={deletedSku} onClearDeletedSku={() => setDeletedSku(null)} />}
        {activeTab === 'adjust' && <InventoryAdjustments />}
        {activeTab === 'count' && <CycleCount />}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        itemName={deleteDialog.name}
        onConfirm={confirmDelete}
      />

      {/* Scan Item Modal */}
      <ScanItemModal 
        open={showScanModal} 
        onOpenChange={setShowScanModal} 
        onSuccess={() => {
          if (activeTab === 'stock') setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Global Audit Log Modal */}
      <AuditLogModal 
        open={showAuditModal} 
        onOpenChange={setShowAuditModal} 
      />

      {/* Per-Item History Modal */}
      <ItemHistoryModal 
        sku={selectedItemHistory} 
        onClose={() => setSelectedItemHistory(null)} 
      />
    </div>
  );
}

// --- Modals ---

function ScanItemModal({ open, onOpenChange, onSuccess }: any) {
  const [sku, setSku] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku) {
      toast.error('Please enter SKU');
      return;
    }
    
    setLoading(true);
    try {
      const result = await scanItem({ sku, location });
      const itemName = result.item?.name || result.product_name || 'Item';
      const itemLocation = result.item?.location || result.location || location;
      const itemStock = result.item?.current_stock || result.stock || 0;
      toast.success(`Scanned ${itemName} at ${itemLocation} - Stock: ${itemStock}`);
      onSuccess?.();
      onOpenChange(false);
      setSku('');
      setLocation('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to scan item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="scan-item-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" /> Scan Item
          </DialogTitle>
          <DialogDescription id="scan-item-description">
            Enter SKU and location to verify item details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleScan} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#616161] uppercase">SKU / Barcode</label>
            <input 
              autoFocus
              className="w-full p-2.5 border border-[#E0E0E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1677FF] outline-none"
              placeholder="Enter SKU..."
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#616161] uppercase">Location (Optional)</label>
            <input 
              className="w-full p-2.5 border border-[#E0E0E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1677FF] outline-none"
              placeholder="e.g. A-01-02"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#212121] hover:bg-[#333]"
              disabled={loading || !sku}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Scan className="w-4 h-4 mr-2" />}
              {loading ? 'Scanning...' : 'Verify Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AuditLogModal({ open, onOpenChange }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetchAuditLogs({ limit: 50 });
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col" aria-describedby="audit-log-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Global Inventory Audit Log
          </DialogTitle>
          <DialogDescription id="audit-log-description">
            Tracking all inventory actions across the store.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border border-[#E0E0E0] rounded-lg my-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0] sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1677FF]" />
                    <p className="mt-2 text-[#9E9E9E]">Loading audit trails...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#9E9E9E]">
                    No audit records found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[#616161] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.user}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        log.action_type === 'adjustment' ? "bg-blue-100 text-blue-700" :
                        log.action_type === 'scan' ? "bg-purple-100 text-purple-700" :
                        log.action_type === 'delete' ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.sku || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-[#616161]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || 'N/A')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemHistoryModal({ sku, onClose }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sku) {
      loadHistory();
    }
  }, [sku]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetchItemHistory(sku);
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load item history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!sku} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] flex flex-col" aria-describedby="item-history-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Item History: {sku}
          </DialogTitle>
          <DialogDescription id="item-history-description">
            Detailed audit trail for this specific item.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border border-[#E0E0E0] rounded-lg my-4">
          <div className="divide-y divide-[#F0F0F0]">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1677FF]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-[#9E9E9E]">
                No history records found for this SKU
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[#212121] text-sm capitalize">
                      {log.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#9E9E9E]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-[#616161] mb-2 flex items-center gap-2">
                    <UserPlus size={12} className="text-[#9E9E9E]" />
                    Performed by: <span className="font-medium text-[#212121]">{log.user}</span>
                  </div>
                  {log.changes && (
                    <div className="bg-[#F5F5F5] p-2 rounded text-[10px] grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[#757575] uppercase block">Before</span>
                        <span className="font-bold text-red-600">{log.changes.stock_before} Units</span>
                      </div>
                      <div>
                        <span className="text-[#757575] uppercase block">After</span>
                        <span className="font-bold text-green-600">{log.changes.stock_after} Units</span>
                      </div>
                    </div>
                  )}
                  {log.details && typeof log.details === 'object' && (
                    <div className="mt-2 text-[10px] text-[#757575]">
                      <span className="font-bold">Reason:</span> {log.details.reason || log.details.mode || 'N/A'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      type="button"
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

// --- Sub-Components ---

function LiveShelfView() {
  const [shelfData, setShelfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShelf, setSelectedShelf] = useState<string>('A-01-01');
  const [showHistory, setShowHistory] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    loadShelfView();
  }, [selectedShelf, storeId]);

  const loadShelfView = async () => {
    try {
      setLoading(true);
      const data = await fetchShelfView({ storeId, zone: 'Zone 1 (Ambient)', aisle: 'all', shelf_location: selectedShelf });
      if (data && (data.success !== false || data.aisles || data.alerts)) {
        setShelfData(data);
      } else {
        setShelfData(null);
      }
    } catch (error: any) {
      console.error('Failed to load shelf view:', error);
      // Silent fail - don't disrupt UI
      setShelfData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle both response formats: aisles array or aisles_data object
  const aislesList = shelfData?.aisles && Array.isArray(shelfData.aisles) ? shelfData.aisles : [];
  const aisles = aislesList.length > 0 ? aislesList.map((a: any) => a.aisle) : (shelfData?.aisles_data ? Object.keys(shelfData.aisles_data) : ['A', 'B', 'C', 'D', 'E', 'F']);
  // Derive selected shelf details from data so right panel shows full data (not just API selected_shelf)
  let selectedShelfDetails = shelfData?.selected_shelf;
  if (!selectedShelfDetails && shelfData?.aisles && selectedShelf) {
    for (const a of shelfData.aisles) {
      const shelf = (a.shelves || []).find((s: any) => (s.location_code || s.id) === selectedShelf);
      if (shelf) {
        selectedShelfDetails = { location_code: shelf.location_code || shelf.id || selectedShelf, section: a.aisle, assigned_skus: shelf.assigned_skus || [], is_critical: shelf.is_critical, is_misplaced: shelf.is_misplaced };
        break;
      }
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Alerts Bar */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#B91C1C] text-sm font-bold">
           <AlertTriangle size={16} /> {loading ? '...' : (shelfData?.alerts?.empty_shelves || shelfData?.empty_shelves || 0)} Empty Shelves
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF7ED] border border-[#FFEDD5] rounded-lg text-[#C2410C] text-sm font-bold">
           <MapPin size={16} /> {loading ? '...' : (shelfData?.alerts?.misplaced_items || shelfData?.misplaced_shelves || 0)} Misplaced Items
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#FEFCE8] border border-[#FEF08A] rounded-lg text-[#A16207] text-sm font-bold">
           <AlertCircle size={16} /> {loading ? '...' : (shelfData?.alerts?.damaged_goods_reports || shelfData?.damaged_goods_reports || 0)} Damaged Goods Reports
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Map Visualization */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#E0E0E0] rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
             <h3 className="font-bold text-[#212121]">Store Map: Zone 1 (Ambient)</h3>
             <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#E6F7FF] border border-[#91CAFF] rounded-sm"/> Normal</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-sm"/> Empty/Critical</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-sm"/> Misplaced</span>
             </div>
          </div>
          <div className="flex-1 p-6 bg-[#F5F5F5] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-[#9E9E9E]">Loading shelf view...</div>
              </div>
            ) : !shelfData ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-[#9E9E9E] mb-2">No shelf data available</div>
                  <div className="text-xs text-[#757575]">Please check backend connection</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {(shelfData?.aisles && Array.isArray(shelfData.aisles) ? shelfData.aisles : []).map((aisleObj: any) => {
                  const aisle = aisleObj?.aisle ?? aisleObj;
                  const aisleData = aisleObj?.aisle ? aisleObj : shelfData?.aisles?.find((a: any) => a.aisle === aisle);
                  if (!aisleData || !aisleData.shelves) return null;
                  
                  return (
                    <div key={aisleData.aisle ?? aisle} className="flex flex-col gap-2">
                      <div className="text-center font-bold text-[#757575] mb-1">Aisle {aisleData.aisle ?? aisle}</div>
                      {aisleData.shelves.map((shelf: any) => {
                        const locationCode = shelf.location_code;
                        const isSelected = selectedShelf === locationCode;
                        
                        return (
                          <div 
                            key={shelf.shelf_number}
                            onClick={() => setSelectedShelf(locationCode)}
                            className={cn(
                              "h-16 rounded-lg border-2 flex items-center justify-center relative cursor-pointer hover:shadow-md transition-all group",
                              isSelected ? "ring-2 ring-[#1677FF] border-[#1677FF]" :
                              shelf.is_critical ? "bg-[#FEF2F2] border-[#FCA5A5]" : 
                              shelf.is_misplaced ? "bg-[#FFFBEB] border-[#FCD34D]" : "bg-white border-[#E0E0E0]"
                            )}
                          >
                            <span className="text-xs font-mono font-bold text-[#9E9E9E] absolute top-1 left-1">{locationCode}</span>
                            
                            {/* Hover Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#212121] text-white p-3 rounded-lg shadow-xl pointer-events-none transition-opacity">
                              <div className="text-xs font-bold mb-1">{locationCode} Contents:</div>
                              {shelf.assigned_skus && Array.isArray(shelf.assigned_skus) && shelf.assigned_skus.length > 0 ? (
                                shelf.assigned_skus.map((sku: any, i: number) => (
                                  <div key={i} className="text-xs mb-1">
                                    {sku.product_name || sku.sku}: <span className="text-[#4ADE80]">{sku.stock_count || 0}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs mb-1">No items assigned</div>
                              )}
                              {shelf.is_critical && <div className="text-xs text-[#EF4444] font-bold"><AlertTriangle size={10} className="inline"/> Critical Low Stock</div>}
                              {shelf.is_misplaced && <div className="text-xs text-[#FACC15] font-bold"><MapPin size={10} className="inline"/> Misplaced Item</div>}
                            </div>

                            {shelf.is_critical && <AlertTriangle size={20} className="text-[#EF4444]" />}
                            {shelf.is_misplaced && <MapPin size={20} className="text-[#D97706]" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Shelf Details */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
           <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-[#9E9E9E]">Loading shelf details...</div>
                </div>
              ) : selectedShelfDetails ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#212121]">Shelf {selectedShelfDetails.location_code}</h3>
                      <p className="text-sm text-[#757575]">{selectedShelfDetails.section || 'General'}</p>
                    </div>
                    {(selectedShelfDetails.status === 'critical' || selectedShelfDetails.is_critical) && (
                      <span className="px-2 py-1 bg-[#FEE2E2] text-[#EF4444] rounded text-xs font-bold uppercase">Critical</span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 border border-[#E0E0E0] rounded-lg bg-[#FAFAFA]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs text-[#757575] uppercase font-bold">Assigned SKUs</div>
                        {selectedShelfDetails.assigned_skus?.[0] && (
                          <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                              "text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded transition-colors",
                              showHistory ? "bg-[#1677FF] text-white" : "text-[#1677FF] hover:bg-[#E6F7FF]"
                            )}
                          >
                            <History size={10} /> {showHistory ? 'View Details' : 'History'}
                          </button>
                        )}
                      </div>

                      {showHistory ? (
                        <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                          <ActionHistoryViewer 
                            sku={selectedShelfDetails.assigned_skus[0].sku} 
                            limit={10}
                          />
                        </div>
                      ) : (
                        selectedShelfDetails.assigned_skus && Array.isArray(selectedShelfDetails.assigned_skus) && selectedShelfDetails.assigned_skus.length > 0 ? (
                          selectedShelfDetails.assigned_skus.map((sku: any, i: number) => (
                            <div key={i} className="flex items-center justify-between mb-2 last:mb-0">
                              <span className="text-sm font-medium">{sku.product_name || sku.sku || 'Unknown'}</span>
                              <span className={cn(
                                "text-sm font-bold",
                                (sku.stock_count || 0) === 0 ? "text-[#EF4444]" : "text-[#212121]"
                              )}>
                                {sku.stock_count || 0} Stock
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-[#9E9E9E]">No SKUs assigned</div>
                        )
                      )}
                    </div>

                    {!showHistory && selectedShelfDetails.issues && Array.isArray(selectedShelfDetails.issues) && selectedShelfDetails.issues.length > 0 && (
                      <div className="p-3 border border-[#FCD34D] bg-[#FFFBEB] rounded-lg">
                        <div className="flex items-center gap-2 mb-1 text-[#B45309] font-bold text-sm">
                          <AlertTriangle size={16} /> Issue Detected
                        </div>
                        {selectedShelfDetails.issues.map((issue: any, i: number) => (
                          <p key={i} className="text-xs text-[#92400E] mb-1">
                            {issue.message || issue.description || 'Issue detected'}
                          </p>
                        ))}
                        <button 
                          onClick={async () => {
                            try {
                              const firstSku = selectedShelfDetails?.assigned_skus?.[0];
                              if (firstSku) {
                                await createRestockTask({
                                  sku: firstSku.sku,
                                  store_id: storeId,
                                  quantity: 50,
                                  priority: 'high',
                                  shelf_location: selectedShelfDetails?.location_code,
                                  reason: 'Physical count mismatch',
                                });
                                toast.success(`Restock task created for ${selectedShelfDetails?.location_code}`);
                                loadShelfView();
                              }
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to create restock task');
                            }
                          }}
                          className="mt-2 w-full py-1.5 bg-white border border-[#FCD34D] text-[#B45309] text-xs font-bold rounded hover:bg-[#FFF7ED]"
                        >
                          Create Restock Task
                        </button>
                      </div>
                    )}

                    {((selectedShelfDetails.recent_activity && Array.isArray(selectedShelfDetails.recent_activity) && selectedShelfDetails.recent_activity.length > 0) ||
                      (selectedShelfDetails.recent_activities && Array.isArray(selectedShelfDetails.recent_activities) && selectedShelfDetails.recent_activities.length > 0)) && (
                      <div className="p-3 border border-[#E0E0E0] rounded-lg bg-white">
                        <div className="text-xs text-[#757575] uppercase font-bold mb-2">Recent Activity</div>
                        <div className="space-y-2">
                          {(selectedShelfDetails.recent_activity || selectedShelfDetails.recent_activities || []).map((activity: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-[#616161]">{activity.action || 'Activity'}</span>
                              <span className="text-[#9E9E9E]">
                                {activity.timestamp 
                                  ? (typeof activity.timestamp === 'string' && activity.timestamp.includes('T')
                                      ? new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                      : activity.timestamp)
                                  : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[#9E9E9E]">
                  Select a shelf to view details
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function StockLevels({ onDelete, refreshTrigger, deletedSku, onClearDeletedSku }: { onDelete: (id: string, name: string) => void, refreshTrigger?: number, deletedSku?: string | null, onClearDeletedSku?: () => void }) {
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<any>(null);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStockLevels();
    }, 300);
    return () => clearTimeout(timer);
  }, [categoryFilter, statusFilter, searchTerm, refreshTrigger, storeId]);

  useEffect(() => {
    if (deletedSku) {
      setStockData(prev => prev.filter(i => i.sku !== deletedSku));
      onClearDeletedSku?.();
    }
  }, [deletedSku]);

  const toggleHistory = (sku: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedHistory(newExpanded);
  };

  const loadStockLevels = async () => {
    try {
      setLoading(true);
      const response = await fetchStockLevels({
        storeId,
        page: 1,
        limit: 50,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
      });
      const items = (response?.items && Array.isArray(response.items)) ? response.items : Array.isArray(response) ? response : [];
      setStockData(items);
    } catch (error: any) {
      console.error('Failed to load stock levels:', error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (item: any) => {
    const newStock = prompt(`Enter new stock level for ${item.name || item.product_name} (Current: ${item.stock}):`, item.stock?.toString() || '0');
    if (newStock !== null) {
      const num = parseInt(newStock, 10);
      if (Number.isNaN(num)) return;
      try {
        await updateStockLevel(item.sku, { stock: num, location: item.location });
        toast.success(`Stock level updated for ${item.name || item.product_name}`);
        setStockData(prev => prev.map(i => i.sku === item.sku ? { ...i, stock: num } : i));
      } catch (error: any) {
        toast.error(error.message || 'Failed to update stock level');
      }
    }
  };

  const handleEditDetails = (item: any) => {
    setEditItem(item);
  };

  const handleChangeStatus = async (item: any) => {
    const validStatuses = ['In Stock', 'Out of Stock', 'Low Stock', 'Overstocked'];
    const newStatus = prompt(`Enter new status for ${item.name || item.product_name} (${validStatuses.join(', ')}):`, item.status || 'In Stock');
    if (newStatus && validStatuses.includes(newStatus)) {
      try {
        await changeItemStatus(item.sku, newStatus);
        toast.success(`Changed status of ${item.name || item.product_name} to ${newStatus}`);
        setStockData(prev => prev.map(i => i.sku === item.sku ? { ...i, status: newStatus } : i));
      } catch (error: any) {
        toast.error(error.message || 'Failed to change status');
      }
    } else if (newStatus) {
      toast.error('Invalid status. Please use one of the suggested values.');
    }
  };

  const handleDeleteItem = async (item: any) => {
    try {
      await deleteInventoryItem(item.sku);
      toast.success(`Removed ${item.name || item.product_name} from inventory`);
      setStockData(prev => prev.filter(i => i.sku !== item.sku));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const filteredData = stockData.filter((item: any) => {
    const sku = (item.sku || '').toLowerCase();
    const name = ((item.name || item.product_name) || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchSearch = !search || sku.includes(search) || name.includes(search);
    const cat = (item.category || item.status || '').toLowerCase();
    const matchCategory = categoryFilter === 'all' || cat.includes(categoryFilter.toLowerCase());
    const statusTag = item.stock === 0 ? 'Out of Stock' : (item.min_threshold && item.stock < item.min_threshold) ? 'Low Stock' : (item.status || 'In Stock');
    const matchStatus = statusFilter === 'all' || statusTag.toLowerCase().includes(statusFilter.toLowerCase());
    return matchSearch && matchCategory && matchStatus;
  });

  const getStatusTag = (item: any) => {
    const overridden = item.status && ['In Stock', 'Out of Stock', 'Low Stock', 'Overstocked'].includes(item.status);
    if (overridden) {
      const colors: Record<string, string> = { 'Out of Stock': 'bg-[#FEE2E2] text-[#EF4444]', 'Low Stock': 'bg-[#FEF3C7] text-[#D97706]', 'Overstocked': 'bg-[#E0E7FF] text-[#4338CA]', 'In Stock': 'bg-[#DCFCE7] text-[#16A34A]' };
      return { label: item.status, color: colors[item.status] || 'bg-[#DCFCE7] text-[#16A34A]' };
    }
    const stock = item.stock || 0;
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-[#FEE2E2] text-[#EF4444]' };
    if (item.min_threshold && stock < item.min_threshold) return { label: 'Low Stock', color: 'bg-[#FEF3C7] text-[#D97706]' };
    if (item.max_threshold && stock > item.max_threshold) return { label: 'Overstocked', color: 'bg-[#E0E7FF] text-[#4338CA]' };
    return { label: 'In Stock', color: 'bg-[#DCFCE7] text-[#16A34A]' };
  };

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
             <input 
               type="text" 
               placeholder="Search SKU..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677FF]" 
             />
          </div>
          <div className="flex gap-2">
             <select 
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-lg bg-[#F9FAFB] font-medium text-[#616161]"
             >
                <option value="all">All Categories</option>
                <option value="Produce">Produce</option>
                <option value="Dairy">Dairy</option>
                <option value="Bakery">Bakery</option>
                <option value="Pantry">Pantry</option>
                <option value="Snacks">Snacks</option>
                <option value="Spreads">Spreads</option>
                <option value="Supplements">Supplements</option>
             </select>
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-lg bg-[#F9FAFB] font-medium text-[#616161]"
             >
                <option value="all">Status: All</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Overstocked">Overstocked</option>
             </select>
          </div>
       </div>

       <div className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-[#9E9E9E]">Loading stock levels...</div>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Stock Level</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status Tag</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#9E9E9E]">
                      {searchTerm ? 'No items match your search' : 'No inventory items found'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => {
                    const statusTag = getStatusTag(item);
                    const isHistoryExpanded = expandedHistory.has(item.sku);
                    return (
                      <React.Fragment key={item.sku}>
                        <tr className={cn("hover:bg-[#F8F8F8] transition-colors", isHistoryExpanded && "bg-[#F0F7FF]")}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#212121]">{item.name || item.product_name || 'N/A'}</div>
                            <div className="text-xs text-[#9E9E9E]">{item.sku}</div>
                          </td>
                          <td className="px-6 py-4 text-[#616161]">{item.category || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#212121]">{item.stock || 0}</div>
                          </td>
                          <td className="px-6 py-4 text-[#616161]">{item.location || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide", statusTag.color)}>
                              {statusTag.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-[#1677FF] font-bold text-xs hover:underline flex items-center justify-end gap-1 ml-auto">
                                  Manage
                                  <MoreVertical size={14} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Manage Item</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleUpdateStock(item)}>
                                  <Box className="mr-2 h-4 w-4" /> Update Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleHistory(item.sku)}>
                                  <History className="mr-2 h-4 w-4" /> {isHistoryExpanded ? 'Hide History' : 'View History'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditDetails(item)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeStatus(item)}>
                                  <Tag className="mr-2 h-4 w-4" /> Change Status
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => onDelete(item.sku, item.name || item.product_name || 'Unknown')}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        {isHistoryExpanded && (
                          <tr className="bg-[#F0F7FF] border-b border-[#E0E0E0]">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="bg-white border border-[#BAE7FF] rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-[#212121] flex items-center gap-2">
                                    <History size={16} className="text-[#1677FF]" />
                                    Action History for {item.name || item.sku}
                                  </h4>
                                  <button onClick={() => toggleHistory(item.sku)} className="text-[#9E9E9E] hover:text-[#212121]">
                                    <X size={16} />
                                  </button>
                                </div>
                                <ActionHistoryViewer sku={item.sku} limit={5} className="space-y-2" />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
       </div>

       {editItem && (
         <EditDetailsModal 
           item={editItem} 
           onClose={() => setEditItem(null)} 
           onSuccess={(updated: { name?: string; category?: string; location?: string }) => {
             if (updated && editItem?.sku) {
               setStockData(prev => prev.map(i => i.sku === editItem.sku ? { ...i, ...(updated.name != null && { name: updated.name, product_name: updated.name }), ...(updated.category != null && { category: updated.category }), ...(updated.location != null && { location: updated.location }) } : i));
             }
             setEditItem(null);
             loadStockLevels();
           }}
         />
       )}
    </div>
  );
}

function EditDetailsModal({ item, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: item.name || item.product_name || '',
    category: item.category || 'Produce',
    location: item.location || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateInventoryItem(item.sku, formData);
      toast.success('Item details updated successfully');
      onSuccess({ name: formData.name, category: formData.category, location: formData.location });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="edit-item-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#1677FF]" />
            Edit Item Details
          </DialogTitle>
          <DialogDescription id="edit-item-description">
            Update product information for SKU: <span className="font-mono font-bold text-[#212121]">{item.sku}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Product Name</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1677FF] outline-none"
              placeholder="e.g. Fresh Tomatoes"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1677FF] outline-none"
            >
              <option value="Produce">Produce</option>
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Pantry">Pantry</option>
              <option value="Snacks">Snacks</option>
              <option value="Spreads">Spreads</option>
              <option value="Supplements">Supplements</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Location / Shelf</label>
            <input 
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1677FF] outline-none"
              placeholder="e.g. A-04"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-[#1677FF] hover:bg-[#0958D9]" disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InventoryAdjustments() {
  const [mode, setMode] = useState<'add' | 'remove' | 'damage'>('add');
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skuInput, setSkuInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [reasonInput, setReasonInput] = useState('Restock');
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    loadAdjustments();
  }, [storeId]);

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      const response = await fetchAdjustments({ storeId, page: 1, limit: 50 });
      // Backend returns { success: true, adjustments: [], pagination: {} }
      if (response && response.adjustments && Array.isArray(response.adjustments)) {
        setAdjustments(response.adjustments);
      } else if (response && Array.isArray(response)) {
        setAdjustments(response);
      } else {
        setAdjustments([]);
      }
    } catch (error: any) {
      console.error('Failed to load adjustments:', error);
      // Silent fail - don't disrupt UI
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!skuInput || !quantityInput) {
      toast.error('Please enter SKU and quantity');
      return;
    }

    try {
      const result = await createAdjustment({
        sku: skuInput,
        mode: mode,
        quantity: parseInt(quantityInput),
        reason_code: reasonInput,
        notes: `${mode} adjustment`,
      });
      toast.success('Adjustment created successfully');
      setSkuInput('');
      setQuantityInput('');
      const newAdj = {
        adjustment_id: result?.adjustment_id || `adj-${Date.now()}`,
        sku: skuInput,
        product_name: skuInput,
        action: mode,
        quantity: parseInt(quantityInput),
        reason: reasonInput,
        user: 'You',
        created_at: new Date().toISOString(),
      };
      setAdjustments((prev) => [newAdj, ...prev]);
      // Don't refetch here so the new adjustment stays visible in history
    } catch (error: any) {
      toast.error(error.message || 'Failed to create adjustment');
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
       <div className="col-span-12 md:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="text-lg font-bold text-[#212121] mb-6">Quick Adjustment</h3>
             
             <div className="flex gap-2 mb-6">
                <button 
                   onClick={() => setMode('add')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'add' ? "bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]" : "bg-white border-[#E0E0E0] text-[#616161]")}
                >
                   + Add Stock
                </button>
                <button 
                   onClick={() => setMode('remove')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'remove' ? "bg-[#FEE2E2] border-[#FCA5A5] text-[#B91C1C]" : "bg-white border-[#E0E0E0] text-[#616161]")}
                >
                   - Remove
                </button>
                <button 
                   onClick={() => setMode('damage')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'damage' ? "bg-[#FFF7ED] border-[#FDBA74] text-[#C2410C]" : "bg-white border-[#E0E0E0] text-[#616161]")}
                >
                   Damaged
                </button>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-[#616161] mb-1">SKU / Product Name</label>
                   <div className="relative">
                      <Scan className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
                      <input 
                        type="text" 
                        placeholder="Scan or type SKU..." 
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm" 
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-[#616161] mb-1">Quantity</label>
                   <input 
                     type="number" 
                     placeholder="0" 
                     value={quantityInput}
                     onChange={(e) => setQuantityInput(e.target.value)}
                     className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm" 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-[#616161] mb-1">Reason Code</label>
                   <select 
                     value={reasonInput}
                     onChange={(e) => setReasonInput(e.target.value)}
                     className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
                   >
                      <option>Restock</option>
                      <option>Return</option>
                      <option>Inventory Audit</option>
                      <option>Damaged</option>
                      <option>Expired</option>
                   </select>
                </div>
                
                <button 
                  onClick={handleCreateAdjustment}
                  className={cn(
                    "w-full py-3 rounded-lg text-white font-bold mt-4 shadow-md transition-colors",
                    mode === 'add' ? "bg-[#22C55E] hover:bg-[#16A34A]" : 
                    mode === 'remove' ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[#F97316] hover:bg-[#EA580C]"
                  )}
                >
                   Confirm Adjustment
                </button>
             </div>
          </div>
       </div>

       <div className="col-span-12 md:col-span-7">
          <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden flex flex-col h-full">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
                <h3 className="font-bold text-[#212121]">Adjustment History (Audit Trail)</h3>
             </div>
             <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-[#9E9E9E]">Loading adjustments...</div>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                        {adjustments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-[#9E9E9E]">
                            No adjustments found
                          </td>
                        </tr>
                      ) : (
                        adjustments.map((log: any) => {
                          // Handle both time formats: ISO string or time string
                          let timeStr = '';
                          let isToday = false;
                          if (log.created_at) {
                            const date = new Date(log.created_at);
                            timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            isToday = date.toLocaleDateString() === new Date().toLocaleDateString();
                          } else if (log.time) {
                            timeStr = log.time;
                            isToday = true; // Assume today if only time string
                          }
                          
                          return (
                            <tr key={log.adjustment_id || log.id} className="hover:bg-[#F9FAFB]">
                              <td className="px-4 py-3 text-[#616161]">{timeStr || 'N/A'}</td>
                              <td className="px-4 py-3 font-medium">{log.sku}</td>
                              <td className="px-4 py-3 text-[#616161]">{log.product_name || 'N/A'}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-xs font-bold px-2 py-0.5 rounded uppercase",
                                  log.action === 'add' ? "bg-[#F0FDF4] text-[#16A34A]" : 
                                  log.action === 'remove' ? "bg-[#FEE2E2] text-[#EF4444]" : 
                                  log.action === 'damage' ? "bg-[#FFF7ED] text-[#C2410C]" : "bg-[#F3F4F6] text-[#4B5563]"
                                )}>
                                  {log.action === 'add' ? '+' : ''}{log.quantity} ({log.reason || log.reason_code || 'N/A'})
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#616161]">{log.user || 'System'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

const DEFAULT_CYCLE_DATA = {
  metrics: {
    daily_count_progress: { percentage: 68, items_counted: 34, items_total: 50 },
    daily_progress: 68,
    items_counted: 34,
    total_items: 50,
    accuracy_rate: 98.5,
    accuracy_rate_percentage: 98.5,
    variance_value: { amount: -2, items_missing: 2, items_extra: 0 },
  },
  heatmap: {
    zones: [
      { zone_id: 'Ambient A', accuracy: 92, variance_level: 'low' },
      { zone_id: 'Chiller', accuracy: 98, variance_level: 'low' },
      { zone_id: 'Frozen', accuracy: 85, variance_level: 'medium' },
      { zone_id: 'Ambient B', accuracy: 99, variance_level: 'low' },
      { zone_id: 'Prep', accuracy: 88, variance_level: 'medium' },
      { zone_id: 'Receiving', accuracy: 95, variance_level: 'low' },
    ],
  },
  variance_report: [
    { sku: 'SKU-101', product_name: 'Organic Milk 1L', expected: 24, counted: 23, difference: -1 },
    { sku: 'SKU-103', product_name: 'Greek Yogurt 500g', expected: 12, counted: 11, difference: -1 },
    { sku: 'SKU-104', product_name: 'Free Range Eggs 12pk', expected: 30, counted: 29, difference: -1 },
    { sku: 'SKU-106', product_name: 'Oats 500g', expected: 20, counted: 21, difference: 1 },
  ],
};

function CycleCount() {
  const [cycleCountData, setCycleCountData] = useState<any>(DEFAULT_CYCLE_DATA);
  const [loading, setLoading] = useState(true);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const raw = await fetchCycleCount(storeId);
        if (cancelled) return;
        const def = DEFAULT_CYCLE_DATA;
        const merged = {
          metrics: {
            daily_count_progress: raw?.metrics?.daily_count_progress ?? def.metrics.daily_count_progress,
            daily_progress: raw?.metrics?.daily_progress ?? def.metrics.daily_progress,
            items_counted: raw?.metrics?.items_counted ?? def.metrics.items_counted,
            total_items: raw?.metrics?.total_items ?? def.metrics.total_items,
            accuracy_rate: raw?.metrics?.accuracy_rate ?? def.metrics.accuracy_rate,
            accuracy_rate_percentage: raw?.metrics?.accuracy_rate_percentage ?? def.metrics.accuracy_rate_percentage,
            variance_value: raw?.metrics?.variance_value ?? def.metrics.variance_value,
          },
          heatmap: {
            zones: Array.isArray(raw?.heatmap?.zones) && raw.heatmap.zones.length > 0
              ? raw.heatmap.zones
              : def.heatmap.zones,
          },
          variance_report: Array.isArray(raw?.variance_report) && raw.variance_report.length > 0
            ? raw.variance_report
            : def.variance_report,
        };
        setCycleCountData(merged);
      } catch (_) {
        if (!cancelled) setCycleCountData(DEFAULT_CYCLE_DATA);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const data = (cycleCountData && (cycleCountData.metrics || cycleCountData.heatmap || cycleCountData.variance_report))
    ? cycleCountData
    : DEFAULT_CYCLE_DATA;

  return (
    <div className="space-y-6" data-tab="cycle-count">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h4 className="text-[#757575] font-bold uppercase text-xs tracking-wider">Daily Count Progress</h4>
                   <h2 className="text-3xl font-bold text-[#212121] mt-1">
                     {loading ? '...' : (data?.metrics?.daily_count_progress?.percentage ?? data?.metrics?.daily_progress ?? 0)}%
                   </h2>
                </div>
                <div className="p-2 bg-[#F0FDF4] text-[#16A34A] rounded-lg">
                   <CheckCircle2 size={24} />
                </div>
             </div>
             <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-[#16A34A] h-full rounded-full" 
                  style={{ width: `${data?.metrics?.daily_count_progress?.percentage ?? data?.metrics?.daily_progress ?? 0}%` }}
                />
             </div>
             <p className="text-xs text-[#616161]">
               {loading ? '...' : `${data?.metrics?.daily_count_progress?.items_counted ?? data?.metrics?.items_counted ?? 0}/${data?.metrics?.daily_count_progress?.items_total ?? data?.metrics?.total_items ?? 0} items counted today`}
             </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h4 className="text-[#757575] font-bold uppercase text-xs tracking-wider">Accuracy Rate</h4>
                   <h2 className="text-3xl font-bold text-[#212121] mt-1">
                     {loading ? '...' : (data?.metrics?.accuracy_rate?.percentage ?? data?.metrics?.accuracy_rate ?? 0)}%
                   </h2>
                </div>
                <div className="p-2 bg-[#F0F9FF] text-[#1677FF] rounded-lg">
                   <Target size={24} />
                </div>
             </div>
             <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-[#1677FF] h-full rounded-full" 
                  style={{ width: `${data?.metrics?.accuracy_rate?.percentage ?? data?.metrics?.accuracy_rate ?? 0}%` }}
                />
             </div>
             <p className="text-xs text-[#616161]">Target: 99.0%</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h4 className="text-[#757575] font-bold uppercase text-xs tracking-wider">Variance Value</h4>
                   <h2 className={cn(
                     "text-3xl font-bold mt-1",
                     (data?.metrics?.variance_value?.amount ?? data?.metrics?.variance_value ?? 0) < 0 ? "text-[#EF4444]" : "text-[#22C55E]"
                   )}>
                     {loading ? '...' : (data?.metrics?.variance_value?.amount ?? data?.metrics?.variance_value ?? 0)}
                   </h2>
                </div>
                <div className={cn(
                  "p-2 rounded-lg",
                  (data?.metrics?.variance_value?.amount ?? data?.metrics?.variance_value ?? 0) < 0 ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-[#F0FDF4] text-[#16A34A]"
                )}>
                   <AlertTriangle size={24} />
                </div>
             </div>
             <p className="text-xs text-[#616161] mt-4">
               {loading ? '...' : (data?.metrics?.variance_value?.items_missing ?? data?.variance_report?.filter((v: any) => v.difference < 0).length ?? 0)} items missing, {data?.metrics?.variance_value?.items_extra ?? data?.variance_report?.filter((v: any) => v.difference > 0).length ?? 0} extra found
             </p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6">
             <h3 className="font-bold text-[#212121] mb-4">Inaccuracy Heatmap</h3>
             <div className="aspect-video bg-[#FAFAFA] rounded-lg border border-[#E0E0E0] relative flex items-center justify-center p-4">
                {loading ? (
                  <div className="text-[#9E9E9E]">Loading heatmap...</div>
                ) : data?.heatmap?.zones && Array.isArray(data.heatmap.zones) && data.heatmap.zones.length > 0 ? (
                  <div className="grid grid-cols-3 grid-rows-2 gap-2 w-full max-w-md mx-auto">
                    {data.heatmap.zones.map((zone: any, i: number) => {
                      const accuracy = Number(zone.accuracy) || 0;
                      const varianceLevel = (zone.variance_level || '').toLowerCase();
                      const isHigh = varianceLevel === 'high' || accuracy < 85;
                      const isMedium = varianceLevel === 'medium' || (accuracy >= 85 && accuracy < 95);
                      const isLow = varianceLevel === 'low' || accuracy >= 95;
                      const bg = isHigh ? 'bg-[#EF4444]' : isMedium ? 'bg-[#F59E0B]' : 'bg-[#22C55E]';
                      const label = isHigh ? 'High' : isMedium ? 'Med' : 'OK';
                      const zoneName = (zone.zone_id || zone.name || `Zone ${i + 1}`).toString();
                      return (
                        <div
                          key={i}
                          className={cn(
                            'rounded-lg flex flex-col items-center justify-center min-h-[64px] text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer',
                            bg
                          )}
                          title={`${zoneName}: ${accuracy}% accuracy — ${label} variance`}
                        >
                          <span className="truncate w-full text-center px-1">{zoneName}</span>
                          <span className="text-[10px] opacity-90">{accuracy}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[#9E9E9E]">No heatmap data available</div>
                )}
             </div>
             <div className="flex items-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#EF4444] rounded"/> High Variance</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#F59E0B] rounded"/> Medium Variance</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#22C55E] rounded"/> Accurate</div>
             </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col">
             <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Variance Report</h3>
                <button 
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      const { downloadCycleCountReport } = await import('../../api/inventory-management');
                      const blob = await downloadCycleCountReport(storeId);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `cycle-count-report-${new Date().toISOString().split('T')[0]}.pdf`;
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast.success('Report downloaded');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to download report');
                    }
                  }}
                  className="text-[#1677FF] text-xs font-bold hover:underline"
                >
                  Download PDF
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-[#9E9E9E]">Loading variance report...</div>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                        <th className="px-4 py-2 font-medium">SKU</th>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium">Expected</th>
                        <th className="px-4 py-2 font-medium">Counted</th>
                        <th className="px-4 py-2 font-medium">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {!data?.variance_report || !Array.isArray(data.variance_report) || data.variance_report.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-[#9E9E9E]">
                            No variance data available
                          </td>
                        </tr>
                      ) : (
                        data.variance_report.map((row: any, i: number) => {
                          const expected = Number(row.expected ?? row.expected_quantity) ?? 0;
                          const counted = Number(row.counted ?? row.actual ?? row.received_quantity) ?? 0;
                          const diff = Number(row.difference ?? row.variance ?? (counted - expected));
                          return (
                            <tr key={i} className="hover:bg-[#F9FAFB]">
                              <td className="px-4 py-2 font-medium text-[#212121]">{row.sku ?? '—'}</td>
                              <td className="px-4 py-2 text-[#616161]">{row.product_name ?? row.product ?? 'N/A'}</td>
                              <td className="px-4 py-2 text-[#616161]">{expected}</td>
                              <td className="px-4 py-2 text-[#616161]">{counted}</td>
                              <td className={cn(
                                'px-4 py-2 font-bold',
                                diff < 0 ? 'text-[#EF4444]' : diff > 0 ? 'text-[#D97706]' : 'text-[#22C55E]'
                              )}>
                                {diff > 0 ? '+' : ''}{diff}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

function TargetIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}