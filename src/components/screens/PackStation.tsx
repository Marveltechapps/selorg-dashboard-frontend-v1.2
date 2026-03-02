import React, { useState, useEffect, useCallback } from 'react';
import { Check, Box, ArrowRight, PackageCheck, Clock, User, Package, List, Loader2 } from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { toast } from 'sonner';
import * as packingApi from '../../api/darkstore/packing.api';

type QueueOrder = { id: string; picker: string; sla: string; items: number; status: string };
type OrderItem = { sku: string; name: string; qty: number; weight?: string; status: string };
type OrderDetails = { id: string; customerName?: string; orderType?: string; slaTime?: string; slaStatus?: string; picker?: string; status?: string; items: OrderItem[] } | null;

export function PackStation() {
  const [packQueue, setPackQueue] = useState<QueueOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<OrderDetails>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = useCallback(async (): Promise<QueueOrder[]> => {
    try {
      setLoading(true);
      const resp = await packingApi.getPackQueue();
      const data = (resp as { data?: { orders?: QueueOrder[]; summary?: unknown } }).data;
      const orders = data?.orders ?? [];
      setPackQueue(orders);
      return orders;
    } catch {
      setPackQueue([]);
      toast.error('Failed to load pack queue');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue().then((orders) => {
      setActiveOrderId((prev) => {
        if (!orders.length) return '';
        if (orders.some((o) => o.id === prev)) return prev;
        return orders[0].id;
      });
    });
  }, [fetchQueue]);

  useEffect(() => {
    if (!activeOrderId) {
      setOrderDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailsLoading(true);
      try {
        const resp = await packingApi.getOrderDetails(activeOrderId);
        const data = (resp as { data?: OrderDetails }).data;
        if (!cancelled) setOrderDetails(data ?? null);
      } catch {
        if (!cancelled) setOrderDetails(null);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeOrderId]);

  const handleCompleteOrder = async () => {
    if (!activeOrderId) return;
    try {
      setActionLoading('complete');
      await packingApi.completeOrder(activeOrderId);
      toast.success(`Order ${activeOrderId} completed and moved to dispatch`);
      const orders = await fetchQueue();
      setActiveOrderId(orders.length ? orders[0].id : '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleScanItem = async (sku: string, quantity: number) => {
    if (!activeOrderId) return;
    try {
      setActionLoading(sku);
      await packingApi.scanItem(activeOrderId, sku, quantity);
      const resp = await packingApi.getOrderDetails(activeOrderId);
      setOrderDetails((resp as { data?: OrderDetails }).data ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportMissing = async (sku: string, quantity: number, reason?: string) => {
    if (!activeOrderId) return;
    try {
      setActionLoading(`missing-${sku}`);
      await packingApi.reportMissingItem(activeOrderId, sku, quantity, reason);
      const resp = await packingApi.getOrderDetails(activeOrderId);
      setOrderDetails((resp as { data?: OrderDetails }).data ?? null);
      toast.success('Missing item reported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to report missing');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportDamaged = async (sku: string, quantity: number, reason?: string) => {
    if (!activeOrderId) return;
    try {
      setActionLoading(`damaged-${sku}`);
      await packingApi.reportDamagedItem(activeOrderId, sku, quantity, reason);
      const resp = await packingApi.getOrderDetails(activeOrderId);
      setOrderDetails((resp as { data?: OrderDetails }).data ?? null);
      toast.success('Damaged item reported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to report damaged');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packing Station"
        subtitle="Pack and dispatch orders for delivery"
        actions={
          <button 
            onClick={() => {
              // Scroll to queue section (already visible, but could add smooth scroll)
              const queueElement = document.querySelector('[data-queue-section]');
              if (queueElement) {
                queueElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
          >
            <List size={16} />
            View Queue
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-6 h-[650px]">
        {/* Left Column: Pack Queue List */}
        <div data-queue-section className="col-span-12 md:col-span-3 flex flex-col h-full bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
            <h3 className="font-bold text-[#212121] flex items-center gap-2">
              <List size={18} /> Pack Queue
            </h3>
            <span className="bg-[#E6F7FF] text-[#1677FF] text-xs font-bold px-2 py-0.5 rounded-full">{packQueue.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <p className="text-sm text-[#757575] p-4 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading...</p>
            ) : packQueue.length === 0 ? (
              <p className="text-sm text-[#757575] p-4 text-center">No orders in pack queue.</p>
            ) : packQueue.map((order) => (
              <div 
                key={order.id}
                onClick={() => setActiveOrderId(order.id)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                  activeOrderId === order.id 
                    ? "bg-[#F0F7FF] border-[#1677FF] ring-1 ring-[#1677FF]" 
                    : "bg-white border-[#E0E0E0] hover:border-[#BDBDBD]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "font-bold text-sm",
                    activeOrderId === order.id ? "text-[#1677FF]" : "text-[#212121]"
                  )}>{order.id}</span>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-mono font-bold px-1.5 py-0.5 rounded",
                    order.status === 'urgent' ? "bg-[#FEE2E2] text-[#EF4444]" :
                    order.status === 'warning' ? "bg-[#FFFBE6] text-[#D48806]" : "bg-[#DCFCE7] text-[#16A34A]"
                  )}>
                    <Clock size={10} />
                    {order.sla}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#616161]">
                   <div className="flex items-center gap-1">
                     <User size={12} /> {order.picker}
                   </div>
                   <div className="flex items-center gap-1">
                     <Box size={12} /> {order.items} items
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Order Details (Items) */}
        <div className="col-span-12 md:col-span-5 flex flex-col h-full bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-bold text-[#212121]">{activeOrderId || '—'}</h2>
                 {orderDetails?.orderType && (
                   <span className="px-2 py-0.5 bg-[#E6F7FF] text-[#1677FF] rounded text-[10px] font-bold uppercase">{orderDetails.orderType}</span>
                 )}
              </div>
              <p className="text-[#757575] mt-0.5 text-xs">Packing for <span className="font-bold text-[#212121]">{orderDetails?.customerName ?? '—'}</span></p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-[#757575] uppercase tracking-wider">SLA</div>
              <div className={cn("text-xl font-mono font-bold", (orderDetails?.slaStatus === 'atrisk' || orderDetails?.slaStatus === 'urgent') ? 'text-[#EF4444] animate-pulse' : 'text-[#212121]')}>
                {orderDetails?.slaTime ?? '—'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {detailsLoading ? (
              <p className="text-sm text-[#757575] p-4 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading order...</p>
            ) : !activeOrderId ? (
              <p className="text-sm text-[#757575] p-4 text-center">Select an order from the queue.</p>
            ) : !orderDetails ? (
              <p className="text-sm text-[#757575] p-4 text-center">Could not load order details.</p>
            ) : (
             <table className="w-full text-left text-sm">
               <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0] sticky top-0">
                 <tr>
                   <th className="px-4 py-3 font-medium">Item</th>
                   <th className="px-4 py-3 font-medium w-16">Qty</th>
                   <th className="px-4 py-3 font-medium w-24">Status</th>
                   <th className="px-4 py-3 font-medium w-20">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#F0F0F0]">
                 {(orderDetails.items ?? []).map((item) => (
                   <tr key={item.sku} className={item.status === 'scanned' ? 'bg-[#F0FDF4]' : item.status === 'missing' || item.status === 'damaged' ? 'bg-[#FEF2F2]' : 'bg-white'}>
                     <td className="px-4 py-3">
                       <div className="flex items-center gap-3">
                         <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                           item.status === 'scanned' ? 'bg-[#22C55E] text-white' : item.status === 'missing' || item.status === 'damaged' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#F5F5F5] text-[#9E9E9E]'
                         )}>
                           {item.status === 'scanned' ? <Check size={14} /> : <Box size={14} />}
                         </div>
                         <div>
                           <div className={cn("font-medium text-sm", item.status === 'scanned' ? 'text-[#14532D]' : 'text-[#212121]')}>
                             {item.name || item.sku}
                           </div>
                           <div className="text-[10px] text-[#9E9E9E]">Weight: {item.weight ?? '—'}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-4 py-3 text-[#616161]">x{item.qty}</td>
                     <td className="px-4 py-3">
                       <span className={cn("text-[10px] font-bold uppercase tracking-wide",
                         item.status === 'scanned' ? 'text-[#16A34A]' : item.status === 'missing' ? 'text-[#B91C1C]' : item.status === 'damaged' ? 'text-[#D46B08]' : 'text-[#9E9E9E]'
                       )}>
                         {item.status === 'scanned' ? 'Packed' : item.status === 'missing' ? 'Missing' : item.status === 'damaged' ? 'Damaged' : 'Waiting'}
                       </span>
                     </td>
                     <td className="px-4 py-3">
                       {item.status !== 'scanned' && item.status !== 'missing' && item.status !== 'damaged' && (
                         <div className="flex gap-1">
                           <button type="button" onClick={() => handleScanItem(item.sku, item.qty)} disabled={!!actionLoading} className="text-[10px] font-bold text-[#1677FF] hover:underline disabled:opacity-50">Scan</button>
                           <button type="button" onClick={() => handleReportMissing(item.sku, item.qty)} disabled={!!actionLoading} className="text-[10px] font-bold text-[#B91C1C] hover:underline disabled:opacity-50">Missing</button>
                           <button type="button" onClick={() => handleReportDamaged(item.sku, item.qty)} disabled={!!actionLoading} className="text-[10px] font-bold text-[#D46B08] hover:underline disabled:opacity-50">Damaged</button>
                         </div>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
            )}
          </div>
          
          {/* Auto QC Checklist Footer */}
          <div className="bg-[#FAFAFA] border-t border-[#E0E0E0] p-3">
             <div className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">Auto QC Checks</div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-[#212121]">
                   <Check className="text-[#22C55E]" size={14} />
                   <span>Cold items separated</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#212121]">
                   <Check className="text-[#22C55E]" size={14} />
                   <span>Fragile items protected</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Actions & Scanner */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-6 h-full">
          {/* Packaging Material */}
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="text-xs font-bold text-[#212121] mb-2 flex items-center gap-2">
               <PackageCheck size={16} /> Packaging Suggestions
             </h3>
             <div className="flex gap-2">
                <div className="flex-1 p-2 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] flex flex-col items-center justify-center text-center">
                   <span className="text-lg font-bold text-[#212121]">2</span>
                   <span className="text-[10px] text-[#616161]">Medium Bags</span>
                </div>
                <div className="flex-1 p-2 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] flex flex-col items-center justify-center text-center">
                   <span className="text-lg font-bold text-[#212121]">1</span>
                   <span className="text-[10px] text-[#616161]">Cooler Bag</span>
                </div>
             </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm space-y-3">
            <p className="text-[10px] text-[#757575]">Use row actions for Missing/Damaged per item.</p>
            <button
              onClick={handleCompleteOrder}
              disabled={!activeOrderId || actionLoading === 'complete'}
              className="w-full mt-1 bg-[#1677FF] text-white py-3 rounded-lg font-bold hover:bg-[#1668E3] transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'complete' ? <Loader2 className="animate-spin" size={16} /> : null}
              Complete Order <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
