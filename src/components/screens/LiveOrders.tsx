import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useScreenTab } from '../../hooks/useScreenUrlState';
import { Filter, MoreHorizontal, Clock, Package, Bike, User, AlertCircle, ArrowRight, Search, CheckCircle2, XCircle, ChevronDown, AlertTriangle, MapPin, Phone, Truck, ShoppingBag, Ban, CircleDot, AlertOctagon } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "sonner";
import { callCustomer, markRTO, updateOrder, assignOrder, startPicking, completePicking, getOrderActionLogs, getOrderById } from '../../api/dashboard/orders.api';
import { generateLabel } from '../../api/utilities/utilitiesApi';
import { getAvailablePickers } from '../../api/darkstore/pickers.api';
import { websocketService } from '../../utils/websocket';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { EmptyState, LoadingState, SelectionSummaryBar, ResultCount } from '../ui/ux-components';
import { LiveOrdersKanban } from '../darkstore/LiveOrdersKanban';
import { slaRowClassName } from '../darkstore/slaRowStyles';
import { mapBackendStatusToUi, toApiStatus, isUnassigned, isExpressOrder, isSlaCritical, isOrderException, shouldSuggestReassign } from '../../utils/orderWorkflow';
import { OrderJourneyStepper } from '../darkstore/OrderJourneyStepper';
import { OrderRowQuickActions } from '../darkstore/OrderRowQuickActions';
import { getLiveOrders } from '../../api/dashboard';
import { LayoutGrid, List } from 'lucide-react';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { StoreRequiredGuard } from '../darkstore/StoreRequiredGuard';
import { DarkstoreTabBar } from '../darkstore/DarkstoreTabBar';
import { AlertCard } from '../darkstore/AlertCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { OrderDetailsDrawer } from '../darkstore/OrderDetailsDrawer';
import { DarkstoreSheetContent } from '../darkstore/DarkstoreSheetContent';
import { useDarkstore } from '../darkstore/DarkstoreProvider';
import { Button } from '../ui/button';
import { ConfirmationDialog, StatusChangeConfirmation } from '../ui/confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ActionLogsTimeline } from '../ui/action-logs-timeline';
import { exportToCSV } from '../../utils/csvExport';
import { getPendingOrderSearch } from '../../utils/pendingOrderSearch';
import { getPaymentDisplay } from '../../utils/orderPaymentDisplay';

