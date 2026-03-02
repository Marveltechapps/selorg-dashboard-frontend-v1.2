import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, RefreshCw, XCircle, Eye, ChevronLeft, ChevronRight, Calendar, User, Package, CreditCard, MapPin, Phone, Clock, FileText, Ban } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "sonner";
import { getCancelledOrders } from '../../api/dashboard/orders.api';
import { websocketService } from '../../utils/websocket';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, ResultCount } from '../ui/ux-components';
import { Button } from '../ui/button';
import { exportToCSV } from '../../utils/csvExport';

interface CancelledOrder {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  item_count: number;
  items: any[];
  total_bill: number;
  payment_method: string;
  payment_status: string;
  store_id: string;
  status: string;
  rto_reason: string;
  delivery_address: string;
  delivery_notes: string;
  createdAt: string;
  updatedAt: string;
  zone: string;
  order_type: string;
}

export function CancelledOrders() {
  const [orders, setOrders] = useState<CancelledOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CancelledOrder | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;

  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  const loadOrders = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await getCancelledOrders(storeId, page, itemsPerPage);
      if (response?.success && response.orders) {
        setOrders(response.orders);
        setTotalPages(response.pagination?.pages || 1);
        setTotalOrders(response.pagination?.total || response.orders.length);
        setCurrentPage(page);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error('Failed to load cancelled orders:', error);
      toast.error('Failed to load cancelled orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    websocketService.connect();

    const cancelledHandler = (data: any) => {
      try {
        if (!data || !data.order_id) return;
        if (storeId && data.store_id && data.store_id !== storeId) return;

        loadOrders(currentPage);
        toast.info(`Order ${data.order_id} has been cancelled`);
      } catch (err) {
        console.error('Failed to process cancelled order event', err);
      }
    };

    websocketService.on('order:cancelled', cancelledHandler);
    return () => {
      websocketService.off('order:cancelled', cancelledHandler);
    };
  }, [storeId, currentPage, loadOrders]);

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.order_id?.toLowerCase().includes(q) ||
      order.customer_name?.toLowerCase().includes(q) ||
      order.customer_phone?.toLowerCase().includes(q) ||
      order.rto_reason?.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    if (filteredOrders.length === 0) {
      toast.error('No data to export');
      return;
    }
    setIsExporting(true);
    try {
      const rows: (string | number)[][] = [
        ['Order ID', 'Customer', 'Phone', 'Items', 'Total', 'Payment Method', 'Cancellation Reason', 'Cancelled At'],
      ];
      filteredOrders.forEach(order => {
        rows.push([
          order.order_id,
          order.customer_name,
          order.customer_phone,
          order.item_count || 0,
          order.total_bill || 0,
          order.payment_method || '-',
          order.rto_reason || '-',
          order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-',
        ]);
      });
      exportToCSV(rows, `cancelled-orders-${storeId}-${new Date().toISOString().slice(0, 10)}`);
      toast.success('Exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Ban className="w-7 h-7 text-red-500" />
            Cancelled Orders
          </span>
        }
        subtitle={`View and track all cancelled orders for your store`}
        breadcrumbs={[
          { label: 'Darkstore' },
          { label: 'Cancelled Orders' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadOrders(currentPage)} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-1.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || filteredOrders.length === 0}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
            <p className="text-xs text-slate-500">Total Cancelled</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.total_bill || 0), 0))}
            </p>
            <p className="text-xs text-slate-500">Lost Revenue</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {filteredOrders.reduce((sum, o) => sum + (o.item_count || 0), 0)}
            </p>
            <p className="text-xs text-slate-500">Items Returned</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer name, phone, or reason..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <ResultCount showing={filteredOrders.length} total={totalOrders} filtered={!!searchQuery} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <LoadingState text="Loading cancelled orders..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={XCircle}
            title="No cancelled orders"
            description={searchQuery ? 'No orders match your search criteria.' : 'There are no cancelled orders for this store yet.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelled At</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-semibold text-blue-600">#{order.order_id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{order.customer_name}</p>
                          <p className="text-xs text-slate-400">{order.customer_phone || '-'}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-slate-700">{order.item_count || 0} items</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(order.total_bill)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          order.payment_method === 'cod' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          order.payment_method === 'upi' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        )}>
                          {(order.payment_method || '-').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="text-sm text-slate-600 truncate" title={order.rto_reason || 'No reason provided'}>
                          {order.rto_reason || 'No reason provided'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(order.updatedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                          className="text-slate-500 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-slate-200">
            <SheetTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Cancelled Order Details
            </SheetTitle>
            <SheetDescription>
              Order #{selectedOrder?.order_id}
            </SheetDescription>
          </SheetHeader>

          {selectedOrder && (
            <div className="space-y-6 pt-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                  <XCircle className="w-4 h-4" />
                  Cancelled
                </span>
                <span className="text-sm text-slate-400">
                  {formatDate(selectedOrder.updatedAt)}
                </span>
              </div>

              {/* Cancellation Reason */}
              {selectedOrder.rto_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Cancellation Reason</p>
                      <p className="text-sm text-red-700 mt-1">{selectedOrder.rto_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Customer Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Name</span>
                    <span className="text-sm font-medium text-slate-800">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Phone</span>
                    <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedOrder.customer_phone || '-'}
                    </span>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-slate-500 flex-shrink-0">Address</span>
                      <span className="text-sm text-slate-700 text-right flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        {selectedOrder.delivery_address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  Order Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Order ID</span>
                    <span className="text-sm font-semibold text-blue-600">#{selectedOrder.order_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Items</span>
                    <span className="text-sm font-medium text-slate-800">{selectedOrder.item_count || 0} items</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Order Type</span>
                    <span className="text-sm font-medium text-slate-800">{selectedOrder.order_type || 'Normal'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Zone</span>
                    <span className="text-sm font-medium text-slate-800">{selectedOrder.zone || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Placed At</span>
                    <span className="text-sm text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  Payment Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Amount</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(selectedOrder.total_bill)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Method</span>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      selectedOrder.payment_method === 'cod' ? 'bg-amber-50 text-amber-700' :
                      selectedOrder.payment_method === 'upi' ? 'bg-purple-50 text-purple-700' :
                      'bg-blue-50 text-blue-700'
                    )}>
                      {(selectedOrder.payment_method || '-').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Payment Status</span>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      selectedOrder.payment_status === 'paid' ? 'bg-green-50 text-green-700' :
                      selectedOrder.payment_status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {(selectedOrder.payment_status || 'pending').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.name || item.product_name || 'Item'}</p>
                          <p className="text-xs text-slate-400">Qty: {item.quantity || 1}</p>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {formatCurrency(item.price || item.unit_price || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Notes */}
              {selectedOrder.delivery_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-800">Delivery Notes</p>
                  <p className="text-sm text-amber-700 mt-1">{selectedOrder.delivery_notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
