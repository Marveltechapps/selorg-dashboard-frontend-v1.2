import React, { useState, useEffect } from 'react';
import { 
  Bike, Truck, Clock, AlertTriangle, CheckCircle2, 
  MapPin, User, ArrowRight, Package, Search, Filter,
  Share2, ClipboardList, Timer, Navigation, RefreshCw, History, ChevronRight, X, ShieldCheck, BadgeAlert
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, InlineNotification } from '../ui/ux-components';
import { toast } from "sonner";
import { Button } from "../ui/button";
import * as outboundApi from './outboundApi';
import { ActionHistoryViewer } from '../ui/action-history-viewer';

export function OutboundOps() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'transfers'>('dispatch');
  const [summary, setSummary] = useState<outboundApi.OutboundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeStoreId } = useAuth();

  useEffect(() => {
    loadSummary();
  }, [activeStoreId]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await outboundApi.fetchOutboundSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load outbound summary:', error);
      toast.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbound Operations"
        subtitle="Manage rider dispatch, fleet coordination, and store-to-store transfers."
        actions={
          <div className="flex gap-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#F0F7FF] text-[#1677FF] rounded-lg">
                <Bike size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Active Riders</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : `${summary?.summary.active_riders || 0} Online`}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FFF7E6] text-[#D46B08] rounded-lg">
                <Share2 size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Transfer Reqs</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : `${summary?.summary.pending_transfers || 0} Pending`}
                </div>
              </div>
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="dispatch" label="Dispatch Queue" icon={Navigation} active={activeTab} onClick={setActiveTab} />
        <TabButton id="transfers" label="Inter-Store Transfers" icon={Share2} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'dispatch' && <DispatchTab summary={summary} reloadSummary={loadSummary} />}
        {activeTab === 'transfers' && <OutboundTransfersTab reloadSummary={loadSummary} />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
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

function DispatchTab({ summary, reloadSummary }: { summary: outboundApi.OutboundSummary | null, reloadSummary: () => void }) {
  const [dispatchQueue, setDispatchQueue] = useState<outboundApi.DispatchItem[]>([]);
  const [riders, setRiders] = useState<outboundApi.Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showQueueHistory, setShowQueueHistory] = useState(false);
  const [showMapHistory, setShowMapHistory] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null);
  const [timerText, setTimerText] = useState('00:00');
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  useEffect(() => {
    loadData();
    const interval = setInterval(loadRiders, 30000);
    return () => clearInterval(interval);
  }, [storeId]);

  useEffect(() => {
    if (!lastActionTime) return;
    const interval = setInterval(() => {
      const diff = new Date().getTime() - lastActionTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimerText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActionTime]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadDispatchQueue(), loadRiders()]);
    } finally {
      setLoading(false);
    }
  };

  const loadDispatchQueue = async () => {
    try {
      const data = await outboundApi.fetchDispatchQueue();
      setDispatchQueue(data.dispatch_queue);
    } catch (error) {
      console.error('Failed to load dispatch queue:', error);
    }
  };

  const loadRiders = async () => {
    try {
      const data = await outboundApi.fetchActiveRiders();
      setRiders(data.riders);
    } catch (error) {
      console.error('Failed to load riders:', error);
    }
  };

  const handleBatchDispatch = async () => {
    setBatchLoading(true);
    try {
      // In a real flow, this would dispatch ready orders
      await outboundApi.batchDispatchOrders(storeId, {
        order_ids: [], // Backend handles selection if empty or auto_assign is true
        auto_assign: true
      });
      toast.success('Batch dispatch completed successfully');
      setLastActionTime(new Date());
      loadData();
      reloadSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process batch dispatch');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Dispatch Queue</h3>
             <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowQueueHistory(!showQueueHistory)}
                  className={cn(
                    "text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors",
                    showQueueHistory ? "bg-[#1677FF] text-white" : "text-[#1677FF] hover:bg-[#E6F7FF]"
                  )}
                >
                  <History size={12} /> {showQueueHistory ? 'View Queue' : 'History'}
                </button>
                <span className="text-xs font-bold text-[#1677FF] bg-[#E6F7FF] px-2 py-1 rounded">Auto-Dispatch ON</span>
             </div>
          </div>
          
          {showQueueHistory ? 
            <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
              <ActionHistoryViewer module="outbound" limit={15} />
            </div>
           : 
            <>
              <div className="grid grid-cols-3 gap-1 p-4 bg-[#F5F5F5] border-b border-[#E0E0E0]">
                 <div className="bg-white p-3 rounded-lg border border-[#E0E0E0] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#757575]">Waiting Riders</span>
                    <span className="text-lg font-bold text-[#212121]">
                      {summary?.summary.waiting_riders || 0}
                    </span>
                 </div>
                 <div className="bg-white p-3 rounded-lg border border-[#E0E0E0] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#757575]">In Transit</span>
                    <span className="text-lg font-bold text-[#1677FF]">
                      {summary?.summary.in_transit || 0}
                    </span>
                 </div>
                 <div className="bg-white p-3 rounded-lg border border-[#E0E0E0] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#757575]">Store Delays</span>
                    <span className="text-lg font-bold text-[#EF4444]">
                      {summary?.summary.store_delays || 0}
                    </span>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
                 {loading ? (
                   <LoadingState text="Loading queue..." />
                 ) : dispatchQueue.length === 0 ? (
                   <EmptyState title="No active dispatches" description="All orders have been dispatched." icon={Navigation} />
                 ) : (
                   dispatchQueue.map(item => (
                     <div key={item.dispatch_id} className="p-4 bg-white border border-[#E0E0E0] rounded-lg hover:shadow-sm transition-shadow">
                       <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-10 h-10 rounded-full flex items-center justify-center text-white",
                               item.status === 'assigned' || item.status === 'in_transit' ? "bg-[#212121]" :
                               item.status === 'waiting' ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                             )}>
                                <Bike size={20} />
                             </div>
                             <div>
                                <div className="font-bold text-[#212121]">{item.dispatch_id}</div>
                                <div className={cn(
                                  "text-xs font-bold",
                                  item.status === 'waiting' ? "text-[#D97706] animate-pulse" : "text-[#616161]"
                                )}>
                                   {item.rider_name || 'Waiting for assignment...'}
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className={cn(
                               "px-2 py-1 rounded text-[10px] font-bold uppercase",
                               item.status === 'assigned' || item.status === 'in_transit' ? "bg-[#E6F7FF] text-[#1677FF]" :
                               item.status === 'waiting' ? "bg-[#FFF7E6] text-[#D46B08]" : "bg-[#FEE2E2] text-[#EF4444]"
                             )}>
                                {item.status.replace('_', ' ')}
                             </span>
                             {item.eta && <div className="text-[10px] text-[#757575] mt-1 font-bold">ETA: {item.eta}</div>}
                          </div>
                       </div>

                       <div className="flex items-center gap-4 text-xs text-[#616161] bg-[#FAFAFA] p-2 rounded">
                          <div className="flex items-center gap-1">
                             <Package size={14} /> {item.orders_count} Orders
                          </div>
                          <div className="flex items-center gap-1">
                             <Share2 size={14} /> {item.dispatch_type}
                          </div>
                          {item.status === 'delayed' && (
                             <div className="flex items-center gap-1 text-[#EF4444] font-bold">
                                <AlertTriangle size={14} /> Store Delay
                             </div>
                          )}
                       </div>
                     </div>
                   ))
                 )}
              </div>
            </>
          }
       </div>

       <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#212121] flex items-center gap-2">
                   {showMapHistory ? <History size={18} /> : <MapPin size={18} />}
                   {showMapHistory ? 'Dispatch History' : 'Rider Map'}
                </h3>
                <div className="flex items-center gap-3">
                  {lastActionTime && !showMapHistory && (
                    <div className="flex items-center gap-1 bg-[#F5F5F5] px-2 py-0.5 rounded border border-[#E0E0E0]">
                      <Timer size={12} className="text-[#757575]" />
                      <span className="text-[10px] font-mono font-bold text-[#212121]">{timerText}</span>
                    </div>
                  )}
                  {!showMapHistory && (
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#10B981]">LIVE</span>
                    </div>
                  )}
                </div>
             </div>

             {showMapHistory ? (
               <div className="flex-1 overflow-y-auto mb-4 min-h-[300px]">
                 <ActionHistoryViewer module="outbound" limit={10} />
               </div>
             ) : (
               <div className="bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] flex-1 relative flex items-center justify-center overflow-hidden mb-4 min-h-[300px]">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#212121_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                     <div className="w-6 h-6 bg-[#1677FF] rounded-full border-4 border-white shadow-lg animate-pulse" />
                  </div>
                  {riders.filter(r => r.status !== 'offline').slice(0, 8).map((rider, idx) => {
                    const pos = [
                      { top: '25%', left: '25%' }, { bottom: '25%', right: '33%' },
                      { top: '33%', right: '25%' }, { top: '15%', left: '50%' },
                      { bottom: '15%', left: '40%' }, { top: '60%', left: '20%' },
                      { bottom: '40%', right: '15%' }, { top: '10%', right: '10%' }
                    ][idx];
                    return (
                      <div
                        key={rider.rider_id}
                        className="absolute w-4 h-4 rounded-full border-2 border-white shadow cursor-pointer group"
                        style={{ ...pos, backgroundColor: rider.status === 'busy' ? '#F59E0B' : rider.status === 'waiting' ? '#10B981' : '#212121' }}
                      >
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                          {rider.rider_name} ({rider.status})
                        </div>
                      </div>
                    );
                  })}
               </div>
             )}
             
             <div className="space-y-3">
                <Button 
                  onClick={handleBatchDispatch}
                  disabled={batchLoading}
                  className="w-full py-6 bg-[#212121] hover:bg-black text-white rounded-lg font-bold"
                >
                   {batchLoading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Navigation className="mr-2" size={18} />}
                   Batch Dispatch
                </Button>
                <Button 
                  onClick={() => setShowManualModal(true)}
                  variant="outline"
                  className="w-full py-6 font-bold"
                >
                   <User className="mr-2" size={18} /> Manually Assign Rider
                </Button>
                <Button 
                  onClick={() => setShowMapHistory(!showMapHistory)}
                  variant="ghost"
                  className="w-full py-6 font-bold text-[#757575] hover:text-[#212121] border border-dashed border-[#E0E0E0] hover:border-[#BDBDBD]"
                >
                   {showMapHistory ? <MapPin className="mr-2" size={18} /> : <History className="mr-2" size={18} />}
                   {showMapHistory ? 'Back to Rider Map' : 'View Dispatch History'}
                </Button>
             </div>
          </div>
       </div>

       {showManualModal && <ManualAssignModal riders={riders} onClose={() => setShowManualModal(false)} onRefresh={loadData} onActionSuccess={() => setLastActionTime(new Date())} />}
    </div>
  );
}

