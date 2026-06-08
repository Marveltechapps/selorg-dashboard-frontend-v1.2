import React, { useState, useEffect } from 'react';
import { stopModalPointerPropagation } from "@/components/ui/modalOverlayGuards";
import { 
  Bike, Truck, Clock, AlertTriangle, CheckCircle2, 
  MapPin, User, ArrowRight, Package, Search, Filter,
  Timer, Navigation, RefreshCw, History, ChevronRight, X, ShieldCheck, BadgeAlert
} from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { MetricCard } from '../darkstore/MetricCard';
import { AlertCard } from '../darkstore/AlertCard';
import { StatusBadge } from '../darkstore/StatusBadge';

function DispatchMetaTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
      <span className="font-bold text-slate-500">{label}:</span> {value}
    </span>
  );
}
import { EmptyState, LoadingState, InlineNotification } from '../ui/ux-components';
import { toast } from "sonner";
import { Button } from "../ui/button";
import * as outboundApi from './outboundApi';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import { websocketService } from '../../utils/websocket';
import { GOOGLE_MAPS_LOADER_ID } from '../../utils/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const riderMapContainerStyle = {
  width: '100%',
  height: '100%',
};

function RiderMap({ riders }: { riders: outboundApi.Rider[] }) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const onlineRiders = riders.filter(
    (r) => r.status !== 'offline' && r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number'
  );

  const defaultCenter = onlineRiders.length
    ? { lat: onlineRiders[0].location!.lat, lng: onlineRiders[0].location!.lng }
    : { lat: 12.9841, lng: 80.2518 }; // Default to Adyar area if no live riders

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full text-xs text-slate-500">
        Loading live rider map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={riderMapContainerStyle}
      center={defaultCenter}
      zoom={13}
      options={{
        disableDefaultUI: true,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
        ],
      }}
    >
      {onlineRiders.map((rider) => (
        <Marker
          key={rider.rider_id}
          position={{
            lat: rider.location!.lat,
            lng: rider.location!.lng,
          }}
          label={{
            text: rider.rider_name || rider.rider_id,
            fontSize: '10px',
            className: 'font-bold',
          }}
        />
      ))}
    </GoogleMap>
  );
}

export function OutboundOps() {
  const [summary, setSummary] = useState<outboundApi.OutboundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeStoreId } = useAuth();

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

  useEffect(() => {
    loadSummary();
  }, [activeStoreId]);

  useEffect(() => {
    websocketService.connect();

    const handleSummaryUpdated = () => {
      loadSummary();
    };

    websocketService.on('outbound:summary_updated', handleSummaryUpdated);

    return () => {
      websocketService.off('outbound:summary_updated', handleSummaryUpdated);
    };
  }, [activeStoreId]);

  return (
    <DarkstoreScreenShell
      title="Outbound Operations"
      subtitle="Manage rider dispatch and fleet coordination."
      actions={
        <MetricCard
          variant="inline"
          label="Active Riders"
          value={`${summary?.summary.active_riders || 0} Online`}
          icon={Bike}
          loading={loading}
        />
      }
      toolbar={{
        onRefresh: loadSummary,
        refreshing: loading,
        showConnection: true,
      }}
    >
      <div className="min-h-[500px]">
        <DispatchTab summary={summary} reloadSummary={loadSummary} />
      </div>
    </DarkstoreScreenShell>
  );
}

