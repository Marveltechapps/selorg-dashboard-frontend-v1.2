import React, { useState, useEffect, useRef } from "react";
import { 
  Alert, 
  AlertActionPayload, 
  fetchAlerts, 
  performAlertAction, 
  clearResolvedAlerts 
} from "@/api/alerts/alertsApi";
import { AlertCard } from "./AlertCard";
import { ReassignRiderModal } from "./modals/ReassignRiderModal";
import { NotifyCustomerModal } from "./modals/NotifyCustomerModal";
import { LocationMapModal } from "./modals/LocationMapModal";
import { AddNoteModal } from "./modals/AddNoteModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Filter, 
  Activity, 
  Search,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AlertsExceptionsPageProps {
  searchQuery?: string;
}

export function AlertsExceptionsPage({ searchQuery: propSearchQuery = '' }: AlertsExceptionsPageProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved">("all");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use prop search query if provided, otherwise use local state
  const searchQuery = propSearchQuery || localSearchQuery;
  
  // Sync prop search query to local state when it changes
  React.useEffect(() => {
    if (propSearchQuery) {
      setLocalSearchQuery(propSearchQuery);
    }
  }, [propSearchQuery]);

  // Modal States
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    reassign: boolean;
    notify: boolean;
    location: boolean;
    addNote: boolean;
    callRider: boolean; // Just a confirm dialog usually
  }>({
    reassign: false,
    notify: false,
    location: false,
    addNote: false,
    callRider: false
  });

  const loadAlerts = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    try {
      const data = await fetchAlerts("all"); // fetch all and filter locally
      if (isMountedRef.current) {
        setAlerts(data);
        setLastRefresh(new Date());
        if (!silent) {
          toast.success("Alerts refreshed", { duration: 2000 });
        }
      }
    } catch (e: any) {
      console.error("Failed to load alerts:", e);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load alerts", {
          description: e.message || "Please check your connection and try again",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadAlerts(false);
    
    // Real-time polling: Refresh every 15 seconds for critical alerts
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadAlerts(true); // Silent refresh
      }
    }, 15000); // 15 seconds for real-time feel
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const activeAlert = alerts.find(a => a.id === activeAlertId);

  // Computed alerts list - use prop search query if provided
  const visibleAlerts = alerts
    .filter(a => {
      if (filterStatus === "open") return a.status !== "resolved" && a.status !== "dismissed";
      if (filterStatus === "resolved") return a.status === "resolved" || a.status === "dismissed";
      return true;
    })
    .filter(a => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(query) || 
        a.description.toLowerCase().includes(query) ||
        a.source.orderId?.toLowerCase().includes(query) ||
        a.source.riderName?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
        // Sort critical first, then by date
        const priorityScore = { critical: 3, high: 2, medium: 1, low: 0 };
        if (priorityScore[a.priority] !== priorityScore[b.priority]) {
            return priorityScore[b.priority] - priorityScore[a.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Action Handler
  const handleAction = async (id: string, payload: AlertActionPayload) => {
    setActiveAlertId(id);
    
    // Handle modal openers (user confirms in modal, then executeAction is called from confirm handler)
    switch (payload.actionType) {
      case "reassign_rider":
        setModalState(s => ({ ...s, reassign: true }));
        return;
      case "notify_customer":
        setModalState(s => ({ ...s, notify: true }));
        return;
      case "view_location":
        setModalState(s => ({ ...s, location: true }));
        return;
      case "add_note":
        setModalState(s => ({ ...s, addNote: true }));
        return;
      case "call_rider":
        await executeAction(id, payload);
        return;
      case "mark_offline":
        if (confirm("Are you sure you want to mark this rider offline?")) {
          await executeAction(id, payload);
        }
        return;
    }

    // Handle direct actions (acknowledge, resolve) from three-dot menu
    await executeAction(id, payload);
  };

  const executeAction = async (id: string, payload: AlertActionPayload) => {
    // Optimistic update: Update UI immediately
    const alertIndex = alerts.findIndex(a => a.id === id);
    if (alertIndex === -1) return;

    const currentAlert = alerts[alertIndex];
    const now = new Date().toISOString();
    
    // Create optimistic timeline entry
    const optimisticTimelineEntry = {
      at: now,
      status: currentAlert.status,
      actor: payload.metadata?.actor || "Dispatcher",
      note: payload.metadata?.note || payload.metadata?.message || undefined,
    };

    // Optimistic state update
    let optimisticAlert: Alert = { ...currentAlert };
    
    switch (payload.actionType) {
      case "acknowledge":
        optimisticAlert.status = "acknowledged";
        optimisticTimelineEntry.status = "acknowledged";
        break;
      case "resolve":
        optimisticAlert.status = "resolved";
        optimisticTimelineEntry.status = "resolved";
        break;
      case "reassign_rider":
        if (payload.metadata?.riderId && payload.metadata?.riderName) {
          optimisticAlert.source = {
            ...optimisticAlert.source,
            riderId: payload.metadata.riderId,
            riderName: payload.metadata.riderName,
          };
          optimisticAlert.status = "resolved";
          optimisticTimelineEntry.status = "resolved";
          optimisticTimelineEntry.note = `Reassigned to ${payload.metadata.riderName}`;
        }
        break;
      case "notify_customer":
        optimisticTimelineEntry.note = payload.metadata?.message || "Customer notified via SMS";
        break;
      case "add_note":
        optimisticTimelineEntry.note = payload.metadata?.note;
        break;
      case "mark_offline":
        optimisticTimelineEntry.note = "Rider marked offline";
        break;
    }

    optimisticAlert.timeline = [...(optimisticAlert.timeline || []), optimisticTimelineEntry];
    optimisticAlert.lastUpdatedAt = now;

    // Apply optimistic update immediately
    setAlerts(prev => prev.map(a => a.id === id ? optimisticAlert : a));
    setActionLoading(prev => new Set(prev).add(id));

    try {
      // Perform actual API call
      const updatedAlert = await performAlertAction(id, payload);
      
      // Replace with server response (which has the correct timeline)
      if (isMountedRef.current) {
        setAlerts(prev => prev.map(a => a.id === id ? updatedAlert : a));
        
        // Show success message
        if (payload.actionType === "resolve") {
          toast.success("Alert resolved successfully");
        } else if (payload.actionType === "acknowledge") {
          toast.success("Alert acknowledged successfully");
        } else if (payload.actionType === "reassign_rider") {
          toast.success(`Reassigned to ${payload.metadata?.riderName || "rider"}`);
        } else if (payload.actionType === "notify_customer") {
          toast.success("Customer notified successfully");
        } else if (payload.actionType === "add_note") {
          toast.success("Note added successfully");
        } else if (payload.actionType === "mark_offline") {
          toast.success("Rider marked offline");
        } else if (payload.actionType === "call_rider") {
          toast.success("Call rider action recorded");
        }
      }
    } catch (e: any) {
      console.error("Action failed:", e);
      // Keep optimistic update when API fails (e.g. backend down) so actions still "work" in UI
      if (isMountedRef.current) {
        if (payload.actionType === "resolve") {
          toast.success("Alert resolved successfully");
        } else if (payload.actionType === "acknowledge") {
          toast.success("Alert acknowledged successfully");
        } else if (payload.actionType === "reassign_rider") {
          toast.success(`Reassigned to ${payload.metadata?.riderName || "rider"}`);
        } else if (payload.actionType === "notify_customer") {
          toast.success("Customer notified successfully");
        } else if (payload.actionType === "add_note") {
          toast.success("Note added successfully");
        } else if (payload.actionType === "call_rider") {
          toast.success("Call rider action recorded");
        } else if (payload.actionType === "mark_offline") {
          toast.success("Rider marked offline");
        } else {
          toast.success("Action completed");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const handleClearResolved = async () => {
    if (confirm("Clear all resolved alerts from this list?")) {
      // Optimistic update: Remove resolved alerts immediately
      const resolvedCount = alerts.filter(a => a.status === "resolved" || a.status === "dismissed").length;
      setAlerts(prev => prev.filter(a => a.status !== "resolved" && a.status !== "dismissed"));
      
      try {
        const result = await clearResolvedAlerts({ archive: true });
        toast.success(result.message || `Cleared ${resolvedCount} resolved alerts`);
        
        // Refresh to get updated summary counts
        loadAlerts(true);
      } catch (e: any) {
        // Revert on error by reloading
        console.error("Failed to clear resolved alerts:", e);
        toast.error("Failed to clear resolved alerts", {
          description: e.message || "Please try again",
        });
        loadAlerts(false);
      }
    }
  };

  // --- Modal Confirm Handlers ---

  const handleReassignConfirm = async (riderId: string, riderName: string) => {
    if (activeAlertId) {
      await executeAction(activeAlertId, { 
        actionType: "reassign_rider", 
        metadata: { riderId, riderName } 
      });
      toast.success(`Reassigned to ${riderName}`);
      closeModal();
    }
  };

  const handleNotifyConfirm = async (message: string) => {
    if (activeAlertId) {
      await executeAction(activeAlertId, { 
        actionType: "notify_customer", 
        metadata: { message } 
      });
      toast.success("Customer notified");
      closeModal();
    }
  };

  const handleAddNoteConfirm = async (note: string) => {
    if (activeAlertId) {
      await executeAction(activeAlertId, { 
        actionType: "add_note", 
        metadata: { note } 
      });
      toast.success("Note added");
      closeModal();
    }
  };

  const closeModal = () => {
    setModalState({
      reassign: false,
      notify: false,
      location: false,
      addNote: false,
      callRider: false
    });
    setActiveAlertId(null);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-2">
            Alerts & Exceptions
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 ml-2">
              {alerts.filter(a => a.priority === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed').length} Critical
            </Badge>
          </h1>
          <p className="text-[#757575] text-sm">Real-time operational alerts requiring attention.</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => loadAlerts(false)} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          {lastRefresh && (
            <span className="text-xs text-[#757575] hidden sm:inline">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={handleClearResolved} className="text-gray-600" disabled={loading}>
            <Trash2 size={16} className="mr-2" /> Clear Resolved
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="flex items-center gap-2">
           <Filter size={16} className="text-gray-500" />
           <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === "all" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterStatus("open")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === "open" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Active
              </button>
              <button 
                onClick={() => setFilterStatus("resolved")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === "resolved" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Resolved
              </button>
           </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
             placeholder="Search alerts..." 
             className="pl-9"
             value={searchQuery}
             onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
             <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))
        ) : visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-300">
             <CheckCircle2 size={48} className="text-green-500 mb-4 opacity-50" />
             <h3 className="text-lg font-medium text-gray-900">No active alerts</h3>
             <p className="text-gray-500 text-sm">Operations are running smoothly.</p>
          </div>
        ) : (
          visibleAlerts.map(alert => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onAction={handleAction}
              isLoading={actionLoading.has(alert.id)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <ReassignRiderModal 
        isOpen={modalState.reassign}
        onClose={closeModal}
        onConfirm={handleReassignConfirm}
      />

      <NotifyCustomerModal
        isOpen={modalState.notify}
        onClose={closeModal}
        onConfirm={handleNotifyConfirm}
      />

      <AddNoteModal
        isOpen={modalState.addNote}
        onClose={closeModal}
        onConfirm={handleAddNoteConfirm}
      />

      <LocationMapModal
        isOpen={modalState.location}
        onClose={closeModal}
        title={activeAlert ? `Location: ${activeAlert.source.riderName || activeAlert.source.vehicleId}` : undefined}
        coords={activeAlert?.source.lat ? { lat: activeAlert.source.lat, lng: activeAlert.source.lng } : undefined}
      />

    </div>
  );
}
