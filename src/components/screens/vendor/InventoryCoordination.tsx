import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Edit,
  MoreVertical,
  Download,
  AlertCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  FileText,
  Truck,
  Settings,
  Upload,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { exportToCSV } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import { EmptyState } from '../../ui/ux-components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

import * as vendorInventoryApi from '../../../api/vendor/vendorInventory.api';
import { apiDownloadCsv } from '../../../api/apiClient';
import { getVendors, getVendorSummary } from '../../../api/vendor/vendorManagement.api';

// Types
type VarianceStatus = 'Matched' | 'Discrepancy' | 'Excess';
type AgingPriority = 'Critical' | 'High' | 'Medium' | 'Low';
type StockoutSeverity = 'Critical' | 'High' | 'Medium';

interface StockItem {
  id: string;
  product: string;
  batchId: string;
  warehouse: string;
  systemQty: number;
  physicalQty: number;
  unit: string;
  variance: number;
  variancePercent: number;
  status: VarianceStatus;
}

interface AgingAlert {
  id: string;
  product: string;
  batchId: string;
  vendor: string;
  expiryDate: string;
  daysToExpiry: number;
  priority: AgingPriority;
  quantity: number;
  unit: string;
  value: number;
}

interface AgingInventory {
  id: string;
  product: string;
  batchId: string;
  warehouse: string;
  quantity: number;
  unit: string;
  daysInStock: number;
  expiryDate: string;
  daysToExpiry: number;
  status: string;
}

interface Stockout {
  id: string;
  sku: string;
  product: string;
  vendor: string;
  lastStock: string;
  daysOut: number;
  affectedStores: number;
  impact: number;
  severity: StockoutSeverity;
  // optional runtime flags for UI state
  reorderInitiated?: boolean;
  alerted?: boolean;
}

interface KPI {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendValue: string;
  trendDirection: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  color: string;
  bgColor: string;
  subMetrics: { label: string; value: string }[];
}