function OutboundTransfersTab({ reloadSummary }: { reloadSummary: () => void }) {
  const [transfers, setTransfers] = useState<outboundApi.TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [slaSummary, setSlaSummary] = useState<outboundApi.SLASummary | null>(null);
  const [fulfillment, setFulfillment] = useState<outboundApi.FulfillmentStatus | null>(null);
  const [showFulfillmentHistory, setShowFulfillmentHistory] = useState(false);
  const [timerText, setTimerText] = useState('00:00');
  const [startTime] = useState(new Date());

  useEffect(() => {
    loadTransfers();
    loadSlaSummary();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date().getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimerText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await outboundApi.fetchTransferRequests();
      const list = data.transfer_requests || [];
      setTransfers(list);
      const activeTransfer = list.find((t: any) => t.status === 'approved' || t.status === 'in_progress');
      if (activeTransfer) {
        loadFulfillment(activeTransfer.request_id);
      }
    } catch (error) {
      console.error('Failed to load transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSlaSummary = async () => {
    try {
      const data = await outboundApi.fetchTransferSLASummary();
      setSlaSummary(data);
    } catch (error) {
      console.error('Failed to load SLA summary:', error);
    }
  };

  const loadFulfillment = async (requestId: string) => {
    try {
      const data = await outboundApi.fetchTransferFulfillmentStatus(requestId);
      setFulfillment(data);
    } catch (error) {
      console.error('Failed to load fulfillment status:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await outboundApi.approveTransferRequest(requestId);
      toast.success('Transfer request approved');
      loadTransfers();
      reloadSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await outboundApi.rejectTransferRequest(requestId);
      toast.success('Transfer request rejected');
      loadTransfers();
      reloadSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Transfer Requests</h3>
             {transfers.filter((r: any) => r.status === 'pending').length > 0 && (
              <span className="text-[10px] font-bold text-[#EF4444] bg-[#FEE2E2] px-2 py-1 rounded uppercase">
                {transfers.filter((r: any) => r.status === 'pending').length} Pending
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-[400px]">
             {loading ? (
               <LoadingState text="Loading transfers..." />
             ) : transfers.length === 0 ? (
               <EmptyState title="No transfer requests" description="No stores are currently requesting stock." icon={Share2} />
             ) : (
               <div className="divide-y divide-[#F0F0F0]">
                 {transfers.map(request => (
                   <div key={request.request_id} className="p-4 hover:bg-[#F9FAFB] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <div className="font-bold text-[#212121]">{request.to_store}</div>
                            <div className="text-xs text-[#757575]">ID: {request.request_id} • {request.items_count} Items</div>
                         </div>
                         <div className="text-right">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              request.priority === 'Critical' ? "bg-red-100 text-red-700" :
                              request.priority === 'High' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            )}>
                               {request.priority}
                            </span>
                            <div className="text-[10px] text-[#EF4444] font-bold mt-1 flex items-center gap-1">
                               <Clock size={10} /> {request.sla_remaining}
                            </div>
                         </div>
                      </div>
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                           <Button 
                            onClick={() => handleApprove(request.request_id)}
                            className="flex-1 bg-[#1677FF] hover:bg-[#409EFF] text-white text-xs h-8"
                           >
                             Approve
                           </Button>
                           <Button 
                            onClick={() => handleReject(request.request_id)}
                            variant="outline"
                            className="flex-1 text-xs h-8"
                           >
                             Reject
                           </Button>
                        </div>
                      )}
                      
                      {request.status !== 'pending' && (
                        <div className="mt-4 flex items-center gap-2">
                           <span className="text-[10px] font-bold uppercase text-[#757575]">Status:</span>
                           <span className="text-xs font-bold text-[#212121] capitalize">{request.status}</span>
                        </div>
                      )}
                   </div>
                 ))}
               </div>
             )}
          </div>
       </div>

       <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#212121] flex items-center gap-2">
                   <ClipboardList size={18} /> Fulfillment Tracker
                </h3>
                {fulfillment && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#F5F5F5] px-2 py-0.5 rounded border border-[#E0E0E0]">
                      <Timer size={12} className="text-[#757575]" />
                      <span className="text-[10px] font-mono font-bold text-[#212121]">{timerText}</span>
                    </div>
                    <button 
                      onClick={() => setShowFulfillmentHistory(!showFulfillmentHistory)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        showFulfillmentHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                      )}
                    >
                      <History size={14} />
                    </button>
                  </div>
                )}
             </div>
             
             {showFulfillmentHistory ? (
               <div className="min-h-[150px] max-h-[300px] overflow-y-auto">
                 <ActionHistoryViewer module="outbound" action="APPROVE_TRANSFER" limit={5} />
               </div>
             ) : fulfillment ? (
               <div className="space-y-4">
                  <div className="p-3 bg-[#F0F7FF] rounded-lg border border-[#BAE7FF]">
                     <div className="text-xs font-bold text-[#1677FF] mb-1">REQ: {fulfillment.request_id}</div>
                     <div className="text-[10px] text-[#003A8C] mb-3">Status: {fulfillment.status.replace('_', ' ')}</div>
                     
                     <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] font-bold">
                           <span>Picking Progress</span>
                           <span>{fulfillment.picking_progress.picked}/{fulfillment.picking_progress.total}</span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                           <div 
                            className="h-full bg-[#1677FF] transition-all" 
                            style={{ width: `${fulfillment.picking_progress.percentage}%` }}
                           />
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#BAE7FF]">
                        <div>
                           <div className="text-[9px] text-[#757575] uppercase font-bold">Picker</div>
                           <div className="text-xs font-bold">{fulfillment.picker?.name || 'Assigned'}</div>
                        </div>
                        <div>
                           <div className="text-[9px] text-[#757575] uppercase font-bold">Vehicle</div>
                           <div className="text-xs font-bold">{fulfillment.vehicle_id || 'Van-04'}</div>
                        </div>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="py-8 text-center border-2 border-dashed border-[#F0F0F0] rounded-lg">
                  <Package className="mx-auto text-[#D9D9D9] mb-2" size={24} />
                  <p className="text-xs text-[#757575]">No active fulfillment</p>
               </div>
             )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4">Today's Transfer SLA</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <span className="text-xs text-[#616161]">On-Time Dispatch</span>
                   <span className="text-sm font-bold text-[#16A34A]">{slaSummary?.on_time_dispatch_percentage || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs text-[#616161]">Average Prep Time</span>
                   <span className="text-sm font-bold text-[#212121]">{slaSummary?.average_prep_time || '0m'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#F0F0F0]">
                   <span className="text-xs text-[#616161]">Total Transfers</span>
                   <span className="text-sm font-bold text-[#212121]">{slaSummary?.total_transfers || 0}</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function ManualAssignModal({ riders, onClose, onRefresh, onActionSuccess }: any) {
  const [selectedRider, setSelectedRider] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  const handleAssign = async () => {
    if (!selectedRider) return;
    setSubmitting(true);
    try {
      await outboundApi.manuallyAssignRider(storeId, {
        order_ids: [],
        rider_id: selectedRider
      });
      toast.success('Rider assigned successfully');
      onActionSuccess();
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-[#212121] text-lg">Manual Rider Assignment</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="space-y-4">
           <div>
              <label className="block text-sm font-bold mb-2">Select Available Rider</label>
              <select 
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="w-full p-2 border border-[#E0E0E0] rounded-lg text-sm"
              >
                 <option value="">Choose a rider...</option>
                 {riders.filter((r: any) => r.status === 'online' || r.status === 'waiting').map((r: any) => (
                   <option key={r.rider_id} value={r.rider_id}>{r.rider_name} ({r.status})</option>
                 ))}
              </select>
           </div>
           
           <div className="p-3 bg-[#FFFBE6] border border-[#FFE58F] rounded-lg flex items-start gap-2">
              <AlertTriangle className="text-[#D46B08] flex-shrink-0" size={16} />
              <p className="text-[11px] text-[#874D00]">Manual assignment overrides automatic dispatch logic. Use only when necessary for priority orders.</p>
           </div>
           
           <div className="flex gap-3 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
              <Button 
                onClick={handleAssign} 
                disabled={!selectedRider || submitting}
                className="flex-1 bg-[#212121] text-white hover:bg-black"
              >
                 {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
