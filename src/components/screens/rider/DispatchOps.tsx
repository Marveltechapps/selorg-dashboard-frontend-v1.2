import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { RefreshCw, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { OrderCommandDrawer } from '@/components/rider/OrderCommandDrawer';
import { dispatchOrderToCommandOrder } from '@/components/rider/orderCommandAdapter';
import { api as riderOverviewApi } from './overview/riderApi';
import { UnassignedOrdersPanel } from "./dispatch/UnassignedOrdersPanel";
import { DispatchMapPanel } from "./dispatch/DispatchMapPanel";
import { AssignRiderModal } from "./dispatch/AssignRiderModal";
import { RulesConfigDrawer } from "./dispatch/RulesConfigDrawer";
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
import { useRiderPermissions } from '@/components/rider/useRiderPermissions';

export function DispatchOps() {
  // Data State
  const [unassignedOrders, setUnassignedOrders] = useState<DispatchOrder[]>([]);
  const [allOrders, setAllOrders] = useState<DispatchOrder[]>([]); // For map
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [rules, setRules] = useState<AutoAssignRule[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [autoAssignRunning, setAutoAssignRunning] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  
  // Selection State
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [batchOrders, setBatchOrders] = useState<DispatchOrder[]>([]);

  // Order Detail Drawer State (P1-11 to P1-13)
  const [detailOrder, setDetailOrder] = useState<DispatchOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const unassignedOrdersRef = useRef(unassignedOrders);
  const { can } = useRiderPermissions();
  unassignedOrdersRef.current = unassignedOrders;

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

  const runAutoAssign = async (orderIds?: string[]) => {
    if (autoAssignRunning) return;
    setAutoAssignRunning(true);
    try {
      const ids = orderIds ?? unassignedOrders.map((o) => o.id);
      const result = await autoAssignOrders(ids);
      if (result.disabled) {
        toast.info(result.message || "Auto-assign is disabled in configuration");
        setAutoAssignEnabled(false);
        return;
      }
      if (result.assigned > 0) {
        toast.success(`Auto-assigned ${result.assigned} order${result.assigned === 1 ? "" : "s"}`);
        await loadData();
      } else if (ids.length > 0) {
        toast.message("No orders were auto-assigned", {
          description: "Check constraints: radius, zone, rider capacity, or rider GPS.",
        });
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} order${result.failed === 1 ? "" : "s"} could not be assigned`);
      }
    } catch (e) {
      console.error("Auto-assign error:", e);
      toast.error("Auto-assign failed", {
        description: e instanceof Error ? e.message : "Please try again",
      });
    } finally {
      setAutoAssignRunning(false);
    }
  };

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
      setAutoAssignEnabled(Boolean(rulesData[0]?.isActive));
    } catch (error) {
      console.error("Failed to load dispatch data", error);
      toast.error("Failed to refresh dispatch data", {
        description: error instanceof Error ? error.message : "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoAssignEnabled) return;
    const interval = setInterval(() => {
      const ids = unassignedOrdersRef.current.map((o) => o.id);
      if (ids.length > 0) runAutoAssign(ids);
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoAssignEnabled]);

  const handleViewOrderDetail = (order: DispatchOrder) => {
    setDetailOrder(order);
    setDetailOpen(true);
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
              onClick={() => runAutoAssign()}
              disabled={!can('dispatch.auto_assign') || !autoAssignEnabled || autoAssignRunning || unassignedOrders.length === 0}
              title={can('dispatch.auto_assign') ? undefined : 'You do not have permission to run auto-assign'}
              className="px-4 py-2 bg-[#F97316] text-white font-medium rounded-lg hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw size={16} className={autoAssignRunning ? "animate-spin" : ""} />
              {autoAssignRunning ? "Assigning…" : "Run Auto-Assign"}
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
        onRulesUpdate={async () => {
          await loadData();
        }}
      />

      {/* Unified Order Command Drawer */}
      <OrderCommandDrawer
        order={detailOrder ? dispatchOrderToCommandOrder(detailOrder) : null}
        riders={riders.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          avatarInitials: r.name.slice(0, 2).toUpperCase(),
          status: r.status,
          capacity: { currentLoad: r.activeOrdersCount, maxLoad: r.maxCapacity },
          avgEtaMins: r.avgEtaMinutes,
          rating: 4.5,
          currentOrderId: r.currentOrderId || undefined,
        }))}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onReassign={() => {
          if (detailOrder) {
            setDetailOpen(false);
            handleAssignClick(detailOrder);
          }
        }}
        onAlert={async (orderId, reason) => {
          await riderOverviewApi.alertOrder(orderId, reason);
        }}
        onEscalate={() => {
          setDetailOpen(false);
          window.dispatchEvent(new CustomEvent('rider:navigate', { detail: { tab: 'escalations' } }));
        }}
      />
    </div>
  );
}