export function InventoryCoordination() {
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'aging' | 'stockouts' | 'kpis'>('reconciliation');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AgingAlert | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [agingAlerts, setAgingAlerts] = useState<AgingAlert[]>([]);
  const [agingInventory, setAgingInventory] = useState<AgingInventory[]>([]);
  const [stockouts, setStockouts] = useState<Stockout[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [hubSummary, setHubSummary] = useState<Record<string, unknown> | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  // processing states for async actions
  const [processingReorders, setProcessingReorders] = useState<string[]>([]);
  const [processingAlerts, setProcessingAlerts] = useState<string[]>([]);

  // API integration/loading state
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getVendors({ page: 1, pageSize: 1 });
        const raw = res as Record<string, unknown>;
        const items = raw.data ?? raw.items ?? raw.vendors ?? raw;
        const arr = Array.isArray(items) ? items : [];
        const first = arr[0] as { id?: string; _id?: string } | undefined;
        const id = first?.id ?? first?._id;
        if (mounted && id) setVendorId(String(id));
      } catch (e) {
        console.error(e);
        toast.error('Could not load vendors for inventory');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    let mounted = true;
    (async () => {
      try {
        const s = await getVendorSummary();
        if (!mounted) return;
        const payload = (s as { data?: Record<string, unknown> })?.data ?? (s as Record<string, unknown>);
        setHubSummary(payload && typeof payload === 'object' ? payload : null);
      } catch {
        if (mounted) setHubSummary(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [vendorId]);

  // Load remote data when a vendorId is available.
  useEffect(() => {
    if (!vendorId) return;
    let mounted = true;

    async function loadAll() {
      // KPIs (includes summary data)
      try {
        setLoadingSummary(true);
        const kpisResp = await vendorInventoryApi.getKPIs(vendorId, {});
        if (!mounted) return;
        if (kpisResp.kpis && Array.isArray(kpisResp.kpis)) {
          setKpis(kpisResp.kpis);
        }
      } catch (err) {
        console.error('Failed to fetch KPIs', err);
        toast.error('Failed to load KPIs');
      } finally {
        setLoadingSummary(false);
      }

      // stock list
      try {
        setLoadingStock(true);
        const stockResp = await vendorInventoryApi.listVendorStock(vendorId);
        if (!mounted) return;
        // API may return { total, page, size, items } or { data: [...] }
        const items = stockResp.items || stockResp.data || stockResp;
        setStockItems(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to fetch vendor stock', err);
        toast.error('Failed to load stock items');
      } finally {
        setLoadingStock(false);
      }

      // aging alerts
      try {
        setLoadingAlerts(true);
        const alertsResp = await vendorInventoryApi.getAgingAlerts(vendorId, {});
        if (!mounted) return;
        const alerts = alertsResp.items || alertsResp;
        setAgingAlerts(Array.isArray(alerts) ? alerts : (alerts.items || []));
      } catch (err) {
        console.error('Failed to fetch aging alerts', err);
      } finally {
        setLoadingAlerts(false);
      }

      // stockouts
      try {
        const stockoutsResp = await vendorInventoryApi.getStockouts(vendorId, {});
        if (!mounted) return;
        const stockouts = stockoutsResp.items || stockoutsResp;
        setStockouts(Array.isArray(stockouts) ? stockouts : (stockouts.items || []));
      } catch (err) {
        console.error('Failed to fetch stockouts', err);
      }

      // aging inventory
      try {
        const agingResp = await vendorInventoryApi.getAgingInventory(vendorId, { daysThreshold: 30 });
        if (!mounted) return;
        const aging = agingResp.items || agingResp;
        setAgingInventory(Array.isArray(aging) ? aging : (aging.items || []));
      } catch (err) {
        console.error('Failed to fetch aging inventory', err);
      }

    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [vendorId, inventoryRefreshKey]);

  const downloadItemDetails = (item: StockItem) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['Inventory Item Details', `Date: ${today}`],
        [''],
        ['Product', item.product],
        ['Batch ID', item.batchId],
        ['Warehouse', item.warehouse],
        ['System Quantity', item.systemQty],
        ['Physical Quantity', item.physicalQty],
        ['Unit', item.unit],
        ['Variance', item.variance],
        ['Variance %', `${item.variancePercent}%`],
        ['Status', item.status],
      ];
      exportToCSV(csvData, `inventory-item-${item.product}-${today}`);
      toast.success(`Downloaded details for ${item.product}`);
    } catch (error) {
      toast.error('Failed to download details');
    }
  };

  const downloadFulfillmentReport = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const totalSkus = kpis.find((k) => k.id === 'totalSkus')?.value;
      const delivery = hubSummary?.deliveryTimeliness;
      const csvData: (string | number)[][] = [
        ['Inventory & fulfillment snapshot', `Date: ${today}`, `Time: ${timestamp}`],
        [''],
        ['Delivery timeliness %', delivery != null && delivery !== '' ? String(delivery) : '—'],
        ['Total SKUs', totalSkus != null && totalSkus !== '' ? String(totalSkus) : '—'],
        ['Stockout rows', String(stockouts.length)],
        ['Aging alerts', String(agingAlerts.length)],
        ['Low-stock KPI', kpis.find((k) => k.id === 'lowStock')?.value ?? '—'],
      ];
      exportToCSV(csvData, `fulfillment-report-${today}-${timestamp.replace(/:/g, '-')}`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  // Modal states
  const [showFullFulfillmentModal, setShowFullFulfillmentModal] = useState(false);
  const [showStockoutModal, setShowStockoutModal] = useState(false);
  const [showAgingDetailModal, setShowAgingDetailModal] = useState(false);
  const [showReturnLiquidationModal, setShowReturnLiquidationModal] = useState(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);
  const [monitoringSettings, setMonitoringSettings] = useState({
    criticalThreshold: 5,
    warningThreshold: 10,
    infoThreshold: 15,
    agingThreshold: 60,
    emailNotifications: true,
    inAppNotifications: true,
    smsAlerts: false,
  });

  // Form states
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [newPhysicalCount, setNewPhysicalCount] = useState<number>(0);

  // Sync stock function
  const handleSync = () => {
    if (!vendorId) {
      toast.error('Wait for vendor data to load, then try again');
      return;
    }

    (async () => {
      try {
        setSyncing(true);
        await vendorInventoryApi.triggerInventorySync(vendorId);
        toast.success('Inventory sync completed');
        setInventoryRefreshKey((k) => k + 1);
      } catch (err) {
        console.error('Sync error', err);
        toast.error('Failed to sync inventory');
      } finally {
        setSyncing(false);
      }
    })();
  };

  // Get variance badge color
  const getVarianceColor = (status: VarianceStatus) => {
    switch (status) {
      case 'Matched':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'Discrepancy':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Excess':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  // Get aging priority color
  const getAgingColor = (priority: AgingPriority) => {
    switch (priority) {
      case 'Critical':
        return { border: '#EF4444', text: '#EF4444', bg: '#FEE2E2' };
      case 'High':
        return { border: '#F59E0B', text: '#F59E0B', bg: '#FEF3C7' };
      case 'Medium':
        return { border: '#F59E0B', text: '#F59E0B', bg: '#FFFBEB' };
      case 'Low':
        return { border: '#FBBF24', text: '#FBBF24', bg: '#FEF9C3' };
      default:
        return { border: '#E5E7EB', text: '#6B7280', bg: '#F9FAFB' };
    }
  };


  // helpers
  const computeVariance = (systemQty: number, physicalQty: number) => {
    const variance = physicalQty - systemQty;
    const variancePercent = systemQty ? Math.round((variance / systemQty) * 100) : 0;
    const status: VarianceStatus = variance === 0 ? 'Matched' : variance < 0 ? 'Discrepancy' : 'Excess';
    return { variance, variancePercent, status };
  };

  const createAgingAlertFromInventory = (item: AgingInventory): AgingAlert => ({
    id: item.id,
    product: item.product,
    batchId: item.batchId,
    vendor: 'Unknown Vendor',
    expiryDate: item.expiryDate,
    daysToExpiry: item.daysToExpiry,
    priority: item.status === 'Critical' ? 'Critical' : item.status === 'Warning' ? 'High' : 'Low',
    quantity: item.quantity,
    unit: item.unit,
    value: 0,
  });

  // action handlers
  const handleConfirmAdjustment = () => {
    if (!selectedStock) return;
    if (!adjustmentReason) {
      toast.error('Please select a reason for adjustment');
      return;
    }
    if (Number.isNaN(Number(newPhysicalCount)) || Number(newPhysicalCount) < 0) {
      toast.error('Enter a valid physical count');
      return;
    }

    setAdjusting(true);

    // snapshot for rollback
    const before = stockItems.find((it) => it.id === selectedStock.id);
    const beforeClone = before ? { ...before } : null;

    // optimistic update
    setStockItems((prev) =>
      prev.map((it) => {
        if (it.id !== selectedStock.id) return it;
        const newPhysical = Number(newPhysicalCount);
        const { variance, variancePercent, status } = computeVariance(it.systemQty, newPhysical);
        const updated = { ...it, physicalQty: newPhysical, variance, variancePercent, status };
        setSelectedStock(updated);
        return updated;
      })
    );

    (async () => {
      if (!vendorId) {
        toast.error('No vendor context');
        setAdjusting(false);
        return;
      }
      try {
        await vendorInventoryApi.reconcileInventory(vendorId, {
          items: [
            {
              sku: String(selectedStock.batchId || selectedStock.id),
              expectedQty: selectedStock.systemQty,
              reportedQty: Number(newPhysicalCount),
            },
          ],
        });
        toast.success(`Inventory adjusted for ${selectedStock.product}`);
        setShowAdjustModal(false);
        setAdjustmentReason('');
        setAdjustmentNotes('');
        setInventoryRefreshKey((k) => k + 1);
      } catch (err: unknown) {
        if (beforeClone) {
          setStockItems((prev) => prev.map((it) => (it.id === beforeClone.id ? beforeClone : it)));
          setSelectedStock(beforeClone);
        }
        const msg = err instanceof Error ? err.message : 'Please try again';
        toast.error(`Adjustment failed: ${msg}`);
      } finally {
        setAdjusting(false);
      }
    })();
  };

  const handleReorder = (_id: string) => {
    toast.info('Reorder is not available from the API yet.');
  };

  const handleAlertVendor = (_id: string) => {
    toast.info('Vendor alert is not available from the API yet.');
  };

  const handleBulkReorder = () => {
    toast.info('Bulk reorder is not available from the API yet.');
  };

  const handleAlertAllVendors = () => {
    toast.info('Bulk vendor alert is not available from the API yet.');
  };

  const handleAgingReturn = (item: AgingInventory) => {
    const alert = createAgingAlertFromInventory(item);
    setSelectedAlert(alert);
    setShowReturnLiquidationModal(true);
  };

  const handleAgingLiquidate = (_item: AgingInventory) => {
    toast.info('Liquidation is not available from the API yet.');
  };

  // initiate return flow from modal or row
  const handleInitiateReturn = (alertArg?: AgingAlert) => {
    const alertToUse = alertArg || selectedAlert;
    if (!alertToUse) {
      toast.error('No alert selected for return');
      return;
    }
    toast.info('Return initiation is not available from the API yet.');
    setShowReturnLiquidationModal(false);
  };

  // helper used by modal 'Create Liquidation' to act on selectedAlert
  const handleCreateLiquidation = () => {
    if (!selectedAlert) {
      toast.error('No item selected for liquidation');
      return;
    }
    // find inventory item and call liquidation handler
    const inv = agingInventory.find((a) => a.id === selectedAlert.id);
    if (!inv) {
      toast.error('Inventory item not found');
      return;
    }
    handleAgingLiquidate(inv);
    setShowReturnLiquidationModal(false);
  };

  const totalSkusKpi = kpis.find((k) => k.id === 'totalSkus');
  const stockoutKpi = kpis.find((k) => k.id === 'stockouts');
  const lowStockKpi = kpis.find((k) => k.id === 'lowStock');
  const deliveryPctRaw = hubSummary?.deliveryTimeliness;
  const deliveryPct =
    deliveryPctRaw != null && deliveryPctRaw !== ''
      ? Number(deliveryPctRaw)
      : null;
  const deliveryBar =
    deliveryPct != null && !Number.isNaN(deliveryPct)
      ? `${Math.min(100, Math.max(0, deliveryPct))}%`
      : '0%';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Coordination"
        subtitle="Stock reconciliation, aging alerts, and supply performance"
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Stock'}
          </button>
        }
      />

      {/* Two-Column Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Vendor Supply Performance */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#1F2937] mb-6">Vendor Supply Performance</h2>
          
          <div className="space-y-4">
            {/* Full Fulfillment */}
            <div
              onClick={() => setShowFullFulfillmentModal(true)}
              className="bg-[#F0FDF4] border-l-4 border-[#10B981] rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-[#10B981]" />
                  <div>
                    <p className="text-sm font-bold text-[#1F2937]">Hub delivery &amp; SKU coverage</p>
                    <p className="text-xs text-[#6B7280]">
                      Total SKUs: {totalSkusKpi?.value ?? '—'}
                      {lowStockKpi ? ` · Low stock: ${lowStockKpi.value}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#10B981]">
                    {deliveryPct != null && !Number.isNaN(deliveryPct) ? `${deliveryPct}%` : '—'}
                  </p>
                  <p className="text-xs text-[#10B981]">Delivery timeliness (hub)</p>
                </div>
              </div>
              
              <div className="w-full bg-[#D1FAE5] rounded-full h-2 mb-3">
                <div className="bg-[#10B981] h-2 rounded-full" style={{ width: deliveryBar }} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
                <div>
                  Active vendors (hub):{' '}
                  <span className="font-bold text-[#1F2937]">
                    {hubSummary?.totalVendors != null ? String(hubSummary.totalVendors) : '—'}
                  </span>
                </div>
                <div>
                  Open POs:{' '}
                  <span className="font-bold text-[#1F2937]">
                    {hubSummary?.openPOs != null ? String(hubSummary.openPOs) : '—'}
                  </span>
                </div>
                <div>
                  Critical alerts:{' '}
                  <span className="font-bold text-[#1F2937]">
                    {hubSummary?.criticalAlerts != null ? String(hubSummary.criticalAlerts) : '—'}
                  </span>
                </div>
                <div>
                  SLA compliance:{' '}
                  <span className="font-bold text-[#10B981]">
                    {hubSummary?.slaCompliance != null ? `${hubSummary.slaCompliance}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stockouts */}
            <div
              onClick={() => setShowStockoutModal(true)}
              className="bg-[#FEF2F2] border-l-4 border-[#EF4444] rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-[#EF4444] animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-[#1F2937]">Stockouts</p>
                    <p className="text-xs text-[#6B7280]">
                      {stockoutKpi?.value ?? stockouts.length} SKU
                      {Number(stockoutKpi?.value ?? stockouts.length) === 1 ? '' : 's'} (API)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-[#EF4444] text-white text-xs font-bold rounded-full">
                    {stockouts.length > 0 ? 'Review' : 'OK'}
                  </span>
                  <p className="text-xs text-[#EF4444] mt-1">
                    {stockouts.length > 0 ? 'Needs attention' : 'No open stockouts'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
                <div>
                  Listed rows: <span className="font-bold text-[#1F2937]">{stockouts.length}</span>
                </div>
                <div>
                  Aging alerts: <span className="font-bold text-[#1F2937]">{agingAlerts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stock Aging Alerts */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1F2937]">Stock Aging Alerts</h2>
              <span className="px-3 py-1 bg-[#FEE2E2] text-[#EF4444] text-xs font-bold rounded-full">
              {agingAlerts.length} Alerts
            </span>
          </div>

          <div className="space-y-0 max-h-[300px] overflow-y-auto custom-scrollbar pr-2" aria-label="stock-aging-alerts">
            {agingAlerts.map((alert) => {
              const colors = getAgingColor(alert.priority);
              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setShowAgingDetailModal(true);
                  }}
                  className="border-b border-[#E5E7EB] last:border-b-0 p-4 hover:bg-[#F9FAFB] cursor-pointer transition-all duration-200"
                  style={{ borderLeft: `3px solid ${colors.border}` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#1F2937] mb-1">
                        {alert.product} (Batch {alert.batchId})
                      </p>
                      <p className="text-xs text-[#6B7280] mb-2">Vendor: {alert.vendor}</p>
                      <p className="text-xs font-bold" style={{ color: colors.text }}>
                        Expires in {alert.daysToExpiry} day{alert.daysToExpiry !== 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                          setShowReturnLiquidationModal(true);
                        }}
                        className="text-xs font-bold text-[#4F46E5] hover:underline mt-1"
                      >
                        {alert.priority === 'Critical' ? 'Return / Liquidation' : 'Monitor'}
                      </button>
                    </div>
                    <Clock className="w-5 h-5 flex-shrink-0" style={{ color: colors.text }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setShowAllAlertsModal(true);
            }}
            className="w-full text-center text-xs font-bold text-[#4F46E5] hover:underline mt-4"
          >
            View All Alerts ({agingAlerts.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-[#E5E7EB]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'reconciliation'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Stock Reconciliation
            {activeTab === 'reconciliation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'aging'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Aging Inventory
            {activeTab === 'aging' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('stockouts')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'stockouts'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Stockout Management
            {activeTab === 'stockouts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'kpis'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Supply Performance KPIs
            {activeTab === 'kpis' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Batch ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-center">System Qty</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-center">Physical Qty</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-center">Variance</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {stockItems.map((item) => {
                  const colors = getVarianceColor(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#212121]">{item.product}</td>
                      <td className="px-6 py-4 font-mono text-[#616161]">{item.batchId}</td>
                      <td className="px-6 py-4 text-[#616161]">{item.warehouse}</td>
                      <td className="px-6 py-4 text-center text-[#616161]">
                        {item.systemQty} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-[#212121]">
                        {item.physicalQty} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="font-bold"
                          style={{
                            color: item.variance === 0 ? '#10B981' : item.variance < 0 ? '#EF4444' : '#0EA5E9'
                          }}
                        >
                          {item.variance > 0 ? '+' : ''}{item.variance} {item.unit} ({item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {item.status === 'Matched' && <CheckCircle className="w-3 h-3" />}
                          {item.status === 'Discrepancy' && <XCircle className="w-3 h-3" />}
                          {item.status === 'Excess' && <AlertCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 overflow-x-auto max-w-full custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                          {item.status !== 'Matched' && (
                            <button
                            onClick={() => {
                              setSelectedStock(item);
                              setNewPhysicalCount(item.physicalQty);
                              setShowAdjustModal(true);
                            }}
                              className="px-3 py-1.5 bg-[#0EA5E9] text-white text-xs font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200"
                            >
                              Adjust
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStock(item);
                              setShowDetailsModal(true);
                            }}
                            className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200"
                          >
                            {item.status === 'Matched' ? 'View' : 'Details'}
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreMenu(showMoreMenu === item.id ? null : item.id);
                              }}
                              className="p-1.5 border border-[#E0E0E0] rounded hover:bg-[#F5F5F5] transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4 text-[#757575]" />
                            </button>
                            {showMoreMenu === item.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowMoreMenu(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E0E0E0] rounded-lg shadow-lg z-20">
                                  <button
                                    onClick={() => {
                                      setSelectedStock(item);
                                      setShowDetailsModal(true);
                                      setShowMoreMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2 rounded-t-lg"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      downloadItemDetails(item);
                                      setShowMoreMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </button>
                                  <button
                                    onClick={() => {
                                      toast.success(`Printed label for ${item.product}`);
                                      setShowMoreMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2 rounded-b-lg"
                                  >
                                    <Printer className="w-4 h-4" />
                                    Print Label
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'aging' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Batch</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Qty</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Days in Stock</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Expiry Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {agingInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#212121]">{item.product}</td>
                    <td className="px-6 py-4 font-mono text-[#616161]">{item.batchId}</td>
                    <td className="px-6 py-4 text-[#616161]">{item.warehouse}</td>
                    <td className="px-6 py-4 text-[#616161]">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="font-medium"
                        style={{
                          color: item.daysInStock < 30 ? '#10B981' : item.daysInStock < 60 ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        {item.daysInStock} days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="font-medium"
                        style={{
                          color: item.daysToExpiry > 15 ? '#10B981' : item.daysToExpiry > 5 ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        {item.expiryDate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 overflow-x-auto max-w-full custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                        {item.status === 'Critical' && (
                          <>
                            <span className="text-xs font-bold text-[#EF4444]">
                              Expires in {item.daysToExpiry} days
                            </span>
                            <button
                              onClick={() => handleAgingReturn(item)}
                              className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-medium rounded-md hover:bg-[#DC2626]"
                            >
                              Return
                            </button>
                            <button
                              onClick={() => handleAgingLiquidate(item)}
                              className="px-3 py-1.5 bg-[#F97316] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                            >
                              Liquidate
                            </button>
                          </>
                        )}
                        {item.status === 'Warning' && (
                          <>
                            <span className="text-xs font-bold text-[#F59E0B]">
                              Expires in {item.daysToExpiry} days
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAlert(createAgingAlertFromInventory(item));
                                setShowMonitoringModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#F59E0B] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                            >
                              Monitor
                            </button>
                          </>
                        )}
                        {item.status === 'Safe' && (
                          <>
                            <span className="text-xs font-bold text-[#10B981]">Safe</span>
                            <button
                              onClick={() => {
                                setSelectedAlert(createAgingAlertFromInventory(item));
                                setShowAgingDetailModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                            >
                              View
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stockouts' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">SKU</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Last Stock</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Days Out</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Affected Stores</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Impact</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {stockouts.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#616161]">{item.sku}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{item.product}</td>
                    <td className="px-6 py-4 text-[#616161]">{item.vendor}</td>
                    <td className="px-6 py-4 text-[#616161]">{item.lastStock}</td>
                    <td className="px-6 py-4">
                      <span
                        className="font-bold"
                        style={{
                          color: item.severity === 'Critical' ? '#EF4444' : item.severity === 'High' ? '#F59E0B' : '#FB923C'
                        }}
                      >
                        {item.daysOut} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-[#212121]">
                      {item.affectedStores} stores
                    </td>
                    <td className="px-6 py-4 font-bold text-[#EF4444]">
                      ₹{(item.impact / 1000).toFixed(1)}K
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 overflow-x-auto max-w-full custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                        <button
                          onClick={() => handleReorder(item.id)}
                          disabled={processingReorders.includes(item.id)}
                          className="px-3 py-1.5 bg-[#10B981] text-white text-xs font-medium rounded-md hover:bg-[#059669] disabled:opacity-60"
                        >
                          {(item.reorderInitiated || processingReorders.includes(item.id)) ? 'Reordering...' : 'Reorder'}
                        </button>
                        <button
                          onClick={() => handleAlertVendor(item.id)}
                          disabled={processingAlerts.includes(item.id)}
                          className="px-3 py-1.5 bg-[#F97316] text-white text-xs font-medium rounded-md hover:bg-[#EA580C] disabled:opacity-60"
                        >
                          {(item.alerted || processingAlerts.includes(item.id)) ? 'Alerted' : 'Alert'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'kpis' && (
        <div className="grid grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-white border border-[#E5E7EB] rounded-lg p-6 hover:shadow-md transition-all cursor-pointer"
              style={{ borderLeft: `4px solid ${kpi.color}`, backgroundColor: kpi.bgColor }}
              onClick={() => toast.success(`Viewing details for ${kpi.label}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-[#1F2937] mb-2">{kpi.label}</p>
                  <p className="text-[28px] font-bold" style={{ color: kpi.color }}>
                    {kpi.value}
                  </p>
                </div>
                {kpi.trendDirection === 'up' && (
                  <div className="flex items-center gap-1 text-[#10B981]">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-xs font-medium">{kpi.trend}</span>
                  </div>
                )}
                {kpi.trendDirection === 'down' && (
                  <div className="flex items-center gap-1 text-[#EF4444]">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-xs font-medium">{kpi.trend}</span>
                  </div>
                )}
                {kpi.trendDirection === 'stable' && (
                  <div className="flex items-center gap-1 text-[#6B7280]">
                    <Minus className="w-4 h-4" />
                    <span className="text-xs font-medium">{kpi.trend}</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-[#6B7280] mb-3">{kpi.trendValue}</p>
              
              <div className="space-y-2">
                {kpi.subMetrics.map((metric, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-[#6B7280]">{metric.label}:</span>
                    <span className="font-medium text-[#1F2937]">{metric.value}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: kpi.status === 'good' ? '#DCFCE7' : kpi.status === 'warning' ? '#FEF3C7' : '#FEE2E2',
                    color: kpi.status === 'good' ? '#166534' : kpi.status === 'warning' ? '#92400E' : '#991B1B'
                  }}
                >
                  {kpi.status === 'good' && '✓ GOOD'}
                  {kpi.status === 'warning' && '⚠ NEEDS ATTENTION'}
                  {kpi.status === 'critical' && '⚠ ACTION NEEDED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Full Fulfillment Details */}
      <Dialog open={showFullFulfillmentModal} onOpenChange={setShowFullFulfillmentModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="full-fulfillment-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Full Fulfillment Performance
            </DialogTitle>
            <DialogDescription id="full-fulfillment-description" className="text-sm text-[#6B7280]">
              Vendor Supply Status
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Performance Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Total SKUs</p>
                <p className="text-2xl font-bold text-[#1F2937]">1,240</p>
              </div>
              <div className="bg-[#F0FDF4] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">On Schedule</p>
                <p className="text-2xl font-bold text-[#10B981]">1,177</p>
                <p className="text-xs text-[#6B7280]">(95%)</p>
              </div>
              <div className="bg-[#FEF3C7] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Partial</p>
                <p className="text-2xl font-bold text-[#F59E0B]">47</p>
                <p className="text-xs text-[#6B7280]">(3.8%)</p>
              </div>
              <div className="bg-[#FEE2E2] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Late</p>
                <p className="text-2xl font-bold text-[#EF4444]">16</p>
                <p className="text-xs text-[#6B7280]">(1.2%)</p>
              </div>
            </div>

            {/* Top Performers */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Top Performing Vendors</h3>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">On-Time %</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">SKUs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    <tr>
                      <td className="px-4 py-2 text-[#1F2937]">Fresh Farms Inc.</td>
                      <td className="px-4 py-2 font-bold text-[#10B981]">98%</td>
                      <td className="px-4 py-2 text-[#6B7280]">450</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-[#1F2937]">Dairy Delights</td>
                      <td className="px-4 py-2 font-bold text-[#10B981]">96%</td>
                      <td className="px-4 py-2 text-[#6B7280]">320</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-[#1F2937]">Global Spices</td>
                      <td className="px-4 py-2 font-bold text-[#10B981]">94%</td>
                      <td className="px-4 py-2 text-[#6B7280]">280</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={downloadFulfillmentReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowFullFulfillmentModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Stockout Details */}
      <Dialog open={showStockoutModal} onOpenChange={setShowStockoutModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="stockout-mgmt-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Stockout Management
            </DialogTitle>
            <DialogDescription id="stockout-mgmt-description" className="text-sm text-[#EF4444]">
              12 SKUs Currently Out of Stock
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Days Out</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {stockouts.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-[#1F2937]">{item.product}</td>
                      <td className="px-4 py-2 text-[#6B7280]">{item.vendor}</td>
                      <td className="px-4 py-2 font-bold text-[#EF4444]">{item.daysOut} days</td>
                      <td className="px-4 py-2 font-bold text-[#EF4444]">₹{(item.impact / 1000).toFixed(1)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#1F2937] mb-2">Vendor Response Times</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#6B7280]">Average</p>
                  <p className="font-bold text-[#1F2937]">3.2 days</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Fastest</p>
                  <p className="font-bold text-[#10B981]">1.5 days</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Slowest</p>
                  <p className="font-bold text-[#EF4444]">5.8 days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={handleBulkReorder}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669] transition-all duration-200"
            >
              Bulk Reorder
            </button>
            <button
              onClick={handleAlertAllVendors}
              className="px-6 py-2.5 bg-[#F97316] text-white text-sm font-medium rounded-md hover:bg-[#EA580C] transition-all duration-200"
            >
              Alert All Vendors
            </button>
            <button
              onClick={() => setShowStockoutModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Stock Aging Detail */}
      <Dialog open={showAgingDetailModal} onOpenChange={setShowAgingDetailModal}>
        <DialogContent className="max-w-[650px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="stock-aging-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Stock Aging Details
            </DialogTitle>
            <DialogDescription id="stock-aging-details-description" className="text-sm text-[#6B7280]">
              {selectedAlert?.product} (Batch {selectedAlert?.batchId})
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Product</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedAlert.product}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Batch ID</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedAlert.batchId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                  <p className="text-sm text-[#1F2937]">{selectedAlert.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Current Stock</p>
                  <p className="text-sm font-bold text-[#1F2937]">
                    {selectedAlert.quantity} {selectedAlert.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Expiry Date</p>
                  <p className="text-sm font-bold text-[#EF4444]">{selectedAlert.expiryDate}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Value</p>
                  <p className="text-sm font-bold text-[#1F2937]">₹{selectedAlert.value.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-4 rounded-lg">
                <p className="text-sm font-bold text-[#EF4444] mb-2">
                  ⚠ Expires in {selectedAlert.daysToExpiry} days
                </p>
                <p className="text-xs text-[#6B7280]">
                  Immediate action required to prevent loss
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Recommended Actions</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <input type="radio" name="action" className="w-4 h-4 text-[#4F46E5]" />
                    <div>
                      <p className="text-sm font-medium text-[#1F2937]">Return to vendor</p>
                      <p className="text-xs text-[#6B7280]">Full refund, 2-3 days processing</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <input type="radio" name="action" className="w-4 h-4 text-[#4F46E5]" />
                    <div>
                      <p className="text-sm font-medium text-[#1F2937]">Liquidate at discount</p>
                      <p className="text-xs text-[#6B7280]">30% discount, ~70% revenue recovery</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <input type="radio" name="action" className="w-4 h-4 text-[#4F46E5]" />
                    <div>
                      <p className="text-sm font-medium text-[#1F2937]">Donate</p>
                      <p className="text-xs text-[#6B7280]">Tax benefit, local NGO</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAgingDetailModal(false);
                setShowReturnLiquidationModal(true);
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
            >
              Return to Vendor
            </button>
            <button
              onClick={() => setShowAgingDetailModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Return/Liquidation Options */}
      <Dialog open={showReturnLiquidationModal} onOpenChange={setShowReturnLiquidationModal}>
        <DialogContent className="max-w-[600px] p-0" aria-describedby="return-liquidation-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Return / Liquidation Options
            </DialogTitle>
            <DialogDescription id="return-liquidation-description" className="text-sm text-[#6B7280]">
              Select an option to handle aging or expiring stock
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            {/* Option 1: Return */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#4F46E5] cursor-pointer transition-colors">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Option 1: Return to Vendor</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Refund amount:</span>
                  <span className="font-bold text-[#10B981]">₹{selectedAlert?.value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Processing time:</span>
                  <span className="text-[#1F2937]">2-3 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Return shipping:</span>
                  <span className="text-[#1F2937]">Vendor arranges</span>
                </div>
              </div>
              <button
                onClick={() => handleInitiateReturn()}
                className="w-full px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]"
              >
                Initiate Return
              </button>
            </div>

            {/* Option 2: Liquidation */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#F97316] cursor-pointer transition-colors">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Option 2: Liquidation Sale</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Proposed discount:</span>
                  <span className="font-bold text-[#F97316]">30%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Expected revenue:</span>
                  <span className="font-bold text-[#F59E0B]">
                    ₹{selectedAlert ? (selectedAlert.value * 0.7).toLocaleString() : 0} (70%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Time to clear:</span>
                  <span className="text-[#1F2937]">2-3 days</span>
                </div>
              </div>
              <button
                onClick={() => handleCreateLiquidation()}
                className="w-full px-4 py-2 bg-[#F97316] text-white text-sm font-medium rounded-md hover:bg-[#EA580C]"
              >
                Create Liquidation
              </button>
            </div>

            {/* Option 3: Donation */}
            <div className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#10B981] cursor-pointer transition-colors">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Option 3: Donation</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Recipient:</span>
                  <span className="text-[#1F2937]">Local NGO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Tax benefit:</span>
                  <span className="text-[#10B981]">80G eligible</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Logistics:</span>
                  <span className="text-[#1F2937]">We arrange</span>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.success('Donation arranged');
                  setShowReturnLiquidationModal(false);
                }}
                className="w-full px-4 py-2 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
              >
                Arrange Donation
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end">
            <button
              onClick={() => setShowReturnLiquidationModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Monitoring Settings */}
      <Dialog open={showMonitoringModal} onOpenChange={setShowMonitoringModal}>
        <DialogContent className="max-w-[500px] p-0" aria-describedby="monitoring-settings-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Stock Monitoring Settings
            </DialogTitle>
            <DialogDescription id="monitoring-settings-description" className="text-sm text-[#6B7280]">
              Configure alert thresholds and notification preferences
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Alert Thresholds</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.criticalThreshold <= 5}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, criticalThreshold: e.target.checked ? 5 : 0 }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">Alert when expires in &lt; 5 days (critical)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.warningThreshold <= 10 && monitoringSettings.warningThreshold > 5}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, warningThreshold: e.target.checked ? 10 : 0 }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">Alert when expires in 5-10 days (warning)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.infoThreshold <= 15 && monitoringSettings.infoThreshold > 10}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, infoThreshold: e.target.checked ? 15 : 0 }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">Alert when expires in 10-15 days (info)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.agingThreshold >= 60}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, agingThreshold: e.target.checked ? 60 : 0 }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">Alert when stock is &gt;60 days old</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Notification Settings</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.emailNotifications}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">Email notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.inAppNotifications}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, inAppNotifications: e.target.checked }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">In-app notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={monitoringSettings.smsAlerts}
                    onChange={(e) => setMonitoringSettings(prev => ({ ...prev, smsAlerts: e.target.checked }))}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                  <span className="text-sm text-[#1F2937]">SMS alerts</span>
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowMonitoringModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Update selected alert if present
                if (selectedAlert) {
                  setAgingAlerts((prev) => prev.map((a) => (a.id === selectedAlert.id ? { ...a, monitored: true } : a)));
                }
                toast.success('Monitoring settings saved');
                setShowMonitoringModal(false);
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
            >
              Save Settings
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Adjust Inventory */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="adjust-inventory-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Adjust Inventory
            </DialogTitle>
            <DialogDescription id="adjust-inventory-description" className="text-sm text-[#6B7280]">
              {selectedStock?.product} | Batch {selectedStock?.batchId}
            </DialogDescription>
          </DialogHeader>

          {selectedStock && (
            <div className="px-6 py-6 space-y-6">
              <div className="bg-[#F9FAFB] p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">System Quantity:</span>
                  <span className="font-bold text-[#1F2937]">{selectedStock.systemQty} {selectedStock.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Physical Quantity:</span>
                  <span className="font-bold text-[#1F2937]">{selectedStock.physicalQty} {selectedStock.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Discrepancy:</span>
                  <span className="font-bold text-[#EF4444]">
                    {selectedStock.variance} {selectedStock.unit} ({selectedStock.variancePercent}%)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  New Physical Count
                </label>
                <input
                  type="number"
                  value={newPhysicalCount}
                  onChange={(e) => setNewPhysicalCount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Reason for Adjustment <span className="text-red-500">*</span>
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Select a reason...</option>
                  <option value="damage">Damage during handling</option>
                  <option value="measurement">Measurement error</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="shrinkage">Evaporation/Shrinkage</option>
                  <option value="previous">Previous discrepancy</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any additional details..."
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
                  <span className="text-sm text-[#1F2937]">Physically re-verified</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
                  <span className="text-sm text-[#1F2937]">Reason documented</span>
                </label>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowAdjustModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAdjustment}
              disabled={adjusting}
              className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200 disabled:opacity-50"
            >
              {adjusting ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 7: Inventory Details */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="inventory-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Inventory Details
            </DialogTitle>
            <DialogDescription id="inventory-details-description" className="text-sm text-[#6B7280]">
              {selectedStock?.product} - Batch {selectedStock?.batchId}
            </DialogDescription>
          </DialogHeader>

          {selectedStock && (
            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Product</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedStock.product}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Batch ID</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedStock.batchId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Warehouse</p>
                  <p className="text-sm text-[#1F2937]">{selectedStock.warehouse}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">System Qty</p>
                  <p className="text-sm font-bold text-[#1F2937]">{selectedStock.systemQty} {selectedStock.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Physical Qty</p>
                  <p className="text-sm font-bold text-[#1F2937]">{selectedStock.physicalQty} {selectedStock.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Status</p>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{
                      backgroundColor: getVarianceColor(selectedStock.status).bg,
                      color: getVarianceColor(selectedStock.status).text
                    }}
                  >
                    {selectedStock.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Transaction History</h3>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      <tr>
                        <td className="px-4 py-2 text-[#6B7280]">Dec 19, 2024</td>
                        <td className="px-4 py-2 text-[#1F2937]">Physical Count</td>
                        <td className="px-4 py-2 font-mono text-[#1F2937]">{selectedStock.physicalQty} {selectedStock.unit}</td>
                        <td className="px-4 py-2 text-[#6B7280]">Admin</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-[#6B7280]">Dec 15, 2024</td>
                        <td className="px-4 py-2 text-[#1F2937]">Receipt</td>
                        <td className="px-4 py-2 font-mono text-[#10B981]">+{selectedStock.systemQty} {selectedStock.unit}</td>
                        <td className="px-4 py-2 text-[#6B7280]">System</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => selectedStock && downloadItemDetails(selectedStock)}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 8: View All Alerts */}
      <Dialog open={showAllAlertsModal} onOpenChange={setShowAllAlertsModal}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="all-alerts-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              All Stock Aging Alerts
            </DialogTitle>
            <DialogDescription id="all-alerts-description" className="text-sm text-[#6B7280]">
              {agingAlerts.length} active alerts
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <div className="space-y-4">
              {agingAlerts.map((alert) => {
                const colors = getAgingColor(alert.priority);
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowAllAlertsModal(false);
                      setShowAgingDetailModal(true);
                    }}
                    className="border border-[#E5E7EB] rounded-lg p-4 hover:bg-[#F9FAFB] cursor-pointer transition-all duration-200"
                    style={{ borderLeft: `4px solid ${colors.border}` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-bold text-[#1F2937]">
                            {alert.product} (Batch {alert.batchId})
                          </p>
                          <span
                            className="px-2 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mb-1">Vendor: {alert.vendor}</p>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-[#6B7280]">Quantity</p>
                            <p className="font-bold text-[#1F2937]">
                              {alert.quantity} {alert.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#6B7280]">Expiry Date</p>
                            <p className="font-bold text-[#EF4444]">{alert.expiryDate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#6B7280]">Value</p>
                            <p className="font-bold text-[#1F2937]">₹{alert.value.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs font-bold mt-2" style={{ color: colors.text }}>
                          ⚠ Expires in {alert.daysToExpiry} day{alert.daysToExpiry !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Clock className="w-5 h-5 flex-shrink-0 ml-4" style={{ color: colors.text }} />
                    </div>
                  </div>
                );
              })}
              {agingAlerts.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                  <p className="text-sm text-[#6B7280]">No active aging alerts</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowAllAlertsModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
