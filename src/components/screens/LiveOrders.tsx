import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, MoreHorizontal, Clock, Package, Bike, User, AlertCircle, ArrowRight, Search, CheckCircle2, XCircle, ChevronDown, AlertTriangle, MapPin, Phone, Truck, ShoppingBag, Ban, CircleDot } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "sonner";
import { getLiveOrders } from '../../api/dashboard';
import { callCustomer, markRTO, updateOrder, cancelOrder } from '../../api/dashboard/orders.api';
import { websocketService } from '../../utils/websocket';
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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, SelectionSummaryBar, FilterChip, ResultCount } from '../ui/ux-components';
import { CancelOrderConfirmation, StatusChangeConfirmation } from '../ui/confirmation-dialog';
import { Button } from '../ui/button';
import { exportToCSV } from '../../utils/csvExport';

let _pendingOrderSearch: string | null = null;

export function setPendingOrderSearch(q: string) {
  _pendingOrderSearch = q;
}

export function LiveOrders() {
  const [activeTab, setActiveTab] = useState('new');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Confirmation Dialogs
  const [cancelDialog, setCancelDialog] = useState({ open: false, orderId: '' });
  const [statusDialog, setStatusDialog] = useState({ open: false, orderId: '', currentStatus: '', newStatus: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  const [orders, setOrders] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q') || _pendingOrderSearch || '';
    if (q) {
      setSearchQuery(q);
      _pendingOrderSearch = null;
    }
  }, [searchParams]);

  // Load orders on mount and when filters change
  useEffect(() => {
    loadOrders();
  }, [activeTab, storeId]);

  // Real-time socket: listen for new orders, updates, and cancellations
  useEffect(() => {
    websocketService.connect();

    const createdHandler = (data: any) => {
      try {
        if (!data || !data.order_id) return;
        if (storeId && data.store_id && data.store_id !== storeId) return;

        const newOrder = {
          id: `#${data.order_id}`,
          order_id: data.order_id,
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

        setOrders(prev => [newOrder, ...prev]);
        toast.info(`New order ${data.order_id} received`);
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

        setOrders(prev => prev.map(o => {
          if (o.order_id !== data.order_id) return o;
          return {
            ...o,
            ...(data.status && statusMap[data.status] ? { status: statusMap[data.status] } : {}),
            ...(data.sla_status && urgencyMap[data.sla_status] ? { urgency: urgencyMap[data.sla_status] } : {}),
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
        setOrders(prev => prev.map(o => {
          if (o.order_id !== data.orderId) return o;
          return {
            ...o,
            payment_status: isFailed ? 'failed' : 'paid',
            payment_method: data.methodType || o.payment_method,
            total_bill: data.amount || o.total_bill,
          };
        }));
      } catch (err) {
        console.error('Failed to process payment event', err);
      }
    };

    websocketService.on('order:created', createdHandler);
    websocketService.on('order:updated', updatedHandler);
    websocketService.on('order:cancelled', cancelledHandler);
    websocketService.on('payment:created', paymentHandler);

    return () => {
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

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const statusMap: { [key: string]: string } = {
        'new': 'new',
        'processing': 'processing',
        'ready': 'ready',
      };
      const status = statusMap[activeTab] || 'all';
      const response = await getLiveOrders(storeId, status, 100);
      
      if (response && response.orders) {
        // Transform backend orders to frontend format
        const transformedOrders = response.orders.map((order: any) => ({
          id: `#${order.order_id}`,
          order_id: order.order_id,
          customer: order.customer_name || order.customer?.name || 'Customer',
          customerPhone: order.customer_phone || '',
          deliveryAddress: order.delivery_address || order.deliveryAddress || 'Not available',
          deliveryNotes: order.delivery_notes || order.deliveryNotes || '',
          itemsList: (Array.isArray(order.items) ? order.items : []).map((it: any) => ({
            productName: it.productName || it.name || 'Item',
            quantity: it.quantity || 1,
            price: it.price || 0,
            image: it.image || '',
            variantSize: it.variantSize || '',
          })),
          items: order.item_count,
          zone: order.zone || '',
          sla: order.sla_timer,
          sla_deadline: order.sla_deadline,
          status: order.status === 'new' ? 'Queued' : order.status === 'processing' ? 'Picking' : order.status === 'ready' ? 'Packing' : 'Queued',
          urgency: order.sla_status === 'critical' ? 'critical' : order.sla_status === 'warning' ? 'warning' : 'normal',
          assignee: order.assignee?.name || '-',
          assigneeId: order.assignee?.id || '',
          assigneeInitials: order.assignee?.initials || 'UA',
          order_type: order.order_type,
          created_at: order.created_at,
          timeline: order.timeline || [],
          missingItems: order.missingItems || [],
          supportTicketId: order.supportTicketId || '',
          refundStatus: order.refundStatus || '',
          cancellationReason: order.cancellationReason || '',
          deliveryNotes: order.deliveryNotes || '',
          itemStatus: order.itemStatus || {},
          payment_status: order.payment_status || order.paymentStatus || 'pending',
          payment_method: order.payment_method || order.paymentMethod || 'cash',
          total_bill: order.total_bill || order.totalBill || 0,
        }));
        setOrders(transformedOrders);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus ? order.status === filterStatus : true;
    const matchesUrgency = filterUrgency ? order.urgency === filterUrgency : true;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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

  const handleBulkAction = (action: string) => {
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

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handlePrintLabel = (orderId: string) => {
    toast.success(`Label printed for order ${orderId}`);
  };

  const handleCancelOrder = (orderId: string) => {
    setCancelDialog({ open: true, orderId });
  };

  const confirmCancelOrder = async () => {
    const rawId = cancelDialog.orderId.replace(/^#/, '');
    try {
      await cancelOrder(rawId);
      setOrders(prev => prev.filter(o => o.id !== cancelDialog.orderId));
      if (selectedOrder?.id === cancelDialog.orderId) setIsDetailsOpen(false);
      toast.success(`Order ${cancelDialog.orderId} has been cancelled`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setCancelDialog({ open: false, orderId: '' });
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setStatusDialog({
        open: true,
        orderId,
        currentStatus: order.status,
        newStatus
      });
    }
  };

  const confirmStatusUpdate = async () => {
    const rawId = statusDialog.orderId.replace(/^#/, '');
    try {
      await updateOrder(rawId, { status: statusDialog.newStatus });
      setOrders(prev => prev.map(o => {
        if (o.id === statusDialog.orderId) return { ...o, status: statusDialog.newStatus };
        return o;
      }));
      if (selectedOrder && selectedOrder.id === statusDialog.orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: statusDialog.newStatus }));
      }
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

  const newOrdersCount = orders.filter(o => o.status === 'Queued').length;
  const tabs = [
    { id: 'new', label: 'New Orders', count: newOrdersCount, color: 'text-[#1677FF]', border: 'border-[#1677FF]', bg: 'bg-[#E6F7FF]' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Order Board"
        subtitle="Real-time tracking of all active orders across the fulfillment lifecycle."
        actions={
          <div className="flex gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 setCurrentPage(1); // Reset to page 1 on search
               }}
               placeholder="Search Order ID, Customer..." 
               className="h-10 pl-9 pr-4 rounded-lg bg-white border border-[#E0E0E0] text-sm focus:ring-2 focus:ring-[#1677FF] w-64 shadow-sm"
             />
             {searchQuery && (
               <button 
                 onClick={() => setSearchQuery('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
               >
                 <XCircle size={14} />
               </button>
             )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-[#F5F5F5] shadow-sm transition-all",
                (filterStatus || filterUrgency) ? "border-[#1677FF] text-[#1677FF] bg-[#E6F7FF]" : "border-[#E0E0E0] text-[#616161]"
              )}>
                <Filter size={16} />
                Filters
                {(filterStatus || filterUrgency) && (
                  <span className="flex items-center justify-center w-5 h-5 bg-[#1677FF] text-white text-[10px] rounded-full">
                    {(filterStatus ? 1 : 0) + (filterUrgency ? 1 : 0)}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              {['Queued', 'Picking', 'Packing'].map(status => (
                <DropdownMenuItem key={status} onClick={() => setFilterStatus(filterStatus === status ? null : status)}>
                  <div className="flex items-center justify-between w-full">
                    {status}
                    {filterStatus === status && <CheckCircle2 size={14} className="text-[#1677FF]" />}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Urgency</DropdownMenuLabel>
              {['normal', 'warning', 'critical'].map(urgency => (
                <DropdownMenuItem key={urgency} onClick={() => setFilterUrgency(filterUrgency === urgency ? null : urgency)}>
                  <div className="flex items-center justify-between w-full capitalize">
                    {urgency}
                    {filterUrgency === urgency && <CheckCircle2 size={14} className="text-[#1677FF]" />}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearFilters} className="text-red-600 justify-center">
                Clear All Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-[#1677FF] text-white rounded-lg text-sm font-medium hover:bg-[#409EFF] shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              'Export CSV'
            )}
          </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="bg-white p-1 rounded-xl border border-[#E0E0E0] shadow-sm inline-flex w-full gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-b-2",
              activeTab === tab.id 
                ? `bg-[#FAFAFA] text-[#212121] ${tab.border}` 
                : "bg-white text-[#757575] border-transparent hover:bg-[#F5F5F5]"
            )}
          >
            {tab.label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              activeTab === tab.id ? `${tab.bg} ${tab.color}` : "bg-[#F5F5F5] text-[#9E9E9E]"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-[#E6F7FF] border border-[#91CAFF] rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1677FF] text-sm">{selectedOrderIds.size} orders selected</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleBulkAction('Assign')}
              className="px-3 py-1.5 bg-white border border-[#91CAFF] text-[#1677FF] text-xs font-bold rounded hover:bg-[#F0F5FF]"
            >
              Bulk Assign
            </button>
            <button 
              onClick={() => handleBulkAction('Print Labels')}
              className="px-3 py-1.5 bg-white border border-[#91CAFF] text-[#1677FF] text-xs font-bold rounded hover:bg-[#F0F5FF]"
            >
              Print Labels
            </button>
            <button 
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-1.5 text-[#1677FF] text-xs hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Kanban / List View */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-4 font-medium w-16">
                  <input 
                    type="checkbox" 
                    checked={paginatedOrders.length > 0 && selectedOrderIds.size === paginatedOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-[#1677FF] focus:ring-[#1677FF]" 
                  />
                </th>
                <th className="px-6 py-4 font-medium">Order Details</th>
                <th className="px-6 py-4 font-medium">Items</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">SLA Timer</th>
                <th className="px-6 py-4 font-medium">Assignee</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="opacity-20" />
                      <p>No orders found matching your filters.</p>
                      <button onClick={handleClearFilters} className="text-[#1677FF] text-xs hover:underline font-medium">
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className={cn("hover:bg-[#FAFAFA] transition-colors group", selectedOrderIds.has(order.id) && "bg-[#F0F7FF]")}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.has(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="rounded border-gray-300 text-[#1677FF] focus:ring-[#1677FF]" 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <span className="font-bold text-[#212121] text-base">{order.id}</span>
                         <span className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mt-0.5">
                           {order.order_type || order.zone || 'Normal'}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[#616161]">
                         <div className="bg-[#F5F5F5] p-2 rounded-lg">
                           <Package size={16} />
                         </div>
                         <span className="font-medium">{order.items}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-xs font-bold">
                           {order.customer.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <span className="font-medium text-[#212121]">{order.customer}</span>
                            {order.customerPhone && (
                              <span className="text-xs text-[#9E9E9E] font-mono">{order.customerPhone}</span>
                            )}
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-2 font-mono font-bold text-sm px-3 py-1.5 rounded-lg w-fit",
                        order.urgency === 'critical' ? 'bg-[#FEE2E2] text-[#EF4444]' :
                        order.urgency === 'warning' ? 'bg-[#FFFBE6] text-[#D48806]' : 'bg-[#DCFCE7] text-[#16A34A]'
                      )}>
                        <Clock size={14} />
                        {order.sla}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.assignee && order.assignee !== '-' ? (
                        <div className="flex items-center gap-2 text-[#212121] font-medium">
                          {order.assigneeInitials && (
                            <div className="w-6 h-6 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-[10px] font-bold">
                              {order.assigneeInitials}
                            </div>
                          )}
                          <span>{order.assignee}</span>
                        </div>
                      ) : (
                        <button className="text-[#1677FF] text-xs font-bold hover:underline">
                          + Assign
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit",
                          order.payment_status === 'paid' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                          order.payment_status === 'cod_pending' ? 'bg-[#FEF9C3] text-[#A16207]' :
                          order.payment_status === 'failed' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                          'bg-[#F5F5F5] text-[#616161]'
                        )}>
                          {order.payment_status === 'cod_pending' ? 'COD' : order.payment_status || 'pending'}
                        </span>
                        {order.total_bill > 0 && (
                          <span className="text-xs text-[#757575] font-medium">
                            ₹{Number(order.total_bill).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                          order.status === 'Packing' ? 'bg-[#F3E8FF] text-[#9333EA]' :
                          order.status === 'Picking' ? 'bg-[#E6F7FF] text-[#1677FF]' :
                          'bg-[#F5F5F5] text-[#616161]'
                        )}>
                          {order.status}
                        </span>
                        {(order.supportTicketId || order.refundStatus) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700" title={order.supportTicketId ? `Ticket: ${order.supportTicketId}` : `Refund: ${order.refundStatus}`}>
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-[#9E9E9E] hover:text-[#212121] hover:bg-[#E0E0E0] rounded-full transition-all">
                            <MoreHorizontal size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintLabel(order.id)}>
                            Print Label
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            Cancel Order
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
        <div className="p-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
           <span className="text-sm text-[#757575]">
             Showing <span className="font-bold text-[#212121]">{filteredOrders.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-[#212121]">{filteredOrders.length}</span> orders
           </span>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-[#E0E0E0] bg-white rounded text-sm font-medium text-[#212121] disabled:text-[#C1C1C1] disabled:cursor-not-allowed hover:bg-[#F5F5F5] transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors",
                    currentPage === page ? "bg-[#1677FF] text-white" : "bg-white border border-[#E0E0E0] text-[#212121] hover:bg-[#F5F5F5]"
                  )}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-[#E0E0E0] bg-white rounded text-sm font-medium text-[#212121] disabled:text-[#C1C1C1] disabled:cursor-not-allowed hover:bg-[#F5F5F5] transition-colors"
              >
                Next
              </button>
           </div>
        </div>
      </div>
      {/* Order Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedOrder && (
            <div className="flex flex-col h-full">
              <SheetHeader className="border-b border-gray-100 pb-4 px-6">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  {selectedOrder.id}
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                    selectedOrder.status === 'Packing' ? 'bg-[#F3E8FF] text-[#9333EA]' :
                    selectedOrder.status === 'Picking' ? 'bg-[#E6F7FF] text-[#1677FF]' :
                    'bg-[#F5F5F5] text-[#616161]'
                  )}>
                    {selectedOrder.status}
                  </span>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <User size={14} className="text-gray-400" />
                  <span className="font-semibold text-gray-700">{selectedOrder.customer}</span>
                  <span className="text-gray-300">·</span>
                  <span>{selectedOrder.items} item{selectedOrder.items !== 1 ? 's' : ''}</span>
                  {selectedOrder.total_bill > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="font-semibold text-gray-700">₹{Number(selectedOrder.total_bill).toLocaleString('en-IN')}</span>
                    </>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 p-6">
                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User size={18} /> Customer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">{selectedOrder.customer}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Contact</p>
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        <p className="font-medium text-gray-900 font-mono">{selectedOrder.customerPhone || 'Not available'}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Delivery Address</p>
                      <div className="flex items-start gap-1.5 mt-0.5">
                        <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-gray-900">{selectedOrder.deliveryAddress || 'Not available'}</p>
                      </div>
                    </div>
                    {selectedOrder.deliveryNotes && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Delivery Notes</p>
                        <p className="font-medium text-gray-900 italic">{selectedOrder.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingBag size={18} /> Payment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Payment Status</p>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide mt-1",
                        selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        selectedOrder.payment_status === 'cod_pending' ? 'bg-yellow-100 text-yellow-700' :
                        selectedOrder.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {selectedOrder.payment_status === 'cod_pending' ? 'COD - Pending' : selectedOrder.payment_status || 'Pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">Payment Method</p>
                      <p className="font-medium text-gray-900 capitalize mt-1">{selectedOrder.payment_method || 'Cash'}</p>
                    </div>
                    {selectedOrder.total_bill > 0 && (
                      <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="font-bold text-gray-900 mt-1">₹{Number(selectedOrder.total_bill).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fulfillment Details */}
                <div className="space-y-3">
                   <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock size={18} /> Fulfillment Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-200 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">SLA Deadline</p>
                      <div className={cn(
                        "font-mono font-bold text-lg",
                        selectedOrder.urgency === 'critical' ? 'text-red-600' :
                        selectedOrder.urgency === 'warning' ? 'text-amber-600' : 'text-green-600'
                      )}>
                        {selectedOrder.sla} remaining
                      </div>
                    </div>
                    <div className="border border-gray-200 p-3 rounded-lg">
                       <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                       <p className="font-medium text-gray-900">{selectedOrder.assignee !== '-' ? selectedOrder.assignee : 'Unassigned'}</p>
                    </div>
                    <div className="border border-gray-200 p-3 rounded-lg">
                       <p className="text-xs text-gray-500 mb-1">Zone</p>
                       <p className="font-medium text-gray-900">{selectedOrder.zone}</p>
                    </div>
                    <div className="border border-gray-200 p-3 rounded-lg">
                       <p className="text-xs text-gray-500 mb-1">Total Items</p>
                       <p className="font-medium text-gray-900">{selectedOrder.items} items</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package size={18} /> Order Items
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500">
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
                                  {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover border border-gray-100" />}
                                  <div>
                                    <span className="font-medium text-gray-900">{item.productName || item.name || 'Item'}</span>
                                    {item.variantSize && (
                                      <p className="text-xs text-gray-400">{item.variantSize}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{item.quantity || 1}</td>
                              <td className="px-4 py-3 text-right font-medium">₹{(item.price || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">
                                {item.itemStatus ? (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    item.itemStatus === 'picked' ? 'bg-green-100 text-green-700' :
                                    item.itemStatus === 'not_found' ? 'bg-red-100 text-red-700' :
                                    item.itemStatus === 'damaged' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-600'
                                  )}>{item.itemStatus.replace('_', ' ')}</span>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-gray-500 italic text-center">
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
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  mi.status === 'not_found' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                                )}>{(mi.status || 'not_found').replace('_', ' ')}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-red-700">{mi.pickerName || mi.markedBy || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Order Timeline (P1-6) */}
                {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Clock size={18} /> Order Timeline
                    </h3>
                    <div className="relative pl-6">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                      {(() => {
                        const stages = ['placed', 'picking', 'packed', 'dispatched', 'delivered'];
                        const timelineMap: Record<string, any> = {};
                        selectedOrder.timeline.forEach((t: any) => { timelineMap[t.status || t.stage] = t; });
                        const currentIdx = stages.findIndex(s => !timelineMap[s]);
                        return stages.map((stage, idx) => {
                          const entry = timelineMap[stage];
                          const isCompleted = entry && entry.timestamp;
                          const isCurrent = idx === currentIdx - 1 || (currentIdx === -1 && idx === stages.length - 1);
                          const isFuture = !isCompleted && !isCurrent;
                          return (
                            <div key={stage} className="relative flex items-start gap-3 pb-4">
                              <div className={cn(
                                "w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white",
                                isCompleted ? "border-green-500 bg-green-500" :
                                isCurrent ? "border-blue-500 bg-blue-50" :
                                "border-gray-300"
                              )}>
                                {isCompleted ? (
                                  <CheckCircle2 size={14} className="text-white" />
                                ) : isCurrent ? (
                                  <CircleDot size={14} className="text-blue-500" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium capitalize",
                                  isCompleted ? "text-green-700" : isCurrent ? "text-blue-700" : "text-gray-400"
                                )}>{stage}</p>
                                {entry?.timestamp && (
                                  <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Issues Section (P1-7) */}
                {(selectedOrder.cancellationReason || selectedOrder.refundStatus || selectedOrder.supportTicketId) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-500" /> Issues
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.cancellationReason && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">CANCELLATION</span>
                          <span className="text-sm text-red-800">{selectedOrder.cancellationReason}</span>
                        </div>
                      )}
                      {selectedOrder.refundStatus && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">REFUND</span>
                          <span className="text-sm text-amber-800 capitalize">{selectedOrder.refundStatus.replace('_', ' ')}</span>
                        </div>
                      )}
                      {selectedOrder.supportTicketId && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">SUPPORT</span>
                          <span className="text-sm text-blue-800">Ticket: {selectedOrder.supportTicketId}</span>
                        </div>
                      )}
                      {selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">MISSING</span>
                          <span className="text-sm text-orange-800">{selectedOrder.missingItems.length} item(s) marked as missing/damaged</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Accept / Reject Buttons for new orders */}
                {(selectedOrder.status === 'Queued' || selectedOrder.status === 'new') && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={async () => {
                        try {
                          await updateOrder(selectedOrder.order_id || selectedOrder.id.replace('#', ''), { status: 'processing' });
                          setOrders(prev => prev.map(o =>
                            o.id === selectedOrder.id ? { ...o, status: 'Picking' } : o
                          ));
                          setSelectedOrder({ ...selectedOrder, status: 'Picking' });
                          toast.success('Order accepted and moved to processing');
                        } catch {
                          toast.error('Failed to accept order');
                        }
                      }}
                    >
                      <CheckCircle2 size={16} className="mr-1.5" /> Accept Order
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        toast.warning('Order rejected — triggering re-routing alert');
                        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
                        setIsDetailsOpen(false);
                      }}
                    >
                      <XCircle size={16} className="mr-1.5" /> Reject Order
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      handlePrintLabel(selectedOrder.id);
                      setIsDetailsOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Print Label
                  </button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="flex-1 py-2.5 bg-[#1677FF] text-white font-medium rounded-lg hover:bg-[#409EFF] transition-colors flex items-center justify-center gap-2"
                      >
                        Manage Order
                        <ChevronDown size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Queued')}>
                        <Clock className="mr-2 h-4 w-4 text-gray-500" /> Queued
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Picking')}>
                        <Package className="mr-2 h-4 w-4 text-blue-500" /> Picking
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(selectedOrder.id, 'Packing')}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-purple-500" /> Packing
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <CancelOrderConfirmation
        open={cancelDialog.open}
        orderId={cancelDialog.orderId}
        onConfirm={confirmCancelOrder}
        onCancel={() => setCancelDialog({ open: false, orderId: '' })}
      />

      <StatusChangeConfirmation
        open={statusDialog.open}
        orderId={statusDialog.orderId}
        currentStatus={statusDialog.currentStatus}
        newStatus={statusDialog.newStatus}
        onConfirm={confirmStatusUpdate}
        onCancel={() => setStatusDialog({ open: false, orderId: '', currentStatus: '', newStatus: '' })}
      />
    </div>
  );
}