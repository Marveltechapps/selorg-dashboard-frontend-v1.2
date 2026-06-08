import React, { useState, useEffect } from 'react';
import { useScreenTab } from '../../hooks/useScreenUrlState';
import { 
  Search, Filter, AlertTriangle, ArrowUp, ArrowDown, Package, 
  LayoutGrid, List, Plus, Minus, History, BarChart3, 
  MapPin, AlertCircle, CheckCircle2, RefreshCw, Thermometer,
  Calendar, ChevronRight, X, FileText, Scan, Zap, Upload, Download,
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
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreTabBar } from '../darkstore/DarkstoreTabBar';
import { MetricCard } from '../darkstore/MetricCard';
import { AlertCard } from '../darkstore/AlertCard';
import { StatusBadge } from '../darkstore/StatusBadge';
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
  downloadCycleCountReport,
  fetchAuditLogs,
  bulkImportInventory,
  downloadInventoryImportTemplate,
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

const INVENTORY_TABS = ['live', 'stock', 'adjust', 'count'] as const;

export function InventoryOps() {
  const { activeTab, changeTab: setActiveTab } = useScreenTab(INVENTORY_TABS, 'live');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '', name: '' });
  const [showUploadModal, setShowUploadModal] = useState(false);
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
    <DarkstoreScreenShell
      title="Inventory Management"
      subtitle="Real-time stock tracking, shelf mapping, and cycle counts."
      toolbar={{
        showConnection: true,
        toolbarActions: (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setShowAuditModal(true)}>
              <History size={14} className="mr-1.5" /> Audit Log
            </Button>
            <Button type="button" size="sm" className="h-8" onClick={() => setShowUploadModal(true)}>
              <Upload size={14} className="mr-1.5" /> Upload Sheet
            </Button>
          </div>
        ),
      }}
    >

      <DarkstoreTabBar
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'live', label: 'Live Shelf View', icon: LayoutGrid },
          { id: 'stock', label: 'Stock Levels', icon: Package },
          { id: 'adjust', label: 'Adjustments', icon: RefreshCw },
          { id: 'count', label: 'Cycle Count', icon: BarChart3 },
        ]}
      />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'live' && (
          <LiveShelfView
            refreshKey={refreshTrigger}
            onRequestUpload={() => setShowUploadModal(true)}
          />
        )}
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

      <InventorySheetUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        storeId={storeId}
        onSuccess={() => setRefreshTrigger((t) => t + 1)}
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
    </DarkstoreScreenShell>
  );
}

// --- Modals ---