function DispatchTab({ summary, reloadSummary }: { summary: outboundApi.OutboundSummary | null, reloadSummary: () => void }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [dispatchQueue, setDispatchQueue] = useState<outboundApi.DispatchItem[]>([]);
  const [readyOrders, setReadyOrders] = useState<outboundApi.ReadyDispatchOrder[]>([]);
  const [riders, setRiders] = useState<outboundApi.Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
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
    websocketService.connect();

    const handleDispatchUpdated = () => {
      loadDispatchQueue();
      loadRiders();
      reloadSummary();
    };

    const handleRidersUpdated = () => {
      loadRiders();
      reloadSummary();
    };

    websocketService.on('outbound:dispatch_updated', handleDispatchUpdated);
    websocketService.on('outbound:riders_updated', handleRidersUpdated);

    return () => {
      websocketService.off('outbound:dispatch_updated', handleDispatchUpdated);
      websocketService.off('outbound:riders_updated', handleRidersUpdated);
    };
  }, [storeId, reloadSummary]);

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
      await Promise.all([loadDispatchQueue(), loadReadyOrders(), loadRiders()]);
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

  const loadReadyOrders = async () => {
    try {
      const data = await outboundApi.fetchReadyForDispatchOrders();
      setReadyOrders(data.ready_orders || []);
      if (selectedOrderId && !data.ready_orders?.some(o => o.order_id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (error) {
      console.error('Failed to load ready-for-dispatch orders:', error);
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
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-900">Dispatch Queue</h3>
             <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowQueueHistory(!showQueueHistory)}
                  className={cn(
                    "text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors",
                    showQueueHistory ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <History size={12} /> {showQueueHistory ? 'View Queue' : 'History'}
                </button>
                <StatusBadge variant="workflow" status="auto_dispatch" />
             </div>
          </div>
          
          {showQueueHistory ? 
            <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
              <ActionHistoryViewer module="outbound" limit={15} />
            </div>
           : 
            <>
              <div className="grid grid-cols-3 gap-2 p-4 bg-slate-100 border-b border-slate-200">
                 <MetricCard label="Waiting Riders" value={summary?.summary.waiting_riders || 0} icon={Clock} className="!p-3" />
                 <MetricCard label="In Transit" value={summary?.summary.in_transit || 0} icon={Navigation} className="!p-3" />
                 <MetricCard label="Store Delays" value={summary?.summary.store_delays || 0} icon={AlertTriangle} accent="danger" className="!p-3" />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
                 {loading ? (
                   <LoadingState text="Loading ready orders..." />
                 ) : readyOrders.length === 0 ? (
                   <EmptyState
                     title="No orders ready for dispatch"
                     description="Picking-completed orders with bag and rack will appear here."
                     icon={Package}
                   />
                 ) : (
                   readyOrders.map(order => {
                     const isSelected = selectedOrderId === order.order_id;
                     return (
                       <button
                         key={order.order_id}
                         type="button"
                         onClick={() => setSelectedOrderId(isSelected ? null : order.order_id)}
                         className={cn(
                           "w-full text-left p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow",
                           isSelected ? "border-blue-600 ring-1 ring-blue-600/40" : "border-slate-200"
                         )}
                       >
                         <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white">
                               <Package size={20} />
                             </div>
                             <div>
                               <div className="font-bold text-slate-900">{order.order_id}</div>
                               <div className="text-[11px] text-slate-500 font-bold uppercase">
                                 {order.order_type || 'Normal'} • {order.items_count} Items
                               </div>
                               {order.customer_name && (
                                 <div className="text-xs text-slate-400 mt-0.5">
                                   {order.customer_name}
                                 </div>
                               )}
                             </div>
                           </div>
                           <div className="text-right space-y-1">
                             <StatusBadge variant="workflow" status="ready_to_dispatch" />
                             <div className="text-[10px] text-slate-400 font-mono">
                               {order.created_at && new Date(order.created_at).toLocaleTimeString()}
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded">
                           <div className="flex items-center gap-2">
                             <DispatchMetaTag label="Bag" value={order.bag_id || '—'} />
                             <DispatchMetaTag label="Rack" value={order.rack_location || '—'} />
                           </div>
                           {isSelected && (
                             <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                               <CheckCircle2 size={12} /> Selected for manual dispatch
                             </span>
                           )}
                         </div>
                       </button>
                     );
                   })
                 )}
              </div>
            </>
          }
       </div>

       <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   {showMapHistory ? <History size={18} /> : <MapPin size={18} />}
                   {showMapHistory ? 'Dispatch History' : 'Rider Map'}
                </h3>
                <div className="flex items-center gap-3">
                  {lastActionTime && !showMapHistory && (
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Timer size={12} className="text-slate-500" />
                      <span className="text-[10px] font-mono font-bold text-slate-900">{timerText}</span>
                    </div>
                  )}
                  {!showMapHistory && (
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-500">LIVE</span>
                    </div>
                  )}
                </div>
             </div>

             {showMapHistory ? (
               <div className="flex-1 overflow-y-auto mb-4 min-h-[300px]">
                 <ActionHistoryViewer module="outbound" limit={10} />
               </div>
             ) : (
               <div className="bg-slate-100 rounded-lg border border-slate-200 flex-1 relative overflow-hidden mb-4 min-h-[300px]">
                  <RiderMap riders={riders} />
               </div>
             )}
             
             <div className="space-y-3">
                <Button 
                  onClick={handleBatchDispatch}
                  disabled={batchLoading}
                  className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-lg font-bold"
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
                  className="w-full py-6 font-bold text-slate-500 hover:text-slate-900 border border-dashed border-slate-200 hover:border-slate-300"
                >
                   {showMapHistory ? <MapPin className="mr-2" size={18} /> : <History className="mr-2" size={18} />}
                   {showMapHistory ? 'Back to Rider Map' : 'View Dispatch History'}
                </Button>
             </div>
          </div>
       </div>

       {showManualModal && (
         <ManualAssignModal
           riders={riders}
           readyOrders={readyOrders}
           selectedOrderId={selectedOrderId}
           onSelectOrder={setSelectedOrderId}
           onClose={() => setShowManualModal(false)}
           onRefresh={loadData}
           onActionSuccess={() => setLastActionTime(new Date())}
         />
       )}
    </div>
  );
}

function ManualAssignModal({ riders, readyOrders, selectedOrderId, onSelectOrder, onClose, onRefresh, onActionSuccess }: any) {
  const [selectedRider, setSelectedRider] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';

  const handleAssign = async () => {
    if (!selectedRider || !selectedOrderId) return;
    setSubmitting(true);
    try {
      await outboundApi.manuallyAssignRider(storeId, {
        order_ids: [selectedOrderId],
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" {...stopModalPointerPropagation}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-900 text-lg">Manual Rider Assignment</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="space-y-4">
           <div>
              <label className="block text-sm font-bold mb-2">Select Ready Order</label>
              <select
                value={selectedOrderId || ''}
                onChange={(e) => onSelectOrder(e.target.value || null)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              >
                 <option value="">Choose an order...</option>
                 {readyOrders.map((o: any) => (
                   <option key={o.order_id} value={o.order_id}>
                     {o.order_id} — Rack {o.rack_location || '—'} ({o.items_count} items)
                   </option>
                 ))}
              </select>
           </div>
           <div>
              <label className="block text-sm font-bold mb-2">Select Available Rider</label>
              <select 
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              >
                 <option value="">Choose a rider...</option>
                 {riders.filter((r: any) => r.status === 'online' || r.status === 'waiting').map((r: any) => (
                   <option key={r.rider_id} value={r.rider_id}>{r.rider_name} ({r.status})</option>
                 ))}
              </select>
           </div>
           
           <AlertCard
              title="Manual assignment overrides automatic dispatch logic."
              subtitle="Use only when necessary for priority orders."
              severity="warning"
              icon={AlertTriangle}
           />
           
           <div className="flex gap-3 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
              <Button 
                onClick={handleAssign} 
                disabled={!selectedRider || !selectedOrderId || submitting}
                className="flex-1 bg-slate-900 text-white hover:bg-black"
              >
                 {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