function resolveOrderId(order: { order_id?: string; id?: string }): string {
  return String(order.order_id || order.id || '').replace(/^#/, '').trim();
}

function transformBackendOrder(order: any) {
  return {
    id: `#${order.order_id}`,
    order_id: order.order_id,
    store_id: order.store_id || '',
    customer: order.customer_name || 'Customer',
    customerPhone: order.customer_phone || '',
    deliveryAddress: order.delivery_address || 'Not available',
    deliveryNotes: order.delivery_notes || '',
    itemsList: (Array.isArray(order.items) ? order.items : []).map((it: any) => ({
      productName: it.productName || 'Item',
      quantity: it.quantity || 1,
      price: it.price || 0,
      image: it.image || '',
      variantSize: it.variantSize || '',
    })),
    items: order.item_count ?? (Array.isArray(order.items) ? order.items.length : 0),
    zone: order.zone || '',
    sla: order.sla_timer,
    sla_deadline: order.sla_deadline,
    status: mapBackendStatusToUi(order.status),
    bagId: order.bagId || '',
    rackLocation: order.rackLocation || '',
    readyForDispatch: !!(order.bagId && order.rackLocation),
    urgency: order.sla_status === 'critical' ? 'critical' : order.sla_status === 'warning' ? 'warning' : 'normal',
    assignee: order.assignee?.name || order.pickerAssignment?.pickerName || '-',
    assigneeId: order.assignee?.id || order.pickerAssignment?.pickerId || '',
    assigneeInitials: order.assignee?.initials || order.pickerAssignment?.pickerName?.slice(0, 2).toUpperCase() || 'UA',
    order_type: order.order_type,
    created_at: order.created_at,
    timeline: order.timeline || [],
    pickingData: order.pickingData || {},
    pickerAssignment: order.pickerAssignment || {},
    missingItems: (order.pickingData?.missingItems || order.missingItems || []).map((mi: any) => ({
      productName: mi.productName || 'Item',
      expectedQty: mi.orderedQty ?? mi.quantity ?? mi.expectedQty ?? '—',
      quantity: mi.scannedQty ?? mi.quantity ?? '—',
      status: (mi.orderedQty ?? 0) > (mi.scannedQty ?? 0) ? 'not_found' : (mi.status || 'not_found'),
      pickerName: order.pickerAssignment?.pickerName || mi.pickerName || mi.markedBy || '—',
    })),
    supportTicketId: order.supportTicketId || '',
    refundStatus: order.refundStatus || '',
    cancellationReason: order.cancellationReason || '',
    itemStatus: order.itemStatus || {},
    payment_status: order.payment_status || 'pending',
    payment_method: order.payment_method || 'cash',
    total_bill: order.total_bill || 0,
  };
}

function applyAssignResponseToOrder(order: any, res: any) {
  const assigneeName = res.assignee?.name ?? res.pickerAssignment?.pickerName ?? order.assignee;
  const assigneeId = res.assignee?.id ?? res.pickerAssignment?.pickerId ?? order.assigneeId ?? '';
  const initials =
    res.assignee?.initials ??
    (assigneeName && assigneeName !== '-' ? assigneeName.split(/\s+/).map((s: string) => s[0]).join('').substring(0, 3).toUpperCase() : order.assigneeInitials);
  return {
    ...order,
    status: res.status ? mapBackendStatusToUi(res.status) : order.status,
    assignee: assigneeName || order.assignee,
    assigneeId,
    assigneeInitials: initials || 'UA',
    pickerAssignment: res.pickerAssignment ?? order.pickerAssignment,
  };
}

function isNewOrderStatus(status: string): boolean {
  return ['Queued', 'new', 'queued', 'pending'].includes(status);
}

function isPickingReadyStatus(status: string): boolean {
  return ['Assigned', 'ASSIGNED', 'processing'].includes(status);
}

function AssignPickerContent({
  orderId,
  storeId,
  onAssign,
  onAutoAssign,
  onClose,
}: {
  orderId: string;
  storeId: string;
  onAssign: (pickerId: string, pickerName: string) => Promise<void>;
  onAutoAssign: () => Promise<void>;
  onClose: () => void;
}) {
  const [pickers, setPickers] = useState<{ id: string; name: string; status?: string; derivedStatus?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAvailablePickers({ storeId });
        if (!cancelled && res?.data) setPickers(res.data);
      } catch {
        if (!cancelled) setPickers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);
  if (loading) return <div className="p-6 text-sm text-slate-500">Loading pickers...</div>;
  return (
    <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
      <button
        onClick={async () => {
          setAutoAssigning(true);
          try {
            await onAutoAssign();
            onClose();
          } finally {
            setAutoAssigning(false);
          }
        }}
        disabled={autoAssigning}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium transition-colors disabled:opacity-50"
      >
        {autoAssigning ? 'Assigning...' : 'Auto Assign'}
      </button>
      {pickers.length === 0 ? (
        <div className="text-sm text-slate-500 py-2 space-y-1">
          <p>No pickers punched in for this store.</p>
          <p className="text-xs">Pickers must punch in on the picker app before they appear here. Auto Assign also needs a recent app heartbeat unless all punched-in pickers are offline.</p>
        </div>
      ) : (
        pickers.map((p) => (
          <button
            key={p.id}
            onClick={() => onAssign(p.id, p.name)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-600 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-900 block truncate">{p.name}</span>
              {p.derivedStatus && p.derivedStatus !== 'AVAILABLE' && (
                <span className="text-xs text-slate-500">{p.derivedStatus.replace('_', ' ')}</span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

const LIVE_ORDER_TABS = ['new', 'processing', 'ready', 'cancelled'] as const;
type QuickFilter = 'all' | 'express' | 'unassigned' | 'sla_critical' | 'exceptions';

export function LiveOrders({ initialTab }: { initialTab?: (typeof LIVE_ORDER_TABS)[number] } = {}) {
  const defaultTab = initialTab && LIVE_ORDER_TABS.includes(initialTab) ? initialTab : 'new';
  const { activeTab, changeTab: setActiveTab } = useScreenTab(LIVE_ORDER_TABS, defaultTab);
  const { saveFilters, getFilters, preferences, setLiveOrdersViewMode } = useDarkstore();
  const viewMode = preferences.liveOrdersViewMode;
  const savedFilters = getFilters('liveorders');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quickDrawerOrderId, setQuickDrawerOrderId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(savedFilters.search || '');
  const [filterStatus, setFilterStatus] = useState<string | null>(savedFilters.status || null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(savedFilters.urgency || null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>((savedFilters.quick as QuickFilter) || 'all');
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Confirmation Dialogs
  const [statusDialog, setStatusDialog] = useState({ open: false, orderId: '', currentStatus: '', newStatus: '' });
  const [assignDialog, setAssignDialog] = useState({
    open: false,
    orderId: '',
    order: null as any,
    storeId: '' as string,
  });
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [detailActionBusy, setDetailActionBusy] = useState<'none' | 'call' | 'rto'>('none');
  const [detailsTab, setDetailsTab] = useState('details');
  const [callingOrderId, setCallingOrderId] = useState<string | null>(null);
  const [rtoDialog, setRtoDialog] = useState({ open: false, orderId: '' });
  const [isMarkingRto, setIsMarkingRto] = useState(false);
  const isConfirmationOpen = statusDialog.open || rtoDialog.open;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [orderActionLogs, setOrderActionLogs] = useState<any[]>([]);
  const [orderActionLogsLoading, setOrderActionLogsLoading] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const isWsConnected = useWebSocketConnection();

  const [orders, setOrders] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const autoOpenedDetailsForQuery = useRef<string | null>(null);

  useEffect(() => {
    const q = searchParams.get('q') || getPendingOrderSearch() || '';
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    saveFilters('liveorders', {
      search: searchQuery,
      status: filterStatus || '',
      urgency: filterUrgency || '',
      quick: quickFilter,
    });
  }, [searchQuery, filterStatus, filterUrgency, quickFilter, saveFilters]);

  useEffect(() => {
    if (activeTab !== 'cancelled') return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getLiveOrders(storeId, 'cancelled', 100);
        if (!cancelled && data?.orders) {
          setCancelledOrders(data.orders.map((o: any) => transformBackendOrder(o)));
        }
      } catch {
        if (!cancelled) setCancelledOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, storeId]);

  useEffect(() => {
    if (!isConfirmationOpen) return;
    // Keep confirmation dialogs viewport-centered and avoid competing drawers.
    setIsDetailsOpen(false);
    setAssignDialog((prev) => (prev.open ? { open: false, orderId: '', order: null, storeId: '' } : prev));
  }, [isConfirmationOpen]);

  // Load orders when connection is established or store changes
  useEffect(() => {
    if (isWsConnected) {
      console.log('DEBUG: WebSocket connected, loading orders for store:', storeId);
      loadOrders();
    }
  }, [storeId, isWsConnected]);

  // Real-time socket: listen for new orders, updates, and cancellations
  useEffect(() => {
    websocketService.connect();

    const snapshotHandler = (data: any) => {
      console.log('DEBUG: Received live_orders:snapshot', { 
        ordersCount: data?.orders?.length, 
        storeId: data?.store_id, 
        targetStoreId: storeId,
        status: data?.status
      });
      try {
        if (!data || !Array.isArray(data.orders)) return;
        
        // Use a more relaxed store ID check for development or log it clearly
        if (storeId && data.store_id && data.store_id !== storeId) {
          console.warn('DEBUG: Snapshot store mismatch', { received: data.store_id, expected: storeId });
          // return; // Keep going for now during debug if needed, but for now we stick to strict
          return;
        }

        const transformedOrders = data.orders.map((order: any) => transformBackendOrder(order));
        setOrders(transformedOrders);
        setIsLoading(false);
        setLastSync(new Date());
      } catch (err) {
        console.error('Failed to process live orders snapshot', err);
        setIsLoading(false);
      }
    };

    const createdHandler = (data: any) => {
      try {
        if (!data || !data.order_id) return;
        if (storeId && data.store_id && data.store_id !== storeId) return;

        const newOrder = {
          id: `#${data.order_id}`,
          order_id: data.order_id,
          store_id: data.store_id || storeId,
          customer: data.customer_name || 'Customer',
          customerPhone: data.customer_phone || '',
          deliveryAddress: data.delivery_address || '',
          itemsList: (data.items || []).map((it: any) => ({
            productName: it.productName || 'Item',
            quantity: it.quantity || 1,
            price: it.price || 0,
            image: it.image || '',
            variantSize: it.variantSize || '',
          })),
          items: data.item_count || 1,
          zone: data.zone || '',
          sla: data.sla_timer || '15:00',
          sla_deadline: data.sla_deadline,
          status: 'Queued',
          urgency: data.sla_status === 'critical' ? 'critical' : data.sla_status === 'warning' ? 'warning' : 'normal',
          assignee: '-',
          assigneeId: '',
          assigneeInitials: 'UA',
          order_type: data.order_type || 'Normal',
          created_at: new Date().toISOString(),
          payment_status: data.payment_status || 'pending',
          payment_method: data.payment_method || 'cash',
          total_bill: data.total_bill || 0,
        };

        setOrders(prev => {
          const alreadyExists = prev.some(o => o.order_id === data.order_id);
          if (alreadyExists) return prev;
          toast.info(`New order ${data.order_id} received`);
          return [newOrder, ...prev];
        });
      } catch (err) {
        console.error('Failed to process realtime order event', err);
      }
    };

    const updatedHandler = (data: any) => {
      try {
        if (!data || !data.order_id) return;
        if (storeId && data.store_id && data.store_id !== storeId) return;

        const statusMap: Record<string, string> = {
          new: 'Queued', processing: 'Picking', ready: 'Packing',
        };
        const urgencyMap: Record<string, string> = {
          safe: 'normal', warning: 'warning', critical: 'critical',
        };

        const statusMapExt: Record<string, string> = {
          ...statusMap,
          ASSIGNED: 'Assigned', PICKING: 'Picking', PICKED: 'Packing', PACKED: 'Packing',
          READY_FOR_DISPATCH: 'Ready for Dispatch',
        };
        setOrders(prev => prev.map(o => {
          if (o.order_id !== data.order_id) return o;
          const assignee = data.assignee;
          const pickerAssignment = data.pickerAssignment;
          const assigneeName = assignee?.name ?? pickerAssignment?.pickerName ?? o.assignee;
          const assigneeId = assignee?.id ?? pickerAssignment?.pickerId ?? o.assigneeId ?? '';
          const assigneeInitials = assignee?.initials ?? pickerAssignment?.pickerName?.slice(0, 2).toUpperCase() ?? o.assigneeInitials ?? 'UA';
          return {
            ...o,
            ...(data.status && statusMapExt[data.status] ? { status: statusMapExt[data.status] } : {}),
            ...(data.sla_status && urgencyMap[data.sla_status] ? { urgency: urgencyMap[data.sla_status] } : {}),
            ...(data.bagId != null ? { bagId: data.bagId } : {}),
            ...(data.rackLocation != null ? { rackLocation: data.rackLocation } : {}),
            ...(data.readyForDispatch != null ? { readyForDispatch: data.readyForDispatch } : {}),
            ...(assigneeName != null ? { assignee: assigneeName } : {}),
            ...(assigneeId ? { assigneeId } : {}),
            ...(assigneeInitials ? { assigneeInitials } : {}),
          };
        }));
      } catch (err) {
        console.error('Failed to process order update event', err);
      }
    };

    const cancelledHandler = (data: any) => {
      try {
        if (!data || !data.order_id) return;
        if (storeId && data.store_id && data.store_id !== storeId) return;
        setOrders(prev => prev.filter(o => o.order_id !== data.order_id));
      } catch (err) {
        console.error('Failed to process order cancel event', err);
      }
    };

    const paymentHandler = (data: any) => {
      try {
        if (!data || !data.orderId) return;
        const isFailed = data.status === 'failed';
        const isSuccess = data.status === 'success' || data.status === 'completed';
        const isCod = (data.methodType || '').toLowerCase() === 'cash' || (data.methodType || '').toLowerCase() === 'cod';
        setOrders(prev => prev.map(o => {
          if (o.order_id !== data.orderId) return o;
          // Only set paid when payment actually succeeded; for COD, keep cod_pending
          const newStatus = isFailed ? 'failed' : (isSuccess && !isCod) ? 'paid' : o.payment_status;
          return {
            ...o,
            payment_status: newStatus,
            payment_method: data.methodType || o.payment_method,
            total_bill: data.amount ?? o.total_bill,
          };
        }));
      } catch (err) {
        console.error('Failed to process payment event', err);
      }
    };

    websocketService.on('live_orders:snapshot', snapshotHandler);
    websocketService.on('order:created', createdHandler);
    websocketService.on('order:updated', updatedHandler);
    websocketService.on('order:cancelled', cancelledHandler);
    websocketService.on('payment:created', paymentHandler);

    return () => {
      websocketService.off('live_orders:snapshot', snapshotHandler);
      websocketService.off('order:created', createdHandler);
      websocketService.off('order:updated', updatedHandler);
      websocketService.off('order:cancelled', cancelledHandler);
      websocketService.off('payment:created', paymentHandler);
    };
  }, [storeId]);

  // Real-time SLA timer update (runs every second)
  // Timer starts from 15:00 and counts down from createdAt + 15 minutes
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setOrders((prevOrders) => {
        return prevOrders.map((order: any) => {
          // Use sla_deadline if available, otherwise calculate from created_at + 15 minutes
          let deadline: Date;
          if (order.sla_deadline) {
            deadline = new Date(order.sla_deadline);
          } else if (order.created_at) {
            const createdAt = new Date(order.created_at);
            deadline = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 minutes from creation
          } else {
            return order; // No timestamp available
          }
          
          const now = new Date();
          const diff = deadline.getTime() - now.getTime();
          
          if (diff <= 0) {
            // SLA breached
            return {
              ...order,
              sla: '00:00',
              urgency: 'critical',
            };
          }
          
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          
          // Update urgency based on time remaining
          let urgency = 'normal';
          if (minutes < 5) {
            urgency = 'critical';
          } else if (minutes < 15) {
            urgency = 'warning';
          }
          
          return {
            ...order,
            sla: formattedTimer,
            urgency,
            sla_deadline: deadline.toISOString(), // Ensure deadline is set for next iteration
          };
        });
      });
    }, 1000); // Update every second

    return () => clearInterval(timerInterval);
  }, []);

  const loadOrders = () => {
    if (!isWsConnected) return;
    try {
      setIsLoading(true);
      websocketService.emit('get:live_orders', { storeId, status: 'all', limit: 100 });
    } catch (error: any) {
      console.error('Failed to request live orders via socket:', error);
      setIsLoading(false);
    }
  };

  const sourceOrders = activeTab === 'cancelled' ? cancelledOrders : orders;

  // Filter Logic
  const filteredOrders = sourceOrders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.assignee || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus ? order.status === filterStatus : (() => {
      if (activeTab === 'new') return order.status === 'Queued';
      if (activeTab === 'processing') return order.status === 'Assigned' || order.status === 'Picking';
      if (activeTab === 'ready') return order.status === 'Packing' || order.status === 'Ready for Dispatch';
      if (activeTab === 'cancelled') return order.status === 'Cancelled' || order.status === 'cancelled';
      return true;
    })();
    const matchesUrgency = filterUrgency ? order.urgency === filterUrgency : true;
    const matchesQuick =
      quickFilter === 'all' ? true :
      quickFilter === 'express' ? isExpressOrder(order) :
      quickFilter === 'unassigned' ? isUnassigned(order) :
      quickFilter === 'sla_critical' ? isSlaCritical(order) :
      quickFilter === 'exceptions' ? isOrderException(order) : true;

    return matchesSearch && matchesStatus && matchesUrgency && matchesQuick;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  const reassignSuggestions = sourceOrders.filter(shouldSuggestReassign);

  // Bulk Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedOrders.map(o => o.id));
      setSelectedOrderIds(allIds);
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    const selected = orders.filter((o) => selectedOrderIds.has(o.id));
    if (selected.length === 0) {
      setSelectedOrderIds(new Set());
      return;
    }
    if (action === 'Print Labels') {
      try {
        for (const order of selected) {
          const oid = resolveOrderId(order);
          await generateLabel(
            { searchTerm: oid, labelType: 'item_barcode', quantity: 1 },
            storeId
          );
        }
        toast.success(`Labels queued for ${selected.length} order(s)`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to print labels');
      }
      setSelectedOrderIds(new Set());
      return;
    }
    if (action === 'Assign') {
      if (selected.length === 1) {
        const order = selected[0];
        setAssignDialog({
          open: true,
          orderId: resolveOrderId(order),
          order,
          storeId: (order?.store_id && String(order.store_id).trim()) || storeId,
        });
      } else {
        toast.info('Select one order for bulk assign, or assign individually from the row menu');
      }
      setSelectedOrderIds(new Set());
      return;
    }
    toast.success(`${action} applied to ${selectedOrderIds.size} orders`);
    setSelectedOrderIds(new Set());
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      // Prepare CSV data
      const csvData: (string | number)[][] = [
        ['Live Order Board Report', `Date: ${today}`, `Time: ${timestamp}`],
        [''],
        ['Order ID', 'Customer', 'Items', 'Zone', 'SLA Timer', 'Status', 'Urgency', 'Assignee'],
        ...filteredOrders.map(order => [
          order.id,
          order.customer,
          order.items,
          order.zone,
          order.sla,
          order.status,
          order.urgency,
          order.assignee
        ]),
        [''],
        ['Summary'],
        ['Total Orders', filteredOrders.length],
        ['New Orders', filteredOrders.filter(o => o.status === 'Queued').length],
        ['In Progress', filteredOrders.filter(o => o.status === 'Picking' || o.status === 'Packing').length],
        ['Critical Urgency', filteredOrders.filter(o => o.urgency === 'critical').length],
        ['Warning Urgency', filteredOrders.filter(o => o.urgency === 'warning').length],
      ];

      exportToCSV(csvData, `live-orders-${today}-${timestamp.replace(/:/g, '-')}`);
      
      setIsExporting(false);
      toast.success('Report downloaded successfully');
    } catch (error) {
      setIsExporting(false);
      toast.error('Failed to generate report');
      console.error('Export error:', error);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus(null);
    setFilterUrgency(null);
    setCurrentPage(1);
    toast.info("All filters cleared");
  };

  const syncOrderFromDetail = (rawId: string, freshOrder: any) => {
    const fresh = transformBackendOrder(freshOrder);
    setSelectedOrder((prev: any) => (prev && resolveOrderId(prev) === rawId ? { ...prev, ...fresh } : prev));
    setOrders((prev) =>
      prev.map((o) => (o.order_id === rawId ? { ...o, ...fresh, sla: o.sla, urgency: o.urgency } : o))
    );
    return fresh;
  };

  const refreshSelectedOrderDetails = async (order: any) => {
    const oid = resolveOrderId(order);
    if (!oid || !/^ORD-/i.test(oid)) return null;
    const orderStoreId = (order.store_id && String(order.store_id).trim()) || storeId;
    const res = await getOrderById(oid, orderStoreId);
    if (res?.order) return syncOrderFromDetail(oid, res.order);
    return null;
  };

  const loadOrderActionLogs = async (order: any) => {
    const oid = resolveOrderId(order);
    if (!oid) return;
    setOrderActionLogsLoading(true);
    try {
      const data = await getOrderActionLogs(oid);
      setOrderActionLogs(Array.isArray(data) ? data : []);
    } catch {
      setOrderActionLogs([]);
    } finally {
      setOrderActionLogsLoading(false);
    }
  };

  const ensureOrderAssigned = async (rawId: string, order: any) => {
    if (isPickingReadyStatus(order?.status || '')) return null;
    const hasAssignee =
      (order?.assignee && order.assignee !== '-') ||
      Boolean(order?.assigneeId || order?.pickerAssignment?.pickerId);
    if (hasAssignee) {
      await updateOrder(rawId, { status: toApiStatus('Assigned') });
      return null;
    }
    try {
      const res = await assignOrder(rawId, { autoAssign: true });
      if (res?.success) return res;
    } catch {
      /* fall through */
    }
    await updateOrder(rawId, { status: toApiStatus('Assigned') });
    return null;
  };

  const handleCallCustomer = async (order: any) => {
    const rawId = resolveOrderId(order);
    if (!rawId) return;
    try {
      setDetailActionBusy('call');
      setCallingOrderId(rawId);
      const response = await callCustomer(rawId, { reason: 'Customer contact from live order board' });
      if (response?.success) {
        toast.success(response.message || 'Customer call initiated');
        if (response.called_number) {
          toast.info(`Dialing ${response.called_number}`, { duration: 4000 });
        }
        await refreshSelectedOrderDetails(order);
        if (detailsTab === 'audit') await loadOrderActionLogs(order);
      } else {
        toast.error('Failed to initiate customer call');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to call customer');
    } finally {
      setDetailActionBusy('none');
      setCallingOrderId(null);
    }
  };

  const handleMarkRTO = async (rawId: string) => {
    try {
      setIsMarkingRto(true);
      const response = await markRTO(rawId, {
        reason: 'Marked from live order board',
        notes: 'Customer unreachable or delivery failed',
        rto_status: 'marked_rto',
      });
      if (response?.success) {
        setOrders((prev) => prev.filter((o) => o.order_id !== rawId && resolveOrderId(o) !== rawId));
        if (selectedOrder && resolveOrderId(selectedOrder) === rawId) {
          setIsDetailsOpen(false);
          setSelectedOrder(null);
        }
        toast.success(response.message || `Order ${rawId} marked as RTO`);
      } else {
        toast.error('Failed to mark order as RTO');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark order as RTO');
    } finally {
      setIsMarkingRto(false);
      setRtoDialog({ open: false, orderId: '' });
    }
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    setDetailsTab('details');
    setOrderActionLogs([]);
    setIsDetailsOpen(true);
    const oid = resolveOrderId(order);
    if (!oid || !/^ORD-/i.test(oid)) {
      toast.error('Invalid order ID');
      return;
    }
    const orderStoreId = (order.store_id && String(order.store_id).trim()) || storeId;
    setLoadingOrderDetails(true);
    try {
      const res = await getOrderById(oid, orderStoreId);
      if (res?.order) {
        const fresh = transformBackendOrder(res.order);
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.order_id === oid ? { ...o, ...fresh, sla: o.sla, urgency: o.urgency } : o)));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load order details';
      toast.error(message);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Open details when navigating from dashboard / top bar with an order id
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      autoOpenedDetailsForQuery.current = null;
      return;
    }
    if (!orders.length || autoOpenedDetailsForQuery.current === q) return;
    if (!/^#?ORD-/i.test(q)) return;

    const normalized = q.replace(/^#/, '').trim().toLowerCase();
    const match = orders.find((o) => {
      const oid = resolveOrderId(o).toLowerCase();
      const displayId = o.id.replace(/^#/, '').trim().toLowerCase();
      return oid === normalized || displayId === normalized;
    });

    if (match) {
      autoOpenedDetailsForQuery.current = q;
      void handleViewDetails(match);
    }
  }, [orders, searchQuery]);

  const handlePrintLabel = async (order: { order_id?: string; id?: string }) => {
    const oid = resolveOrderId(order);
    if (!oid) return;
    try {
      setPrintingOrderId(oid);
      const res = await generateLabel(
        { searchTerm: oid, labelType: 'item_barcode', quantity: 1 },
        storeId
      );
      toast.success(res.message || `Label queued for order ${oid} (Job: ${res.printJobId})`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to print label');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const openAssignPicker = (order: any) => {
    const orderStoreId = (order?.store_id && String(order.store_id).trim()) || storeId;
    setAssignDialog({
      open: true,
      orderId: resolveOrderId(order),
      order,
      storeId: orderStoreId,
    });
  };

  const handleUpdateStatus = (orderId: string, newStatus: string, currentStatusHint?: string) => {
    const order = orders.find((o) => o.id === orderId);
    const currentStatus = currentStatusHint || order?.status || selectedOrder?.status || '';

    if (!currentStatus) {
      toast.error('Unable to determine current order status. Please refresh and try again.');
      return;
    }

    if (currentStatus === newStatus) {
      toast.info(`Order already in "${newStatus}" status`);
      return;
    }

    setStatusDialog({
      open: true,
      orderId,
      currentStatus,
      newStatus,
    });
  };

  const confirmStatusUpdate = async () => {
    const rawId = resolveOrderId({ id: statusDialog.orderId, order_id: statusDialog.orderId });
    const order =
      orders.find((o) => o.id === statusDialog.orderId) ||
      (selectedOrder?.id === statusDialog.orderId ? selectedOrder : null);
    try {
      if (statusDialog.newStatus === 'Assigned') {
        try {
          const res = await assignOrder(rawId, { autoAssign: true });
          if (res?.success && order) {
            const patched = applyAssignResponseToOrder(order, res);
            setOrders((prev) => prev.map((o) => (o.id === statusDialog.orderId ? patched : o)));
            if (selectedOrder?.id === statusDialog.orderId) setSelectedOrder(patched);
          } else {
            await updateOrder(rawId, { status: toApiStatus('Assigned') });
            setOrders((prev) =>
              prev.map((o) => (o.id === statusDialog.orderId ? { ...o, status: 'Assigned' } : o))
            );
            if (selectedOrder?.id === statusDialog.orderId) {
              setSelectedOrder((prev: any) => ({ ...prev, status: 'Assigned' }));
            }
          }
        } catch {
          await updateOrder(rawId, { status: toApiStatus('Assigned') });
          setOrders((prev) =>
            prev.map((o) => (o.id === statusDialog.orderId ? { ...o, status: 'Assigned' } : o))
          );
          if (selectedOrder?.id === statusDialog.orderId) {
            setSelectedOrder((prev: any) => ({ ...prev, status: 'Assigned' }));
          }
        }
      } else if (statusDialog.newStatus === 'Picking') {
        if (order && (isNewOrderStatus(order.status) || !isPickingReadyStatus(order.status))) {
          await ensureOrderAssigned(rawId, order);
        }
        try {
          await startPicking(rawId);
        } catch {
          await updateOrder(rawId, { status: toApiStatus(statusDialog.newStatus) });
        }
      } else if (statusDialog.newStatus === 'Packing') {
        try {
          await completePicking(rawId);
        } catch {
          // Fallback for environments where complete-picking requires additional payload.
          await updateOrder(rawId, { status: toApiStatus(statusDialog.newStatus) });
        }
      } else {
        await updateOrder(rawId, { status: toApiStatus(statusDialog.newStatus) });
      }
      if (statusDialog.newStatus !== 'Assigned') {
        setOrders((prev) =>
          prev.map((o) => (o.id === statusDialog.orderId ? { ...o, status: statusDialog.newStatus } : o))
        );
        if (selectedOrder?.id === statusDialog.orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: statusDialog.newStatus }));
        }
      }
      await refreshSelectedOrderDetails(order || { order_id: rawId, id: statusDialog.orderId });
      toast.success(`Order ${statusDialog.orderId} status updated to ${statusDialog.newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setStatusDialog({ open: false, orderId: '', currentStatus: '', newStatus: '' });
    }
  };

  const handleUpdateUrgency = async (orderId: string, newUrgency: string) => {
    const rawId = orderId.replace(/^#/, '');
    try {
      await updateOrder(rawId, { urgency: newUrgency });
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) return { ...o, urgency: newUrgency };
        return o;
      }));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, urgency: newUrgency }));
      }
      toast.success(`Order ${orderId} marked as ${newUrgency}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order urgency');
    }
  };

  // Calculate counts based on frontend status labels (after transformation)
  const newOrdersCount = orders.filter(o => 
    o.status === 'Queued' || o.status === 'new' || o.status === 'queued'
  ).length;
  const processingCount = orders.filter(o => 
    o.status === 'Assigned' || o.status === 'Picking' || o.status === 'processing' || o.status === 'ASSIGNED' || o.status === 'PICKING'
  ).length;
  const readyCount = orders.filter(o => 
    o.status === 'Packing' || o.status === 'Ready for Dispatch' || o.status === 'ready' || o.status === 'PICKED' || o.status === 'PACKED' || o.status === 'READY_FOR_DISPATCH'
  ).length;
  const cancelledCount = cancelledOrders.length;

  const tabs = [
    { id: 'new', label: 'New Orders', count: newOrdersCount, accent: 'default' as const },
    { id: 'processing', label: 'Processing', count: processingCount, accent: 'default' as const },
    { id: 'ready', label: 'Ready', count: readyCount, accent: 'success' as const },
    { id: 'cancelled', label: 'Cancelled', count: cancelledCount, accent: 'default' as const },
  ];

  const filterControls = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search Order ID, Customer..."
          className="h-8 pl-9 pr-8 rounded-md bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 w-56"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-8', (filterStatus || filterUrgency) && 'border-blue-500 text-blue-600 bg-blue-50')}
          >
            <Filter size={14} className="mr-1.5" />
            Filters
            {(filterStatus || filterUrgency) && (
              <span className="ml-1.5 flex items-center justify-center w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full">
                {(filterStatus ? 1 : 0) + (filterUrgency ? 1 : 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          {['Queued', 'Picking', 'Packing'].map((status) => (
            <DropdownMenuItem key={status} onClick={() => setFilterStatus(filterStatus === status ? null : status)}>
              <div className="flex items-center justify-between w-full">
                {status}
                {filterStatus === status && <CheckCircle2 size={14} className="text-blue-600" />}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter by Urgency</DropdownMenuLabel>
          {['normal', 'warning', 'critical'].map((urgency) => (
            <DropdownMenuItem key={urgency} onClick={() => setFilterUrgency(filterUrgency === urgency ? null : urgency)}>
              <div className="flex items-center justify-between w-full capitalize">
                {urgency}
                {filterUrgency === urgency && <CheckCircle2 size={14} className="text-blue-600" />}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleClearFilters} className="text-red-600 justify-center">
            Clear All Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  if (!storeId) {
    return (
      <StoreRequiredGuard title="Select a store for Live Orders">
        <span className="sr-only">live orders</span>
      </StoreRequiredGuard>
    );
  }

  return (
    <DarkstoreScreenShell
      title={
        <span className="flex items-center gap-2">
          Live Order Board
          {isWsConnected && <StatusBadge variant="live" status="live" pulse />}
        </span>
      }
      subtitle="Real-time tracking of all active orders across the fulfillment lifecycle."
      toolbar={{
        onRefresh: loadOrders,
        refreshing: isLoading,
        lastSync,
        showConnection: true,
        filters: filterControls,
        toolbarActions: (
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setLiveOrdersViewMode('table')}
                className={cn('px-2.5 py-1.5 text-xs font-medium', viewMode === 'table' ? 'bg-[var(--ds-primary)] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                title="Table view"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setLiveOrdersViewMode('kanban')}
                className={cn('px-2.5 py-1.5 text-xs font-medium', viewMode === 'kanban' ? 'bg-[var(--ds-primary)] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                title="Kanban view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            <Button type="button" size="sm" className="h-8" onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        ),
      }}
    >

      {reassignSuggestions.length > 0 && (
        <AlertCard
          title={`${reassignSuggestions.length} order${reassignSuggestions.length > 1 ? 's' : ''} unassigned > 3 min`}
          subtitle={reassignSuggestions.slice(0, 2).map((o) => o.id).join(', ')}
          severity="warning"
          icon={AlertTriangle}
          actions={[
            {
              label: 'Assign first',
              onClick: () => openAssignPicker(reassignSuggestions[0]),
            },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all' as QuickFilter, label: 'All' },
          { id: 'express' as QuickFilter, label: 'Express' },
          { id: 'unassigned' as QuickFilter, label: 'Unassigned' },
          { id: 'sla_critical' as QuickFilter, label: 'SLA Critical' },
          { id: 'exceptions' as QuickFilter, label: 'Exceptions' },
        ]).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setQuickFilter(chip.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              quickFilter === chip.id
                ? 'bg-[var(--ds-primary)] text-white border-[var(--ds-primary)]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--ds-primary)]'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <DarkstoreTabBar
        variant="pill"
        active={activeTab}
        onChange={(id) => setActiveTab(id as (typeof LIVE_ORDER_TABS)[number])}
        tabs={tabs}
      />

      {selectedOrderIds.size > 0 && (
        <AlertCard
          title={`${selectedOrderIds.size} orders selected`}
          severity="info"
          className="animate-in slide-in-from-top-2"
          actions={[
            { label: 'Bulk Assign', onClick: () => handleBulkAction('Assign') },
            { label: 'Print Labels', onClick: () => handleBulkAction('Print Labels') },
            { label: 'Clear', onClick: () => setSelectedOrderIds(new Set()), variant: 'outline' },
          ]}
        />
      )}

      {viewMode === 'kanban' && activeTab !== 'cancelled' ? (
        <LiveOrdersKanban
          orders={filteredOrders}
          onOrderClick={(o) => void handleViewDetails(o)}
          onQuickAssign={(o) => openAssignPicker(o)}
        />
      ) : (
      <div className="darkstore-card overflow-hidden darkstore-content-loaded">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm darkstore-table">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium w-16 sticky left-0 bg-slate-50 z-10">
                  <input 
                    type="checkbox" 
                    checked={paginatedOrders.length > 0 && selectedOrderIds.size === paginatedOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" 
                  />
                </th>
                <th className="px-6 py-4 font-medium sticky left-16 bg-slate-50 z-10 min-w-[140px]">Order Details</th>
                <th className="px-6 py-4 font-medium">Items</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">SLA Timer</th>
                <th className="px-6 py-4 font-medium">Assignee</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {!isWsConnected ? (
                        <>
                          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-2" />
                          <p className="font-medium text-slate-600">Connecting to live order stream...</p>
                          <p className="text-xs">If this takes too long, please check your connection.</p>
                        </>
                      ) : isLoading ? (
                        <>
                          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-2" />
                          <p className="font-medium text-slate-600">Fetching live orders...</p>
                        </>
                      ) : (
                        <>
                          <Search size={24} className="opacity-20" />
                          <p>No orders found for {tabs.find(t => t.id === activeTab)?.label || activeTab}.</p>
                          <div className="flex gap-3 mt-1">
                            <button onClick={handleClearFilters} className="text-blue-600 text-xs hover:underline font-medium">
                              Clear Filters
                            </button>
                            {activeTab === 'new' && (
                              <button onClick={() => setActiveTab('processing')} className="text-slate-500 text-xs hover:underline font-medium">
                                View active picks
                              </button>
                            )}
                            <button onClick={() => setQuickFilter('sla_critical')} className="text-red-600 text-xs hover:underline font-medium">
                              Check SLA risks
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "hover:bg-slate-50 transition-colors group cursor-pointer",
                      selectedOrderIds.has(order.id) && "bg-blue-50",
                      slaRowClassName(order)
                    )}
                    onClick={() => void handleViewDetails(order)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setQuickDrawerOrderId(resolveOrderId(order));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleViewDetails(order);
                      }
                    }}
                  >
                    <td className="px-6 py-4 sticky left-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.has(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" 
                      />
                    </td>
                    <td className="px-6 py-4 sticky left-16 bg-white z-10 min-w-[140px]">
                      <div className="flex flex-col">
                         <span className="font-bold text-slate-900 text-base">{order.id}</span>
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                           {order.order_type || order.zone || 'Normal'}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                         <div className="bg-slate-100 p-2 rounded-lg">
                           <Package size={16} />
                         </div>
                         <span className="font-medium">{order.items}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                           {order.customer.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{order.customer}</span>
                            {order.customerPhone && (
                              <span className="text-xs text-slate-400 font-mono">{order.customerPhone}</span>
                            )}
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isBreached = order.sla === '00:00' || order.urgency === 'critical';
                        return (
                          <div className={cn(
                            "flex items-center gap-2 font-mono font-bold text-sm px-3 py-1.5 rounded-lg w-fit",
                            isBreached ? 'bg-red-50 text-red-500 ring-1 ring-red-500/30' :
                            order.urgency === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                          )}>
                            {isBreached ? <AlertOctagon size={14} aria-hidden /> : <Clock size={14} />}
                            {order.sla}
                            {isBreached && (
                              <span className="ml-1 text-[10px] font-bold uppercase tracking-wide opacity-90">Breached</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {order.assignee && order.assignee !== '-' ? (
                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                          {order.assigneeInitials && (
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                              {order.assigneeInitials}
                            </div>
                          )}
                          <span>{order.assignee}</span>
                        </div>
                      ) : (
                        <button
                          className="text-blue-600 text-xs font-bold hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignPicker(order);
                          }}
                        >
                          + Assign
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge variant="payment" status={getPaymentDisplay(order).label} />
                        {order.total_bill > 0 && (
                          <span className="text-xs text-slate-500 font-medium">
                            ₹{Number(order.total_bill).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge variant="workflow" status={order.status} />
                          {(order.supportTicketId || order.refundStatus) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700" title={order.supportTicketId ? `Ticket: ${order.supportTicketId}` : `Refund: ${order.refundStatus}`}>
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                        <OrderJourneyStepper status={order.status} timeline={order.timeline} compact />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <OrderRowQuickActions
                        showAssign={isUnassigned(order)}
                        calling={callingOrderId === resolveOrderId(order)}
                        onAssign={() => openAssignPicker(order)}
                        onCall={() => void handleCallCustomer(order)}
                        onRto={() => setRtoDialog({ open: true, orderId: resolveOrderId(order) })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all">
                            <MoreHorizontal size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              void handleViewDetails(order);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={printingOrderId === resolveOrderId(order)}
                            onClick={() => {
                              void handlePrintLabel(order);
                            }}
                          >
                            {printingOrderId === resolveOrderId(order) ? 'Printing…' : 'Print Label'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              openAssignPicker(order);
                            }}
                          >
                            <User className="mr-2 h-4 w-4" /> Assign Picker
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
           <span className="text-sm text-slate-500">
             Showing <span className="font-bold text-slate-900">{filteredOrders.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-slate-900">{filteredOrders.length}</span> orders
           </span>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded text-sm font-medium text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors",
                    currentPage === page ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-100"
                  )}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded text-sm font-medium text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                Next
              </button>
           </div>
        </div>
      </div>
      )}
      {/* Order Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DarkstoreSheetContent className="overflow-y-auto">
          {selectedOrder && (
            <div className="flex flex-col h-full">
              <SheetHeader className="border-b border-slate-100 pb-4 px-6">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  {selectedOrder.id}
                  <StatusBadge variant="workflow" status={selectedOrder.status} />
                  {selectedOrder.readyForDispatch && (
                    <StatusBadge variant="workflow" status="ready_for_dispatch" />
                  )}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <User size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-700">{selectedOrder.customer}</span>
                  <span className="text-slate-300">·</span>
                  <span>{selectedOrder.items} item{selectedOrder.items !== 1 ? 's' : ''}</span>
                  {selectedOrder.total_bill > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-700">₹{Number(selectedOrder.total_bill).toLocaleString('en-IN')}</span>
                    </>
                  )}
                </SheetDescription>
              </SheetHeader>

              <Tabs
                value={detailsTab}
                onValueChange={(value) => {
                  setDetailsTab(value);
                  if (value === 'audit') void loadOrderActionLogs(selectedOrder);
                }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="px-6 pt-2 border-b border-slate-100">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="details" className="flex-1 overflow-y-auto mt-0">
              <div className="space-y-6 p-6">
                {/* Customer Info */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <User size={18} /> Customer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Name</p>
                      <p className="font-medium text-slate-900">{selectedOrder.customer}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Contact</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Phone size={13} className="text-slate-400" />
                        <p className="font-medium text-slate-900 font-mono">{selectedOrder.customerPhone || 'Not available'}</p>
                        <button
                          type="button"
                          disabled={detailActionBusy !== 'none' || !selectedOrder.customerPhone}
                          onClick={() => void handleCallCustomer(selectedOrder)}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {callingOrderId === resolveOrderId(selectedOrder) ? 'Calling…' : 'Call Customer'}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500">Delivery Address</p>
                      <div className="flex items-start gap-1.5 mt-0.5">
                        <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-slate-900">{selectedOrder.deliveryAddress || 'Not available'}</p>
                      </div>
                    </div>
                    {selectedOrder.deliveryNotes && (
                      <div className="col-span-2">
                        <p className="text-slate-500">Delivery Notes</p>
                        <p className="font-medium text-slate-900 italic">{selectedOrder.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ShoppingBag size={18} /> Payment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Payment Status</p>
                      <StatusBadge
                        variant="payment"
                        status={getPaymentDisplay(selectedOrder).label === 'COD' ? 'COD' : getPaymentDisplay(selectedOrder).label}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <p className="text-slate-500">Payment Method</p>
                      <p className="font-medium text-slate-900 capitalize mt-1">{selectedOrder.payment_method || 'Cash'}</p>
                    </div>
                    {selectedOrder.total_bill > 0 && (
                      <div>
                        <p className="text-slate-500">Total Amount</p>
                        <p className="font-bold text-slate-900 mt-1">₹{Number(selectedOrder.total_bill).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fulfillment Details */}
                <div className="space-y-3">
                   <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Clock size={18} /> Fulfillment Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">SLA Deadline</p>
                      <div className={cn(
                        "font-mono font-bold text-lg",
                        selectedOrder.urgency === 'critical' ? 'text-red-600' :
                        selectedOrder.urgency === 'warning' ? 'text-amber-600' : 'text-green-600'
                      )}>
                        {selectedOrder.sla} remaining
                      </div>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg">
                       <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                       <p className="font-medium text-slate-900">{selectedOrder.assignee !== '-' ? selectedOrder.assignee : 'Unassigned'}</p>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg">
                       <p className="text-xs text-slate-500 mb-1">Zone</p>
                       <p className="font-medium text-slate-900">{selectedOrder.zone}</p>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg">
                       <p className="text-xs text-slate-500 mb-1">Total Items</p>
                       <p className="font-medium text-slate-900">{selectedOrder.items} items</p>
                    </div>
                    {selectedOrder.bagId && (
                      <div className="border border-slate-200 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Bag ID</p>
                        <p className="font-medium text-slate-900 font-mono">{selectedOrder.bagId}</p>
                      </div>
                    )}
                    {selectedOrder.rackLocation && (
                      <div className="border border-slate-200 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Rack Location</p>
                        <p className="font-medium text-slate-900 font-mono">{selectedOrder.rackLocation}</p>
                      </div>
                    )}
                    {selectedOrder.pickingData?.startTime && (
                      <>
                        <div className="border border-slate-200 p-3 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Pick Start</p>
                          <p className="font-medium text-slate-900 text-sm">{new Date(selectedOrder.pickingData.startTime).toLocaleString()}</p>
                        </div>
                        {selectedOrder.pickingData?.endTime && (
                          <div className="border border-slate-200 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Pick End</p>
                            <p className="font-medium text-slate-900 text-sm">{new Date(selectedOrder.pickingData.endTime).toLocaleString()}</p>
                          </div>
                        )}
                        {selectedOrder.pickingData?.pickDuration != null && (
                          <div className="border border-slate-200 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Pick Duration</p>
                            <p className="font-medium text-slate-900">{selectedOrder.pickingData.pickDuration}s</p>
                          </div>
                        )}
                        {selectedOrder.pickingData?.accuracy != null && (
                          <div className="border border-slate-200 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Accuracy</p>
                            <p className="font-medium text-slate-900">{Math.round(selectedOrder.pickingData.accuracy * 100)}%</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Package size={18} /> Order Items
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Item</th>
                          <th className="px-4 py-2 font-medium text-right">Qty</th>
                          <th className="px-4 py-2 font-medium text-right">Price</th>
                          <th className="px-4 py-2 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(selectedOrder.itemsList && selectedOrder.itemsList.length > 0) ? (
                          selectedOrder.itemsList.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover border border-slate-100" />}
                                  <div>
                                    <span className="font-medium text-slate-900">{item.productName || item.name || 'Item'}</span>
                                    {item.variantSize && (
                                      <p className="text-xs text-slate-400">{item.variantSize}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{item.quantity || 1}</td>
                              <td className="px-4 py-3 text-right font-medium">₹{(item.price || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">
                                {item.itemStatus ? (
                                  <StatusBadge variant="workflow" status={item.itemStatus} />
                                ) : <span className="text-xs text-slate-400">—</span>}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-slate-500 italic text-center">
                              {selectedOrder.items} item(s) — detailed list not available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Missing Items Summary (P1-9) */}
                {selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-red-700 flex items-center gap-2">
                      <Ban size={18} /> Missing Items ({selectedOrder.missingItems.length})
                    </h3>
                    <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-red-100 text-red-800">
                          <tr>
                            <th className="px-4 py-2 font-medium">Item</th>
                            <th className="px-4 py-2 font-medium text-right">Expected Qty</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium">Marked By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {selectedOrder.missingItems.map((mi: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-medium text-red-900">{mi.productName || mi.name || 'Item'}</td>
                              <td className="px-4 py-3 text-right text-red-800">{mi.expectedQty || mi.quantity || '—'}</td>
                              <td className="px-4 py-3">
                                <StatusBadge variant="workflow" status={mi.status || 'not_found'} />
                              </td>
                              <td className="px-4 py-3 text-xs text-red-700">{mi.pickerName || mi.markedBy || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Order Timeline */}
                {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Clock size={18} /> Order Timeline
                    </h3>
                    <div className="relative pl-6">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
                      {selectedOrder.timeline.map((t: any, idx: number) => {
                        const status = t.status || t.stage || 'unknown';
                        const isSuccess = ['PICKED', 'PACKED', 'READY_FOR_DISPATCH', 'completed', 'delivered'].includes(status);
                        const isActive = ['ASSIGNED', 'PICKING', 'processing', 'ready'].includes(status);
                        const isWarning = ['new', 'Queued'].includes(status);
                        const isError = ['CANCELLED', 'cancelled', 'rto'].includes(status);
                        const badgeColor = isSuccess ? 'border-green-500 bg-green-500' :
                          isActive ? 'border-blue-500 bg-blue-50' :
                          isError ? 'border-red-500 bg-red-50' :
                          isWarning ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-slate-50';
                        const textColor = isSuccess ? 'text-green-700' : isActive ? 'text-blue-700' : isError ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-slate-600';
                        return (
                          <div key={idx} className="relative flex items-start gap-3 pb-4">
                            <div className={cn(
                              "w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white",
                              badgeColor
                            )}>
                              {isSuccess ? (
                                <CheckCircle2 size={14} className="text-white" />
                              ) : isActive ? (
                                <CircleDot size={14} className="text-blue-500" />
                              ) : (
                                <div className={cn("w-2 h-2 rounded-full", isError ? "bg-red-500" : "bg-slate-300")} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium capitalize", textColor)}>
                                {status.replace(/_/g, ' ')}
                              </p>
                              {t.timestamp && (
                                <p className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleString()}</p>
                              )}
                              {t.updatedBy && (
                                <p className="text-xs text-slate-400">by {t.updatedBy}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Issues Section (P1-7) */}
                {(selectedOrder.cancellationReason || selectedOrder.refundStatus || selectedOrder.supportTicketId) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-500" /> Issues
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.cancellationReason && (
                        <AlertCard severity="danger" title={selectedOrder.cancellationReason}>
                          <StatusBadge variant="issueTag" status="cancellation" />
                        </AlertCard>
                      )}
                      {selectedOrder.refundStatus && (
                        <AlertCard severity="warning" title={selectedOrder.refundStatus.replace('_', ' ')}>
                          <StatusBadge variant="issueTag" status="refund" />
                        </AlertCard>
                      )}
                      {selectedOrder.supportTicketId && (
                        <AlertCard severity="info" title={`Ticket: ${selectedOrder.supportTicketId}`}>
                          <StatusBadge variant="issueTag" status="support" />
                        </AlertCard>
                      )}
                      {selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (
                        <AlertCard severity="warning" title={`${selectedOrder.missingItems.length} item(s) marked as missing/damaged`}>
                          <StatusBadge variant="issueTag" status="missing" />
                        </AlertCard>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons — stacked grid avoids label overflow in narrow sheet */}
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePrintLabel(selectedOrder)}
                      disabled={printingOrderId === resolveOrderId(selectedOrder)}
                      className="min-w-0 w-full px-2 py-2.5 text-sm bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-center leading-tight"
                    >
                      {printingOrderId === resolveOrderId(selectedOrder) ? 'Printing…' : 'Print Label'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Avoid stacked focus-trap conflict from two open sheets.
                        setIsDetailsOpen(false);
          setSelectedOrder(null);
                        openAssignPicker(selectedOrder);
                      }}
                      className="min-w-0 w-full px-2 py-2.5 text-sm bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-center leading-tight"
                    >
                      Assign Picker
                    </button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="w-full min-w-0 px-3 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="truncate">Manage Order</span>
                        <ChevronDown size={16} className="shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 z-[200]">
                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Queued', selectedOrder.status)}>
                        <Clock className="mr-2 h-4 w-4 text-slate-500" /> Queued
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Assigned', selectedOrder.status)}>
                        <User className="mr-2 h-4 w-4 text-amber-600" /> Assigned
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Picking', selectedOrder.status)}>
                        <Package className="mr-2 h-4 w-4 text-blue-500" /> Picking
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Packing', selectedOrder.status)}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-purple-500" /> Packing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Ready for Dispatch', selectedOrder.status)}>
                        <Truck className="mr-2 h-4 w-4 text-emerald-600" /> Ready for Dispatch
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel>Urgency</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleUpdateUrgency(selectedOrder.id, 'normal')}>
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Normal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateUrgency(selectedOrder.id, 'warning')}>
                        <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" /> Warning
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateUrgency(selectedOrder.id, 'critical')}>
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2" /> Critical
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Customer &amp; Issues</DropdownMenuLabel>
                      <DropdownMenuItem
                        disabled={detailActionBusy !== 'none' || !selectedOrder.customerPhone}
                        onClick={() => void handleCallCustomer(selectedOrder)}
                      >
                        <Phone className="mr-2 h-4 w-4 text-blue-600" /> Call Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={selectedOrder.status === 'RTO' || selectedOrder.status === 'rto'}
                        onClick={() => setRtoDialog({ open: true, orderId: selectedOrder.id })}
                      >
                        <AlertOctagon className="mr-2 h-4 w-4 text-orange-600" /> Mark RTO
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
                </TabsContent>
                <TabsContent value="audit" className="flex-1 overflow-y-auto mt-0 p-6">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Clock size={18} /> Action Logs
                  </h3>
                  <ActionLogsTimeline
                    logs={orderActionLogs}
                    loading={orderActionLogsLoading}
                    emptyMessage="No action logs for this order"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DarkstoreSheetContent>
      </Sheet>

      {/* Assign Picker Sheet */}
      <Sheet open={assignDialog.open} onOpenChange={(open) => !open && setAssignDialog({ open: false, orderId: '', order: null, storeId: '' })}>
        <DarkstoreSheetContent>
          <SheetHeader>
            <SheetTitle>Assign Picker</SheetTitle>
            <SheetDescription>
              Select a picker to assign to order {assignDialog.orderId ? `#${assignDialog.orderId}` : ''}
            </SheetDescription>
          </SheetHeader>
          <AssignPickerContent
            orderId={assignDialog.orderId}
            storeId={assignDialog.storeId || storeId}
            onAssign={async (pickerId, pickerName) => {
              try {
                const res = await assignOrder(assignDialog.orderId, { pickerId, pickerName });
                setOrders((prev) =>
                  prev.map((o) =>
                    o.order_id === assignDialog.orderId ? applyAssignResponseToOrder(o, res) : o
                  )
                );
                if (selectedOrder && resolveOrderId(selectedOrder) === assignDialog.orderId) {
                  setSelectedOrder((prev: any) => (prev ? applyAssignResponseToOrder(prev, res) : prev));
                }
                setAssignDialog({ open: false, orderId: '', order: null, storeId: '' });
                toast.success(res.message || `Order assigned to ${pickerName}`);
                if (assignDialog.order) {
                  await refreshSelectedOrderDetails(assignDialog.order);
                }
              } catch (err: any) {
                toast.error(err.message || 'Failed to assign order');
              }
            }}
            onAutoAssign={async () => {
              try {
                const res = await assignOrder(assignDialog.orderId, { autoAssign: true });
                setOrders((prev) =>
                  prev.map((o) =>
                    o.order_id === assignDialog.orderId ? applyAssignResponseToOrder(o, res) : o
                  )
                );
                if (selectedOrder?.order_id === assignDialog.orderId) {
                  setSelectedOrder((prev: any) => (prev ? applyAssignResponseToOrder(prev, res) : prev));
                }
                setAssignDialog({ open: false, orderId: '', order: null, storeId: '' });
                const name = res.assignee?.name ?? res.pickerAssignment?.pickerName ?? 'picker';
                toast.success(res.message || `Order auto-assigned to ${name}`);
              } catch (err: any) {
                const msg = err.message || 'Failed to auto-assign order';
                const hint =
                  /no available picker/i.test(msg)
                    ? ' Punch in on the picker app and keep it open, or pick someone from the list below.'
                    : '';
                toast.error(msg + hint);
              }
            }}
            onClose={() => setAssignDialog({ open: false, orderId: '', order: null, storeId: '' })}
          />
        </DarkstoreSheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <StatusChangeConfirmation
        open={statusDialog.open}
        onOpenChange={(open) => { if (!open) setStatusDialog({ open: false, orderId: '', currentStatus: '', newStatus: '' }); }}
        itemName={statusDialog.orderId}
        currentStatus={statusDialog.currentStatus}
        newStatus={statusDialog.newStatus}
        onConfirm={confirmStatusUpdate}
      />

      <ConfirmationDialog
        open={rtoDialog.open}
        onOpenChange={(open) => { if (!open) setRtoDialog({ open: false, orderId: '' }); }}
        title="Mark order as RTO?"
        description={`Order ${rtoDialog.orderId} will be marked return-to-origin. This removes it from the active live board.`}
        confirmText="Mark RTO"
        variant="warning"
        isLoading={isMarkingRto}
        onConfirm={async () => {
          const rawId = resolveOrderId({ id: rtoDialog.orderId, order_id: rtoDialog.orderId });
          await handleMarkRTO(rawId);
        }}
      />

      <OrderDetailsDrawer
        orderId={quickDrawerOrderId}
        open={!!quickDrawerOrderId}
        onOpenChange={(open) => !open && setQuickDrawerOrderId(null)}
      />
    </DarkstoreScreenShell>
  );
}