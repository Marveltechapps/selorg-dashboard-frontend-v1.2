import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { Send, RefreshCw, Settings2, Clock, CheckCircle2, CircleDot, MapPin, User, Truck, Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/api/apiClient';
import { UnassignedOrdersPanel } from "./dispatch/UnassignedOrdersPanel";
import { DispatchMapPanel } from "./dispatch/DispatchMapPanel";
import { AssignRiderModal } from "./dispatch/AssignRiderModal";
import { RulesConfigDrawer } from "./dispatch/RulesConfigDrawer";
import { ManualOrderModal } from "./dispatch/ManualOrderModal";
import { 
  DispatchOrder, 
  DispatchRider, 
  AutoAssignRule 
} from "./dispatch/types";
import { 
  fetchUnassignedOrders, 
  fetchAllOrders, 
  fetchOnlineRiders, 
  fetchAutoAssignRules,
  assignOrder,
  batchCreateAssignment,
  autoAssignOrders
} from "./dispatch/dispatchApi";

export function DispatchOps() {
  // Data State
  const [unassignedOrders, setUnassignedOrders] = useState<DispatchOrder[]>([]);
  const [allOrders, setAllOrders] = useState<DispatchOrder[]>([]); // For map
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [rules, setRules] = useState<AutoAssignRule[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [manualOrderModalOpen, setManualOrderModalOpen] = useState(false);
  
  // Selection State
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [batchOrders, setBatchOrders] = useState<DispatchOrder[]>([]);

  // Order Detail Drawer State (P1-11 to P1-13)
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  // Refresh only when tab becomes visible (user action) - no auto-polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh when user returns to tab
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-Assign Simulation - disabled automatic polling
  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   if (autoAssignEnabled) {
  //     interval = setInterval(async () => {
  //       const unassignedIds = unassignedOrders.map(o => o.id);
  //       if (unassignedIds.length > 0) {
  //         try {
  //           const result = await autoAssignOrders(unassignedIds);
  //           if (result.assigned > 0) {
  //              toast.success(`Auto-assigned ${result.assigned} orders`);
  //              loadData();
  //           }
  //         } catch (e) {
  //           console.error("Auto-assign error:", e);
  //           toast.error("Auto-assign failed", {
  //             description: e instanceof Error ? e.message : "Please try again",
  //           });
  //         }
  //       }
  //     }, 10000); // Check every 10s if on
  //   }
  //   return () => {
  //     if (interval) clearInterval(interval);
  //   };
  // }, [autoAssignEnabled, unassignedOrders]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uOrders, aOrders, onlineRiders, rulesData] = await Promise.all([
        fetchUnassignedOrders(),
        fetchAllOrders(),
        fetchOnlineRiders(),
        fetchAutoAssignRules()
      ]);
      setUnassignedOrders(uOrders);
      setAllOrders(aOrders);
      setRiders(onlineRiders);
      setRules(rulesData);
    } catch (error) {
      console.error("Failed to load dispatch data", error);
      toast.error("Failed to refresh dispatch data", {
        description: error instanceof Error ? error.message : "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetail = async (order: DispatchOrder) => {
    setDetailOrder(order);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: any }>(`/rider/dispatch/order/${order.id}/assignment-details`);
      setDetailOrder({ ...order, ...res.data });
    } catch {
      // keep basic order data
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssignClick = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setBatchOrders([]);
    setAssignModalOpen(true);
  };

  const handleBatchAssignClick = (orderIds: string[]) => {
    const orders = unassignedOrders.filter(o => orderIds.includes(o.id));
    setBatchOrders(orders);
    setSelectedOrder(null);
    setAssignModalOpen(true);
  };

  const confirmAssignment = async (riderId: string, overrideSla: boolean) => {
    try {
      if (batchOrders.length > 0) {
        await batchCreateAssignment(batchOrders.map(o => o.id), riderId);
        toast.success(`Batch assigned ${batchOrders.length} orders to rider`, {
          description: "Orders have been successfully assigned",
        });
      } else if (selectedOrder) {
        await assignOrder(selectedOrder.id, riderId, overrideSla);
        toast.success(`Order ${selectedOrder.id} assigned successfully`, {
          description: "The order has been assigned to the rider",
        });
      }
      // Close modal and refresh data immediately after assignment
      setAssignModalOpen(false);
      setSelectedOrder(null);
      setBatchOrders([]);
      await loadData(); // Refresh to move orders out of queue and update rider status
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error("Assignment failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Operations"
        subtitle="Real-time delivery coordination"
        actions={
          <div className="flex gap-2">
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button 
              onClick={() => setIsRulesOpen(true)}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Settings2 size={16} />
              Auto-Assign Rules
            </button>
            <button 
              onClick={() => setManualOrderModalOpen(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              <Send size={16} />
              Manual Dispatch
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Queue */}
        <div className="lg:col-span-1">
          <UnassignedOrdersPanel 
            orders={unassignedOrders} 
            loading={loading} 
            onAssign={handleAssignClick}
            onBatchAssign={handleBatchAssignClick}
            onViewDetail={handleViewOrderDetail}
          />
        </div>

        {/* Right Panel: Map */}
        <div className="lg:col-span-2">
          <DispatchMapPanel 
            orders={allOrders}
            riders={riders}
            loading={loading}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <AssignRiderModal 
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        order={selectedOrder}
        batchOrders={batchOrders}
        riders={riders}
        onConfirm={confirmAssignment}
      />

      <RulesConfigDrawer 
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        rules={rules}
        onRulesUpdate={loadData}
      />

      <ManualOrderModal 
        isOpen={manualOrderModalOpen}
        onClose={() => setManualOrderModalOpen(false)}
        riders={riders}
        onSuccess={() => {
          toast.success("Order created successfully", {
            description: "The order has been added to the queue",
          });
          loadData();
        }}
      />

      {/* Order Detail Drawer (P1-11 to P1-13) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[520px] overflow-y-auto">
          {detailOrder && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Order {detailOrder.id}
                  <Badge variant="outline" className="capitalize">{detailOrder.status}</Badge>
                </SheetTitle>
                <SheetDescription>Delivery details and history</SheetDescription>
              </SheetHeader>

              {detailLoading && <p className="text-sm text-gray-400">Loading details...</p>}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Priority</p><p className="font-medium capitalize">{detailOrder.priority}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Zone</p><p className="font-medium">{detailOrder.zone}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Distance</p><p className="font-medium">{detailOrder.distanceKm} km</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">ETA</p><p className="font-medium">{detailOrder.etaMinutes} mins</p></div>
              </div>

              {/* Delivery Timeline (P1-11) */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} /> Delivery Timeline</h4>
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                  {(() => {
                    const stages = ['assigned', 'picked_up', 'in_transit', 'at_location', 'delivered'];
                    const labels: Record<string, string> = { assigned: 'Assigned', picked_up: 'Picked Up', in_transit: 'In Transit', at_location: 'At Location', delivered: 'Delivered' };
                    const timeline = detailOrder.timeline || detailOrder.deliveryTimeline || [];
                    const tlMap: Record<string, any> = {};
                    timeline.forEach((t: any) => { tlMap[t.status || t.stage] = t; });
                    const statusOrder = stages.indexOf(detailOrder.status);
                    return stages.map((stage, idx) => {
                      const entry = tlMap[stage];
                      const isCompleted = !!entry?.timestamp || idx < statusOrder;
                      const isCurrent = idx === statusOrder;
                      return (
                        <div key={stage} className="relative flex items-start gap-3 pb-4">
                          <div className={cn("w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white", isCompleted ? "border-green-500 bg-green-500" : isCurrent ? "border-orange-500 bg-orange-50" : "border-gray-300")}>
                            {isCompleted ? <CheckCircle2 size={14} className="text-white" /> : isCurrent ? <CircleDot size={14} className="text-orange-500" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                          </div>
                          <div className="flex-1"><p className={cn("text-sm font-medium", isCompleted ? "text-green-700" : isCurrent ? "text-orange-700" : "text-gray-400")}>{labels[stage]}</p>{entry?.timestamp && <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Assignment History (P1-12) */}
              {(detailOrder.assignmentHistory || []).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2"><User size={16} /> Assignment History</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2 font-medium">Rider</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Time</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailOrder.assignmentHistory.map((entry: any, idx: number) => (
                          <tr key={idx}><td className="px-4 py-2">{entry.riderName || entry.riderId || '—'}</td><td className="px-4 py-2 capitalize">{entry.action || 'assigned'}</td><td className="px-4 py-2 text-xs text-gray-500">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Delivery Attempts (P1-13) */}
              {(detailOrder.deliveryAttempts || []).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Truck size={16} /> Delivery Attempts</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2 font-medium">#</th><th className="px-4 py-2 font-medium">Outcome</th><th className="px-4 py-2 font-medium">Proof</th><th className="px-4 py-2 font-medium">Time</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailOrder.deliveryAttempts.map((attempt: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2 capitalize">{(attempt.outcome || attempt.status || '—').replace(/_/g, ' ')}</td>
                            <td className="px-4 py-2">{attempt.proofPhoto ? <a href={attempt.proofPhoto} target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center gap-1"><Camera size={12} /> View</a> : '—'}</td>
                            <td className="px-4 py-2 text-xs text-gray-500">{attempt.timestamp ? new Date(attempt.timestamp).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button className="flex-1 bg-[#F97316] hover:bg-[#EA580C]" onClick={() => { setDetailOpen(false); handleAssignClick(detailOrder); }}>Assign Rider</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}