function InventorySheetUploadModal({
  open,
  onOpenChange,
  onSuccess,
  storeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  storeId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const reset = () => {
    setFile(null);
    setLastResult(null);
    setValidateOnly(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadInventoryImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Select a CSV or Excel file');
      return;
    }
    setLoading(true);
    try {
      const result = await bulkImportInventory(file, {
        storeId,
        zone: 'Zone 1 (Ambient)',
        validateOnly,
      });
      setLastResult(result);
      if (result.failedRows > 0) {
        toast.warning(result.message || `Imported with ${result.failedRows} errors`);
      } else {
        toast.success(
          validateOnly
            ? `Validated ${result.processedRows} rows`
            : `Imported ${result.processedRows} items`
        );
        if (!validateOnly) {
          onSuccess?.();
          onOpenChange(false);
          reset();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent
        className="!w-[min(100%-2rem,400px)] !max-w-[400px] sm:!max-w-[400px]"
        aria-describedby="upload-sheet-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload Inventory Sheet
          </DialogTitle>
          <DialogDescription id="upload-sheet-description">
            Import or update stock from CSV/Excel. Columns: sku, product_name, category, stock, location, barcode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <Download size={16} /> Download template (.csv)
          </button>

          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
              file ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50'
            )}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              id="inventory-sheet-input"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setLastResult(null);
              }}
            />
            <label htmlFor="inventory-sheet-input" className="cursor-pointer block">
              <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              {file ? (
                <p className="text-sm font-bold text-slate-900">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900">Click to choose file</p>
                  <p className="text-xs text-slate-400 mt-1">CSV or Excel up to 10MB</p>
                </>
              )}
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={validateOnly}
              onChange={(e) => setValidateOnly(e.target.checked)}
              className="rounded border-slate-200"
            />
            Validate only (do not save)
          </label>

          {lastResult?.errors?.length > 0 && (
            <AlertCard title="Import validation errors" severity="danger" icon={AlertTriangle}>
              <div className="max-h-32 overflow-y-auto text-xs mt-1 space-y-0.5">
                {lastResult.errors.slice(0, 8).map((err: any, i: number) => (
                  <div key={i}>Row {err.row}: {err.error}</div>
                ))}
                {lastResult.errors.length > 8 && (
                  <div className="mt-1 font-bold">+{lastResult.errors.length - 8} more errors</div>
                )}
              </div>
            </AlertCard>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-slate-900 hover:bg-slate-800"
            disabled={loading || !file}
            onClick={handleImport}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Processing...' : validateOnly ? 'Validate Sheet' : 'Import & Update'}
          </Button>
        </DialogFooter>
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
        
        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg my-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-slate-400">Loading audit trails...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No audit records found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.user}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant="workflow" status={log.action_type} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.sku || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
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
        
        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg my-4">
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No history records found for this SKU
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 text-sm capitalize">
                      {log.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mb-2 flex items-center gap-2">
                    <UserPlus size={12} className="text-slate-400" />
                    Performed by: <span className="font-medium text-slate-900">{log.user}</span>
                  </div>
                  {log.changes && (
                    <div className="bg-slate-100 p-2 rounded text-[10px] grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-slate-500 uppercase block">Before</span>
                        <span className="font-bold text-red-600">{log.changes.stock_before} Units</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">After</span>
                        <span className="font-bold text-green-600">{log.changes.stock_after} Units</span>
                      </div>
                    </div>
                  )}
                  {log.details && typeof log.details === 'object' && (
                    <div className="mt-2 text-[10px] text-slate-500">
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

// --- Sub-Components ---

function LiveShelfView({
  refreshKey = 0,
  onRequestUpload,
}: {
  refreshKey?: number;
  onRequestUpload?: () => void;
}) {
  const [shelfData, setShelfData] = useState<any>(null);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    loadShelfView();
  }, [selectedShelf, storeId, refreshKey]);

  const loadShelfView = async () => {
    try {
      setLoading(true);
      const [data, stockRes] = await Promise.all([
        fetchShelfView({
          storeId,
          zone: 'Zone 1 (Ambient)',
          aisle: 'all',
          shelf_location: selectedShelf || undefined,
        }),
        fetchStockLevels({ storeId, page: 1, limit: 500, sheetOnly: true }).catch(() => ({ items: [] })),
      ]);

      if (data && (data.success !== false || data.aisles || data.alerts)) {
        setShelfData(data);
        const firstShelf =
          data.selected_shelf?.location_code ||
          data.aisles?.[0]?.shelves?.[0]?.location_code;
        if (!selectedShelf && firstShelf) {
          setSelectedShelf(firstShelf);
        }
      } else {
        setShelfData(null);
      }

      const items =
        stockRes?.items && Array.isArray(stockRes.items)
          ? stockRes.items
          : Array.isArray(stockRes)
            ? stockRes
            : [];
      setCatalogItems(items);
    } catch (error: any) {
      console.error('Failed to load shelf view:', error);
      setShelfData(null);
      setCatalogItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = catalogItems.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const sku = (item.sku || '').toLowerCase();
    const name = ((item.name || item.product_name) || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();
    return sku.includes(q) || name.includes(q) || loc.includes(q);
  });

  const catalogStats = {
    total: catalogItems.length,
    inStock: catalogItems.filter((i) => (i.stock || 0) > 0).length,
    outOfStock: catalogItems.filter((i) => (i.stock || 0) === 0).length,
    lowStock: catalogItems.filter(
      (i) => (i.stock || 0) > 0 && (i.stock || 0) < 15
    ).length,
  };

  const handleCatalogItemClick = (item: any) => {
    if (item.location) {
      setSelectedShelf(item.location);
      setShowHistory(false);
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
  
  const hasShelfMap =
    shelfData?.aisles &&
    Array.isArray(shelfData.aisles) &&
    shelfData.aisles.some((a: any) => (a.shelves || []).length > 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="SKUs in store" value={catalogStats.total} icon={Package} loading={loading} />
        <MetricCard label="In stock" value={catalogStats.inStock} icon={CheckCircle2} accent="success" loading={loading} />
        <MetricCard label="Low stock" value={catalogStats.lowStock} icon={AlertTriangle} accent="warning" loading={loading} />
        <MetricCard label="Out of stock" value={catalogStats.outOfStock} icon={AlertCircle} accent="danger" loading={loading} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <AlertCard
          title={`${loading ? '...' : (shelfData?.alerts?.empty_shelves || shelfData?.empty_shelves || 0)} Empty Shelves`}
          severity="danger"
          icon={AlertTriangle}
          className="shrink-0"
        />
        <AlertCard
          title={`${loading ? '...' : (shelfData?.alerts?.misplaced_items || shelfData?.misplaced_shelves || 0)} Misplaced Items`}
          severity="warning"
          icon={MapPin}
          className="shrink-0"
        />
        <AlertCard
          title={`${loading ? '...' : (shelfData?.alerts?.critical_shelves ?? shelfData?.alerts?.damaged_goods_reports ?? 0)} Critical / Alerts`}
          severity="warning"
          icon={AlertCircle}
          className="shrink-0"
        />
        {shelfData?.source === 'inventory' && (
          <AlertCard
            title="Map built from uploaded inventory"
            severity="info"
            className="shrink-0"
          />
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        {/* Map Visualization */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[560px]">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-900">Store Map: Zone 1 (Ambient)</h3>
             <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded-sm"/> Normal</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-300 rounded-sm"/> Empty/Critical</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-50 border border-amber-300 rounded-sm"/> Misplaced</span>
             </div>
          </div>
          <div className="flex-1 p-6 bg-slate-100 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading shelf view...</div>
              </div>
            ) : !shelfData || !hasShelfMap ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm px-4">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <div className="text-slate-600 font-bold mb-1">No inventory on the floor yet</div>
                  <div className="text-xs text-slate-400 mb-4">
                    Upload a sheet with SKU, stock, and shelf location (e.g. A-01-01) to populate this map.
                  </div>
                  {onRequestUpload && (
                    <button
                      type="button"
                      onClick={onRequestUpload}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                    >
                      <Upload size={16} /> Upload inventory sheet
                    </button>
                  )}
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
                      <div className="text-center font-bold text-slate-500 mb-1">Aisle {aisleData.aisle ?? aisle}</div>
                      {aisleData.shelves.map((shelf: any) => {
                        const locationCode = shelf.location_code;
                        const isSelected = selectedShelf === locationCode;
                        
                        return (
                          <div 
                            key={shelf.shelf_number}
                            onClick={() => setSelectedShelf(locationCode)}
                            className={cn(
                              "h-16 rounded-lg border-2 flex items-center justify-center relative cursor-pointer hover:shadow-md transition-all group",
                              isSelected ? "ring-2 ring-blue-600 border-blue-600" :
                              shelf.is_critical ? "bg-red-50 border-red-300" : 
                              shelf.is_misplaced ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
                            )}
                          >
                            <span className="text-xs font-mono font-bold text-slate-400 absolute top-1 left-1">{locationCode}</span>
                            
                            {/* Hover Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-lg shadow-xl pointer-events-none transition-opacity">
                              <div className="text-xs font-bold mb-1">{locationCode} Contents:</div>
                              {shelf.assigned_skus && Array.isArray(shelf.assigned_skus) && shelf.assigned_skus.length > 0 ? (
                                shelf.assigned_skus.map((sku: any, i: number) => (
                                  <div key={i} className="text-xs mb-1">
                                    {sku.product_name || sku.sku}: <span className="text-emerald-400">{sku.stock_count || 0}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs mb-1">No items assigned</div>
                              )}
                              {shelf.is_critical && <div className="text-xs text-red-500 font-bold"><AlertTriangle size={10} className="inline"/> Critical Low Stock</div>}
                              {shelf.is_misplaced && <div className="text-xs text-yellow-400 font-bold"><MapPin size={10} className="inline"/> Misplaced Item</div>}
                            </div>

                            {shelf.is_critical && <AlertTriangle size={20} className="text-red-500" />}
                            {shelf.is_misplaced && <MapPin size={20} className="text-amber-600" />}
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

        {/* Product catalog */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-[560px]">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 mb-1">Product catalog</h3>
              <p className="text-[10px] text-slate-400 mb-3">From your latest uploaded sheet only</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search SKU, name, shelf..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading products...</div>
              ) : filteredCatalog.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {catalogItems.length === 0
                    ? 'No sheet products yet. Upload a CSV/Excel sheet to populate this list.'
                    : 'No matches for your search'}
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const isSelected = selectedShelf && item.location === selectedShelf;
                  const stock = item.stock ?? 0;
                  return (
                    <button
                      key={item.sku}
                      type="button"
                      onClick={() => handleCatalogItemClick(item)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                        isSelected && 'bg-blue-50 border-l-4 border-l-blue-600'
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {item.name || item.product_name || item.sku}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={cn(
                              'text-sm font-bold',
                              stock === 0 ? 'text-red-500' : 'text-slate-900'
                            )}
                          >
                            {stock} units
                          </div>
                          {item.location && (
                            <div className="text-[10px] text-blue-600 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                              <MapPin size={10} /> {item.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shelf detail strip */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-12">
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-400">Loading shelf details...</div>
                </div>
              ) : selectedShelfDetails ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Shelf {selectedShelfDetails.location_code}</h3>
                      <p className="text-sm text-slate-500">{selectedShelfDetails.section || 'General'}</p>
                    </div>
                    {(selectedShelfDetails.status === 'critical' || selectedShelfDetails.is_critical) && (
                      <StatusBadge variant="workflow" status="critical" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs text-slate-500 uppercase font-bold">Assigned SKUs</div>
                        {selectedShelfDetails.assigned_skus?.[0] && (
                          <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                              "text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded transition-colors",
                              showHistory ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"
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
                                (sku.stock_count || 0) === 0 ? "text-red-500" : "text-slate-900"
                              )}>
                                {sku.stock_count || 0} Stock
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-400">No SKUs assigned</div>
                        )
                      )}
                    </div>

                    {!showHistory && selectedShelfDetails.issues && Array.isArray(selectedShelfDetails.issues) && selectedShelfDetails.issues.length > 0 && (
                      <div className="p-3 border border-amber-300 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1 text-amber-700 font-bold text-sm">
                          <AlertTriangle size={16} /> Issue Detected
                        </div>
                        {selectedShelfDetails.issues.map((issue: any, i: number) => (
                          <p key={i} className="text-xs text-amber-800 mb-1">
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
                          className="mt-2 w-full py-1.5 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded hover:bg-orange-50"
                        >
                          Create Restock Task
                        </button>
                      </div>
                    )}

                    {((selectedShelfDetails.recent_activity && Array.isArray(selectedShelfDetails.recent_activity) && selectedShelfDetails.recent_activity.length > 0) ||
                      (selectedShelfDetails.recent_activities && Array.isArray(selectedShelfDetails.recent_activities) && selectedShelfDetails.recent_activities.length > 0)) && (
                      <div className="p-3 border border-slate-200 rounded-lg bg-white">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Recent Activity</div>
                        <div className="space-y-2">
                          {(selectedShelfDetails.recent_activity || selectedShelfDetails.recent_activities || []).map((activity: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-slate-600">{activity.action || 'Activity'}</span>
                              <span className="text-slate-400">
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
                <div className="flex items-center justify-center py-8 text-slate-400">
                  {selectedShelf
                    ? `No details for shelf ${selectedShelf}`
                    : 'Select a shelf on the map or a product to view shelf details'}
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

  const getStockStatus = (item: any) => {
    const overridden = item.status && ['In Stock', 'Out of Stock', 'Low Stock', 'Overstocked'].includes(item.status);
    if (overridden) return item.status;
    const stock = item.stock || 0;
    if (stock === 0) return 'Out of Stock';
    if (item.min_threshold && stock < item.min_threshold) return 'Low Stock';
    if (item.max_threshold && stock > item.max_threshold) return 'Overstocked';
    return 'In Stock';
  };

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search SKU..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
             />
          </div>
          <div className="flex gap-2">
             <select 
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-600"
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
               className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-600"
             >
                <option value="all">Status: All</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Overstocked">Overstocked</option>
             </select>
          </div>
       </div>

       <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-slate-400">Loading stock levels...</div>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Stock Level</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status Tag</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      {searchTerm ? 'No items match your search' : 'No inventory items found'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => {
                    const stockStatus = getStockStatus(item);
                    const isHistoryExpanded = expandedHistory.has(item.sku);
                    return (
                      <React.Fragment key={item.sku}>
                        <tr className={cn("hover:bg-slate-50 transition-colors", isHistoryExpanded && "bg-blue-50")}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{item.name || item.product_name || 'N/A'}</div>
                            <div className="text-xs text-slate-400">{item.sku}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{item.category || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{item.stock || 0}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{item.location || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <StatusBadge variant="stock" status={stockStatus} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-blue-600 font-bold text-xs hover:underline flex items-center justify-end gap-1 ml-auto">
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
                          <tr className="bg-blue-50 border-b border-slate-200">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <History size={16} className="text-blue-600" />
                                    Action History for {item.name || item.sku}
                                  </h4>
                                  <button onClick={() => toggleHistory(item.sku)} className="text-slate-400 hover:text-slate-900">
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
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit Item Details
          </DialogTitle>
          <DialogDescription id="edit-item-description">
            Update product information for SKU: <span className="font-mono font-bold text-slate-900">{item.sku}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Product Name</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              placeholder="e.g. Fresh Tomatoes"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
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
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Location / Shelf</label>
            <input 
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              placeholder="e.g. A-04"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
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
  const [submitting, setSubmitting] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [reasonInput, setReasonInput] = useState('Restock');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    loadAdjustments();
    loadInventoryItems();
  }, [storeId]);

  useEffect(() => {
    if (mode === 'damage' && reasonInput === 'Restock') {
      setReasonInput('Damaged');
    }
  }, [mode]);

  const loadInventoryItems = async () => {
    try {
      const response = await fetchStockLevels({ storeId, page: 1, limit: 100 });
      const items =
        response?.items && Array.isArray(response.items)
          ? response.items
          : Array.isArray(response)
            ? response
            : [];
      setInventoryItems(items);
    } catch {
      setInventoryItems([]);
    }
  };

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      const response = await fetchAdjustments({ storeId, page: 1, limit: 50 });
      if (response?.adjustments && Array.isArray(response.adjustments)) {
        setAdjustments(response.adjustments);
      } else if (response && Array.isArray(response)) {
        setAdjustments(response);
      } else {
        setAdjustments([]);
      }
    } catch (error: any) {
      console.error('Failed to load adjustments:', error);
      toast.error(error.message || 'Failed to load adjustment history');
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  const skuSuggestions = React.useMemo(() => {
    const q = skuInput.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return inventoryItems
      .filter((item) => {
        const sku = (item.sku || '').toLowerCase();
        const name = ((item.name || item.product_name) || '').toLowerCase();
        return sku.includes(q) || name.includes(q);
      })
      .slice(0, 8);
  }, [skuInput, inventoryItems]);

  const pickItem = (item: any) => {
    setSelectedItem(item);
    setSkuInput(item.sku);
    setShowSuggestions(false);
  };

  const handleCreateAdjustment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const qty = parseInt(quantityInput, 10);
    if (!skuInput.trim()) {
      toast.error('Enter a SKU or product name');
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid quantity greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAdjustment({
        sku: skuInput.trim(),
        mode,
        quantity: qty,
        reason_code: reasonInput,
        notes: `${mode} adjustment`,
        storeId,
      });
      const label = result?.product_name || skuInput;
      toast.success(
        `${label}: stock ${result?.old_stock ?? '?'} → ${result?.new_stock ?? '?'}`
      );
      setSkuInput('');
      setQuantityInput('');
      setSelectedItem(null);
      await loadAdjustments();
      await loadInventoryItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
       <div className="col-span-12 md:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Adjustment</h3>
             
             <div className="flex gap-2 mb-6">
                <button 
                   onClick={() => setMode('add')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'add' ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600")}
                >
                   + Add Stock
                </button>
                <button 
                   onClick={() => setMode('remove')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'remove' ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600")}
                >
                   - Remove
                </button>
                <button 
                   onClick={() => setMode('damage')}
                   className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", mode === 'damage' ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-slate-200 text-slate-600")}
                >
                   Damaged
                </button>
             </div>

             <form className="space-y-4" onSubmit={handleCreateAdjustment}>
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1">SKU / Product Name</label>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search SKU or product name..."
                        value={skuInput}
                        onChange={(e) => {
                          setSkuInput(e.target.value);
                          setSelectedItem(null);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        disabled={submitting}
                        autoComplete="off"
                      />
                      {showSuggestions && skuSuggestions.length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {skuSuggestions.map((item) => (
                            <li key={item.sku}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  pickItem(item);
                                }}
                              >
                                <span className="font-bold text-slate-900">{item.name || item.product_name}</span>
                                <span className="block text-xs text-slate-400 font-mono">{item.sku} · {item.stock ?? 0} in stock</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                   </div>
                </div>

                {selectedItem && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                    <div className="font-bold text-slate-900">{selectedItem.name || selectedItem.product_name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Current stock: <span className="font-bold">{selectedItem.stock ?? 0}</span>
                      {selectedItem.location ? ` · Shelf ${selectedItem.location}` : ''}
                    </div>
                  </div>
                )}

                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1">Quantity</label>
                   <input
                     type="number"
                     min={1}
                     placeholder="0"
                     value={quantityInput}
                     onChange={(e) => setQuantityInput(e.target.value)}
                     className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                     disabled={submitting}
                     required
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1">Reason Code</label>
                   <select
                     value={reasonInput}
                     onChange={(e) => setReasonInput(e.target.value)}
                     className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                     disabled={submitting}
                   >
                      <option>Restock</option>
                      <option>Return</option>
                      <option>Inventory Audit</option>
                      <option>Damaged</option>
                      <option>Expired</option>
                   </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !skuInput.trim() || !quantityInput}
                  className={cn(
                    "w-full py-3 rounded-lg text-white font-bold mt-4 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                    mode === 'add' ? "bg-emerald-500 hover:bg-emerald-600" :
                    mode === 'remove' ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
                  )}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Saving...' : 'Confirm Adjustment'}
                </button>
             </form>
          </div>
       </div>

       <div className="col-span-12 md:col-span-7">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Adjustment History (Audit Trail)</h3>
                <button
                  type="button"
                  onClick={loadAdjustments}
                  disabled={loading}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-slate-400">Loading adjustments...</div>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {adjustments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
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
                            <tr key={log.adjustment_id || log.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-600">{timeStr || 'N/A'}</td>
                              <td className="px-4 py-3 font-medium">{log.sku}</td>
                              <td className="px-4 py-3 text-slate-600">{log.product_name || 'N/A'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <StatusBadge variant="workflow" status={log.action} />
                                  <span className="text-xs text-slate-600 tabular-nums">
                                    {log.action === 'add' ? '+' : '−'}
                                    {Math.abs(Number(log.quantity) || 0)} ({log.reason || log.reason_code || 'N/A'})
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{log.user || 'System'}</td>
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
  const [downloading, setDownloading] = useState(false);
  const [reportDate, setReportDate] = useState<string | undefined>();
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
        if (raw?.report_date) setReportDate(raw.report_date);
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
          <MetricCard
            label="Daily Count Progress"
            value={`${data?.metrics?.daily_count_progress?.percentage ?? data?.metrics?.daily_progress ?? 0}%`}
            icon={CheckCircle2}
            accent="success"
            loading={loading}
            footer={
              <>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${data?.metrics?.daily_count_progress?.percentage ?? data?.metrics?.daily_progress ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  {loading ? '...' : `${data?.metrics?.daily_count_progress?.items_counted ?? data?.metrics?.items_counted ?? 0}/${data?.metrics?.daily_count_progress?.items_total ?? data?.metrics?.total_items ?? 0} items counted today`}
                </p>
              </>
            }
          />
          <MetricCard
            label="Accuracy Rate"
            value={`${data?.metrics?.accuracy_rate?.percentage ?? data?.metrics?.accuracy_rate ?? 0}%`}
            icon={Target}
            loading={loading}
            footer={
              <>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${data?.metrics?.accuracy_rate?.percentage ?? data?.metrics?.accuracy_rate ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">Target: 99.0%</p>
              </>
            }
          />
          <MetricCard
            label="Variance Value"
            value={data?.metrics?.variance_value?.amount ?? data?.metrics?.variance_value ?? 0}
            icon={AlertTriangle}
            accent={(data?.metrics?.variance_value?.amount ?? data?.metrics?.variance_value ?? 0) < 0 ? 'danger' : 'success'}
            loading={loading}
            footer={
              <p className="text-xs text-slate-600">
                {loading ? '...' : `${data?.metrics?.variance_value?.items_missing ?? data?.variance_report?.filter((v: any) => v.difference < 0).length ?? 0} items missing, ${data?.metrics?.variance_value?.items_extra ?? data?.variance_report?.filter((v: any) => v.difference > 0).length ?? 0} extra found`}
              </p>
            }
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h3 className="font-bold text-slate-900 mb-4">Inaccuracy Heatmap</h3>
             <div className="aspect-video bg-slate-50 rounded-lg border border-slate-200 relative flex items-center justify-center p-4">
                {loading ? (
                  <div className="text-slate-400">Loading heatmap...</div>
                ) : data?.heatmap?.zones && Array.isArray(data.heatmap.zones) && data.heatmap.zones.length > 0 ? (
                  <div className="grid grid-cols-3 grid-rows-2 gap-2 w-full max-w-md mx-auto">
                    {data.heatmap.zones.map((zone: any, i: number) => {
                      const accuracy = Number(zone.accuracy) || 0;
                      const varianceLevel = (zone.variance_level || '').toLowerCase();
                      const isHigh = varianceLevel === 'high' || accuracy < 85;
                      const isMedium = varianceLevel === 'medium' || (accuracy >= 85 && accuracy < 95);
                      const isLow = varianceLevel === 'low' || accuracy >= 95;
                      const bg = isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500';
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
                  <div className="text-slate-400">No heatmap data available</div>
                )}
             </div>
             <div className="flex items-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"/> High Variance</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded"/> Medium Variance</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded"/> Accurate</div>
             </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Variance Report</h3>
                <button
                  type="button"
                  disabled={downloading || loading}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDownloading(true);
                    try {
                      const { blob, fileName } = await downloadCycleCountReport(
                        storeId,
                        reportDate,
                        'pdf'
                      );
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download =
                        fileName ||
                        `cycle-count-report-${reportDate || new Date().toISOString().split('T')[0]}.pdf`;
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast.success('Cycle count PDF downloaded');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to download report');
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  className="text-blue-600 text-xs font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {downloading ? <RefreshCw size={12} className="animate-spin" /> : null}
                  {downloading ? 'Generating...' : 'Download PDF'}
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-slate-400">Loading variance report...</div>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-medium">SKU</th>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium">Expected</th>
                        <th className="px-4 py-2 font-medium">Counted</th>
                        <th className="px-4 py-2 font-medium">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!data?.variance_report || !Array.isArray(data.variance_report) || data.variance_report.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                            No variance data available
                          </td>
                        </tr>
                      ) : (
                        data.variance_report.map((row: any, i: number) => {
                          const expected = Number(row.expected ?? row.expected_quantity) ?? 0;
                          const counted = Number(row.counted ?? row.actual ?? row.received_quantity) ?? 0;
                          const diff = Number(row.difference ?? row.variance ?? (counted - expected));
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-medium text-slate-900">{row.sku ?? '—'}</td>
                              <td className="px-4 py-2 text-slate-600">{row.product_name ?? row.product ?? 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-600">{expected}</td>
                              <td className="px-4 py-2 text-slate-600">{counted}</td>
                              <td className={cn(
                                'px-4 py-2 font-bold',
                                diff < 0 ? 'text-red-500' : diff > 0 ? 'text-amber-600' : 'text-emerald-500'
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