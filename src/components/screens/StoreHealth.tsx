import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, Wifi, Smartphone, Zap, TriangleAlert, 
  ShieldAlert, ScanLine, FileCheck, History, CheckCircle2, 
  XCircle, Thermometer, Battery, Signal, AlertOctagon, RefreshCw
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { EmptyState, InlineNotification, LoadingState } from '../ui/ux-components';
import { toast } from 'sonner';
import * as healthApi from '../../api/store-health/health.api';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

export function StoreHealth() {
  const [activeTab, setActiveTab] = useState<'readiness' | 'equipment' | 'safety'>('readiness');
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadSummary(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadSummary(true);
      }
    }, 20000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [STORE_ID]);

  const loadSummary = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoadingSummary(true);
      }
      const response = await healthApi.getHealthSummary({ storeId: STORE_ID });
      if (isMountedRef.current) {
        if (response.success) {
          setSummary(response.summary);
        }
        setLastRefresh(new Date());
        if (!silent) {
          toast.success("Summary refreshed", { duration: 2000 });
        }
      }
    } catch (error: any) {
      console.error('Failed to load health summary:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load summary", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingSummary(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Store Health"
        subtitle="Monitor readiness checklists, equipment status, and safety logs."
        actions={
          <div className="flex gap-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#F0FDF4] text-[#16A34A] rounded-lg">
                <Wifi size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Network</div>
                <div className="font-bold text-[#212121]">
                  {loadingSummary ? '...' : summary?.network_status || 'Stable'}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                summary?.readiness_status === 'Ready' ? "bg-[#F0FDF4] text-[#16A34A]" : 
                summary?.readiness_status === 'Partially Ready' ? "bg-[#FFF7E6] text-[#D46B08]" : "bg-[#F5F5F5] text-[#757575]"
              )}>
                <ClipboardList size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Readiness</div>
                <div className="font-bold text-[#212121]">
                  {loadingSummary ? '...' : summary?.readiness_status || 'Not Started'}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FEF2F2] text-[#EF4444] rounded-lg">
                <TriangleAlert size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Open Issues</div>
                <div className="font-bold text-[#212121]">
                  {loadingSummary ? '...' : summary ? `${summary.open_issues_count ?? 0} Pending` : '0 Pending'}
                </div>
              </div>
            </div>
            <button
              onClick={() => loadSummary(false)}
              disabled={loadingSummary}
              className="p-2 hover:bg-gray-100 rounded-lg border border-[#E0E0E0] disabled:opacity-50"
              title="Refresh summary"
            >
              <RefreshCw size={16} className={cn(loadingSummary && "animate-spin")} />
            </button>
            {lastRefresh && (
              <span className="text-xs text-[#757575] hidden sm:inline">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="readiness" label="Store Readiness" icon={ClipboardList} active={activeTab} onClick={setActiveTab} />
        <TabButton id="equipment" label="Equipment Monitoring" icon={Smartphone} active={activeTab} onClick={setActiveTab} />
        <TabButton id="safety" label="Safety & Incident Log" icon={ShieldAlert} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'readiness' && <ReadinessTab onActionSuccess={() => loadSummary(true)} />}
        {activeTab === 'equipment' && <EquipmentTab />}
        {activeTab === 'safety' && <SafetyTab onActionSuccess={() => loadSummary(true)} />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
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

// --- Store Readiness Tab ---

function ReadinessTab({ onActionSuccess }: { onActionSuccess?: () => void }) {
  const [activeChecklist, setActiveChecklist] = useState('opening');
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadChecklists(false);
    
    // Auto-refresh checklists every 20 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadChecklists(true); // Silent refresh
      }
    }, 20000);
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [activeChecklist]);

  const loadChecklists = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await healthApi.getChecklists({ 
        storeId: STORE_ID, 
        checklistType: activeChecklist 
      });
      if (isMountedRef.current) {
        if (response.success) {
          setChecklists(response.checklists || []);
        }
      }
    } catch (error: any) {
      console.error('Failed to load checklists:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load checklists", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleToggleItem = async (checklistId: string, itemId: string, currentStatus: string) => {
    const actionKey = `${checklistId}-${itemId}`;
    const currentChecklist = checklists.find(c => c.checklist_id === checklistId);
    const currentItem = currentChecklist?.items?.find((i: any) => i.item_id === itemId);
    
    // Optimistic update
    const newStatus = currentStatus === 'checked' ? 'pending' : 'checked';
    if (currentChecklist && currentItem) {
      setChecklists(prev => prev.map(c => {
        if (c.checklist_id === checklistId) {
          const updatedItems = c.items.map((item: any) =>
            item.item_id === itemId
              ? {
                  ...item,
                  status: newStatus,
                  completed_at: newStatus === 'checked' ? new Date().toISOString() : null,
                  completed_by: newStatus === 'checked' ? 'System User' : null,
                }
              : item
          );
          const completedCount = updatedItems.filter((i: any) => i.status === 'checked').length;
          return {
            ...c,
            items: updatedItems,
            completed_items: completedCount,
            // Status remains the same until manual submission
            status: c.status,
          };
        }
        return c;
      }));
    }
    
    setActionLoading(prev => new Set(prev).add(actionKey));
    
    try {
      const response = await healthApi.updateChecklistItem(checklistId, itemId, {
        status: newStatus,
        completed_by: 'System User'
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          toast.success('Checklist item updated');
          loadChecklists(true);
          onActionSuccess?.();
        }
      }
    } catch (error: any) {
      console.error('Failed to update checklist item:', error);
      // Revert optimistic update
      if (isMountedRef.current && currentChecklist && currentItem) {
        loadChecklists(false);
      }
      toast.error(error.message || 'Failed to update checklist item');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(prev => {
          const next = new Set(prev);
          next.delete(actionKey);
          return next;
        });
      }
    }
  };

  const handleSubmitChecklist = async (checklistId: string) => {
    const currentChecklist = checklists.find(c => c.checklist_id === checklistId);
    
    console.log(`[Real-Time] Initiating submission for checklist: ${checklistId}`);
    
    // Check if items are complete
    const isComplete = currentChecklist?.completed_items === currentChecklist?.total_items;
    
    // Optimistic update
    if (currentChecklist) {
      setChecklists(prev => prev.map(c =>
        c.checklist_id === checklistId
          ? { 
              ...c, 
              status: 'completed', 
              completed_items: c.total_items, // Force 100% on submission
              progress: 100 
            }
          : c
      ));
    }
    
    setActionLoading(prev => new Set(prev).add(checklistId));
    
    try {
      const response = await healthApi.submitChecklist(checklistId, {
        submitted_by: 'System User',
        notes: isComplete ? 'Submitted via UI' : 'Submitted with pending items'
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          console.log('[Real-Time] Checklist submitted successfully:', response);
          toast.success('Checklist submitted successfully');
          // Important: We don't revert on success even if refresh fails
          try {
            await loadChecklists(true);
            onActionSuccess?.();
          } catch (refreshError) {
            console.error('[Real-Time] Failed to refresh checklists after submission:', refreshError);
          }
        } else {
           // Handle case where success is false but no error was thrown
           throw new Error(response.message || 'Submission failed');
        }
      }
    } catch (error: any) {
      console.error('[Real-Time] Failed to submit checklist:', error);
      // Revert optimistic update only on actual submission failure
      if (isMountedRef.current && currentChecklist) {
        setChecklists(prev => prev.map(c =>
          c.checklist_id === checklistId ? currentChecklist : c
        ));
      }
      toast.error(error.message || 'Failed to submit checklist');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(prev => {
          const next = new Set(prev);
          next.delete(checklistId);
          return next;
        });
      }
    }
  };

  const currentChecklist = checklists.find(c => c.checklist_type === activeChecklist) || checklists[0];

  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       {/* Left: Checklist Selection */}
       <div className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4 text-sm uppercase tracking-wider">Checklists</h3>
             <div className="space-y-1">
                <button 
                  onClick={() => setActiveChecklist('opening')}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'opening' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><FileCheck size={16}/> Opening Checklist</span>
                </button>
                <button 
                   onClick={() => setActiveChecklist('closing')}
                   className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'closing' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><History size={16}/> Closing Checklist</span>
                </button>
                <button 
                   onClick={() => setActiveChecklist('hygiene')}
                   className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'hygiene' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><Thermometer size={16}/> Hygiene Checklist</span>
                </button>
             </div>
          </div>

          <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#86EFAC] shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#DCFCE7] text-[#16A34A] rounded-full">
                   <CheckCircle2 size={20} />
                </div>
                <div>
                   <div className="text-sm font-bold text-[#14532D]">
                      Status: {currentChecklist?.status === 'completed' ? 'Ready' : currentChecklist?.status || 'Pending'}
                   </div>
                   <div className="text-xs text-[#166534]">
                      {currentChecklist?.status === 'completed' ? 'Checklist complete.' : 'In progress.'}
                   </div>
                </div>
             </div>
             <p className="text-xs text-[#166534]">
                {currentChecklist?.status === 'completed' ? 'Store is cleared for operations.' : 'Complete all items to submit.'}
             </p>
          </div>
       </div>

       {/* Right: Checklist Items */}
       <div className="col-span-12 md:col-span-9 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#212121]">
                   {activeChecklist === 'opening' && "Opening Checklist (Daily)"}
                   {activeChecklist === 'closing' && "Closing Checklist (Daily)"}
                   {activeChecklist === 'hygiene' && "Hygiene & Sanitation Log"}
                </h3>
             </div>
             <div className="text-sm text-[#757575] font-medium">
                Progress: <span className="text-[#1677FF] font-bold">
                  {currentChecklist ? `${currentChecklist.completed_items}/${currentChecklist.total_items}` : '0/0'}
                </span>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
             {loading ? (
                <div className="flex items-center justify-center h-full">
                   <LoadingState message="Loading checklist..." />
                </div>
             ) : !currentChecklist || !currentChecklist.items || currentChecklist.items.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                   <EmptyState message="No checklist items found" />
                </div>
             ) : (
                <div className="space-y-4">
                   {currentChecklist.items.map((item: any, i: number) => {
                      const isChecked = item.status === 'checked';
                      return (
                         <div key={i} className={cn(
                            "flex items-center justify-between p-4 rounded-lg border",
                            isChecked ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-white border-[#E0E0E0]"
                         )}>
                            <div className="flex items-center gap-4">
                               <div 
                                  onClick={() => {
                                    if (!actionLoading.has(`${currentChecklist.checklist_id}-${item.item_id}`)) {
                                      handleToggleItem(currentChecklist.checklist_id, item.item_id, item.status);
                                    }
                                  }}
                                  className={cn(
                                     "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                                     actionLoading.has(`${currentChecklist.checklist_id}-${item.item_id}`)
                                       ? "cursor-wait opacity-50"
                                       : "cursor-pointer",
                                     isChecked ? "bg-[#16A34A] border-[#16A34A]" : "border-[#D1D5DB]"
                                  )}
                               >
                                  {isChecked && <CheckCircle2 size={16} className="text-white" />}
                                  {actionLoading.has(`${currentChecklist.checklist_id}-${item.item_id}`) && (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  )}
                               </div>
                               <div className={cn("font-medium", isChecked ? "text-[#166534]" : "text-[#212121]")}>
                                  {item.task}
                               </div>
                            </div>
                            <div className="text-xs text-[#757575] text-right">
                               <div>{item.completed_at ? new Date(item.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                               <div>{item.completed_by || '-'}</div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             )}
          </div>
          <div className="p-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex justify-end">
             <button 
                onClick={() => {
                  console.log('Submit button clicked for checklist:', currentChecklist?.checklist_id);
                  if (currentChecklist) {
                    handleSubmitChecklist(currentChecklist.checklist_id);
                  }
                }}
                disabled={!currentChecklist || currentChecklist.status === 'completed' || actionLoading.has(currentChecklist.checklist_id)}
                className={cn(
                  "px-6 py-2 rounded-lg font-bold shadow-sm transition-all duration-200",
                  currentChecklist?.status === 'completed' 
                    ? "bg-[#F0FDF4] text-[#16A34A] border border-[#86EFAC] cursor-default" 
                    : "bg-[#1677FF] text-white hover:bg-[#409EFF] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
             >
                {actionLoading.has(currentChecklist?.checklist_id || '') ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" /> Submitting...
                  </span>
                ) : currentChecklist?.status === 'completed' ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} /> Submitted
                  </span>
                ) : (
                  'Submit Checklist'
                )}
             </button>
          </div>
       </div>
    </div>
  );
}

// --- Equipment Monitoring Tab ---

function EquipmentTab() {
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadEquipment(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadEquipment(true);
      }
    }, 15000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [STORE_ID]);

  const loadEquipment = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await healthApi.getEquipment({ storeId: STORE_ID });
      if (isMountedRef.current) {
        if (response.success) {
          setEquipment(response);
        }
      }
    } catch (error: any) {
      console.error('Failed to load equipment:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load equipment data", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
       {loading ? (
          <div className="flex items-center justify-center h-full">
             <LoadingState message="Loading equipment data..." />
          </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <EquipmentCard 
               title="Handheld Devices" 
               count={equipment?.summary?.handheld_devices ? `${equipment.summary.handheld_devices.active}/${equipment.summary.handheld_devices.total}` : '...'} 
               sub="Active" 
               icon={Smartphone} 
               color="blue" 
               status={equipment?.summary?.handheld_devices?.offline > 0 ? "warning" : "ok"}
             />
             <EquipmentCard 
               title="Barcode Scanners" 
               count={equipment?.summary?.scanners ? `${equipment.summary.scanners.online}/${equipment.summary.scanners.total}` : '...'} 
               sub="Online" 
               icon={ScanLine} 
               color="green" 
               status="ok"
             />
             <EquipmentCard 
               title="Network Status" 
               count={equipment?.summary?.network?.signal_strength ? `${equipment.summary.network.signal_strength}%` : '...'} 
               sub="Signal Strength" 
               icon={Wifi} 
               color="purple" 
               status={equipment?.summary?.network?.status === 'Stable' ? "ok" : "warning"}
             />
             <EquipmentCard 
               title="UPS / Power" 
               count={equipment?.summary?.power?.battery_level ? `${equipment.summary.power.battery_level}%` : '...'} 
               sub="Battery Level" 
               icon={Zap} 
               color="yellow" 
               status="ok"
             />
          </div>
       )}

       <div className="grid grid-cols-12 gap-6 h-[500px]">
          {/* Detailed Device List */}
          <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Device Status Log</h3>
                <div className="flex gap-2">
                   <select className="px-3 py-1.5 border border-[#E0E0E0] rounded text-xs font-bold text-[#616161]">
                      <option>All Devices</option>
                      <option>Zebra TC52</option>
                      <option>Ring Scanners</option>
                   </select>
                </div>
             </div>
             <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                         <th className="px-4 py-3 font-medium">Device ID</th>
                         <th className="px-4 py-3 font-medium">Type</th>
                         <th className="px-4 py-3 font-medium">Assigned To</th>
                         <th className="px-4 py-3 font-medium">Battery</th>
                         <th className="px-4 py-3 font-medium">Signal</th>
                         <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F0F0F0]">
                      {loading ? (
                         <tr>
                            <td colSpan={6} className="px-4 py-8 text-center">
                               <LoadingState message="Loading devices..." />
                            </td>
                         </tr>
                      ) : !equipment?.devices || equipment.devices.length === 0 ? (
                         <tr>
                            <td colSpan={6} className="px-4 py-8 text-center">
                               <EmptyState message="No devices found" />
                            </td>
                         </tr>
                      ) : (
                         equipment.devices.map((dev: any, i: number) => (
                            <tr key={i} className="hover:bg-[#F9FAFB]">
                               <td className="px-4 py-3 font-mono text-xs text-[#616161]">{dev.device_id}</td>
                               <td className="px-4 py-3 font-medium text-[#212121]">{dev.device_type}</td>
                               <td className="px-4 py-3 text-[#616161]">
                                  {typeof dev.assigned_to === 'object' && dev.assigned_to !== null 
                                     ? dev.assigned_to.userName 
                                     : (dev.assigned_to || '-')}
                               </td>
                               <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                     <Battery size={14} className={cn((dev.battery_level || 0) < 20 ? "text-[#EF4444]" : "text-[#16A34A]")} />
                                     <span className={cn("text-xs font-bold", (dev.battery_level || 0) < 20 ? "text-[#EF4444]" : "text-[#212121]")}>
                                        {dev.battery_level || 0}%
                                     </span>
                                  </div>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                     <Signal size={14} className="text-[#616161]" />
                                     <span className="text-xs text-[#616161]">{dev.signal_strength || 'N/A'}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-3">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                     dev.status === 'Active' ? "bg-[#DCFCE7] text-[#16A34A]" : 
                                     dev.status === 'Offline' ? "bg-[#F3F4F6] text-[#9E9E9E]" : "bg-[#FEE2E2] text-[#EF4444]"
                                  )}>
                                     {dev.status}
                                  </span>
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Network Health */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
                <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
                   <Wifi size={18} className="text-[#1677FF]" /> Connectivity
                </h3>
                <div className="space-y-4">
                   <div className="p-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
                      <div className="text-xs font-bold text-[#0284C7] uppercase mb-1">Main Uplink</div>
                      <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-[#0369A1]">Online</span>
                         <span className="text-xs text-[#0369A1]">Latency: 12ms</span>
                      </div>
                   </div>
                   <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg">
                      <div className="text-xs font-bold text-[#616161] uppercase mb-1">Backup 4G</div>
                      <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-[#616161]">Standby</span>
                         <span className="text-xs text-[#9E9E9E]">Signal: Good</span>
                      </div>
                   </div>
                </div>
                
                <h3 className="font-bold text-[#212121] mt-6 mb-4 flex items-center gap-2">
                   <Zap size={18} className="text-[#F59E0B]" /> Power Backup
                </h3>
                <div className="p-3 bg-[#FFFBE6] border border-[#FFE58F] rounded-lg">
                    <div className="text-xs font-bold text-[#D48806] uppercase mb-1">Main UPS</div>
                    <div className="flex justify-between items-end">
                       <span className="text-lg font-bold text-[#D48806]">100% Charged</span>
                       <span className="text-xs text-[#D48806]">Runtime: 4h 20m</span>
                    </div>
                 </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function EquipmentCard({ title, count, sub, icon: Icon, color, status }: any) {
    const colors = {
        blue: "bg-[#E6F7FF] text-[#1677FF]",
        green: "bg-[#DCFCE7] text-[#16A34A]",
        purple: "bg-[#F3E8FF] text-[#9333EA]",
        yellow: "bg-[#FFF7E6] text-[#D46B08]",
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between relative overflow-hidden">
            {status === 'warning' && <div className="absolute top-0 right-0 w-2 h-2 bg-[#EF4444] rounded-full m-2 animate-pulse" />}
            <div className="flex justify-between items-start mb-2">
                <div className={cn("p-2 rounded-lg", colors[color as keyof typeof colors])}>
                    <Icon size={18} />
                </div>
            </div>
            <div>
                <h4 className="text-[#757575] text-xs font-bold uppercase">{title}</h4>
                <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-[#212121]">{count}</p>
                    <p className="text-xs font-medium text-[#757575] mb-1.5">{sub}</p>
                </div>
            </div>
        </div>
    )
}

// --- Safety & Incident Log Tab ---

function SafetyTab({ onActionSuccess }: { onActionSuccess?: () => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [showAuditsHistory, setShowAuditsHistory] = useState(false);
  const [showHazardsHistory, setShowHazardsHistory] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  
  const [newIncident, setNewIncident] = useState({
    type: 'accident',
    location: '',
    description: '',
    priority: 'medium'
  });

  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadIncidents(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadIncidents(true);
      }
    }, 20000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [STORE_ID]);

  const loadIncidents = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await healthApi.getIncidents({ storeId: STORE_ID, status: 'all' });
      if (isMountedRef.current) {
        if (response.success) {
          setIncidents(response.incidents || []);
          setSummary(response.summary);
        }
      }
    } catch (error: any) {
      console.error('Failed to load incidents:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load incidents", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    // Optimistic update
    const currentIncident = incidents.find(i => i.incident_id === incidentId);
    if (currentIncident) {
      setIncidents(prev => prev.map(i =>
        i.incident_id === incidentId
          ? { ...i, status: 'Resolved', resolved_at: new Date().toISOString(), resolved_by: 'System User' }
          : i
      ));
    }
    
    setActionLoading(prev => new Set(prev).add(incidentId));
    
    try {
      const response = await healthApi.resolveIncident(incidentId, {
        resolved_by: 'System User',
        resolution_notes: 'Resolved via UI'
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          console.log('Incident resolved successfully:', response);
          toast.success('Incident resolved successfully');
          loadIncidents(true);
          onActionSuccess?.();
        }
      }
    } catch (error: any) {
      console.error('Failed to resolve incident:', error);
      // Revert optimistic update
      if (isMountedRef.current && currentIncident) {
        setIncidents(prev => prev.map(i => i.incident_id === incidentId ? currentIncident : i));
      }
      toast.error(error.message || 'Failed to resolve incident');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(prev => {
          const next = new Set(prev);
          next.delete(incidentId);
          return next;
        });
      }
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(prev => new Set(prev).add('reporting'));
    
    try {
      const response = await healthApi.reportIncident({
        ...newIncident,
        reported_by: 'System User',
        storeId: STORE_ID
      });
      
      if (response.success) {
        toast.success('Incident reported successfully');
        setIsReportModalOpen(false);
        setNewIncident({
          type: 'accident',
          location: '',
          description: '',
          priority: 'medium'
        });
        loadIncidents(true);
        onActionSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to report incident:', error);
      toast.error(error.message || 'Failed to report incident');
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev);
        next.delete('reporting');
        return next;
      });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       {/* Left: Incident Stats */}
       <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4">Safety Overview</h3>
             {loading ? (
                <LoadingState message="Loading safety data..." />
             ) : (
                <>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                         <div className="text-2xl font-bold text-[#EF4444]">
                            {summary?.accidents_this_week || 0}
                         </div>
                         <div className="text-xs font-bold text-[#991B1B] uppercase">Accidents (Week)</div>
                      </div>
                      <div className="p-3 bg-[#F0FDF4] rounded-lg border border-[#86EFAC]">
                         <div className="text-2xl font-bold text-[#16A34A]">
                            {summary?.days_safe || 0}
                         </div>
                         <div className="text-xs font-bold text-[#166534] uppercase">Days Safe</div>
                      </div>
                   </div>
                   
                   <div className="mt-6 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg bg-[#FAFAFA]">
                           <div className="flex flex-col">
                             <span className="text-sm font-medium text-[#616161]">Safety Audits</span>
                             <span className="text-sm font-bold text-[#22C55E]">
                                {summary?.safety_audits_status || 'Up to Date'}
                             </span>
                           </div>
                           <button 
                             onClick={() => setShowAuditsHistory(!showAuditsHistory)}
                             className={cn(
                               "p-2 rounded-lg transition-colors",
                               showAuditsHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                             )}
                             title="View Audit History"
                           >
                             <History size={16} />
                           </button>
                        </div>
                        {showAuditsHistory && (
                          <div className="p-3 border border-[#E0E0E0] rounded-lg bg-white overflow-y-auto max-h-[200px]">
                            <h4 className="text-[10px] font-bold text-[#757575] uppercase mb-2">Audit History</h4>
                            <ActionHistoryViewer module="health" action="SUBMIT_CHECKLIST" limit={5} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg bg-[#FAFAFA]">
                           <div className="flex flex-col">
                             <span className="text-sm font-medium text-[#616161]">Hazard Reports</span>
                             <span className="text-sm font-bold text-[#F59E0B]">
                                {summary?.open_hazards || 0} Open
                             </span>
                           </div>
                           <button 
                             onClick={() => setShowHazardsHistory(!showHazardsHistory)}
                             className={cn(
                               "p-2 rounded-lg transition-colors",
                               showHazardsHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                             )}
                             title="View Hazard History"
                           >
                             <History size={16} />
                           </button>
                        </div>
                        {showHazardsHistory && (
                          <div className="p-3 border border-[#E0E0E0] rounded-lg bg-white overflow-y-auto max-h-[200px]">
                            <h4 className="text-[10px] font-bold text-[#757575] uppercase mb-2">Hazard History</h4>
                            <ActionHistoryViewer module="health" action="REPORT_INCIDENT" limit={5} />
                          </div>
                        )}
                      </div>
                   </div>
                </>
             )}
          </div>

          {incidents.filter((inc: any) => inc.status === 'Open' && inc.type === 'hazard').length > 0 && (
             <div className="bg-[#FFF7ED] p-5 rounded-xl border border-[#FED7AA] shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-[#C2410C]">
                   <AlertOctagon size={20} />
                   <h3 className="font-bold">Hazardous Zone Alert</h3>
                </div>
                {incidents.filter((inc: any) => inc.status === 'Open' && inc.type === 'hazard').slice(0, 1).map((hazard: any) => (
                   <div key={hazard.incident_id}>
                      <p className="text-xs text-[#9A3412] mb-4">
                         {hazard.description} - {hazard.location}
                      </p>
                      <button 
                         onClick={() => handleResolveIncident(hazard.incident_id)}
                         disabled={actionLoading.has(hazard.incident_id)}
                         className="w-full py-2 bg-[#C2410C] text-white text-xs font-bold rounded hover:bg-[#9A3412] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {actionLoading.has(hazard.incident_id) ? 'Resolving...' : 'Mark as Resolved'}
                      </button>
                   </div>
                ))}
             </div>
          )}
       </div>

       {/* Right: Incident Log */}
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Incident & Hazard Log</h3>
             
             <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogTrigger asChild>
                  <button className="px-3 py-1.5 bg-[#EF4444] text-white rounded text-xs font-bold hover:bg-[#DC2626] flex items-center gap-2">
                     <TriangleAlert size={14} /> Report Incident
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]" aria-describedby="report-incident-description">
                  <DialogHeader>
                    <DialogTitle>Report New Incident</DialogTitle>
                    <DialogDescription id="report-incident-description">
                      Provide details about the incident or safety hazard to log it in the system.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleReportIncident} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Incident Type</Label>
                      <Select 
                        value={newIncident.type} 
                        onValueChange={(v) => setNewIncident(prev => ({ ...prev, type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accident">Accident / Injury</SelectItem>
                          <SelectItem value="hazard">Safety Hazard</SelectItem>
                          <SelectItem value="spill">Spill / Clean-up</SelectItem>
                          <SelectItem value="equipment">Equipment Failure</SelectItem>
                          <SelectItem value="security">Security Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input 
                        id="location" 
                        placeholder="e.g. Aisle 4, Packing Station 2" 
                        value={newIncident.location}
                        onChange={(e) => setNewIncident(prev => ({ ...prev, location: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={newIncident.priority} 
                        onValueChange={(v) => setNewIncident(prev => ({ ...prev, priority: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Provide details about the incident..." 
                        value={newIncident.description}
                        onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <DialogFooter>
                      <button 
                        type="submit" 
                        disabled={actionLoading.has('reporting')}
                        className="w-full py-2 bg-[#EF4444] text-white font-bold rounded-lg hover:bg-[#DC2626] disabled:opacity-50"
                      >
                        {actionLoading.has('reporting') ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>
          </div>
          <div className="flex-1 overflow-auto">
             {loading ? (
                <div className="flex items-center justify-center h-full">
                   <LoadingState message="Loading incidents..." />
                </div>
             ) : incidents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                   <EmptyState message="No incidents found" />
                </div>
             ) : (
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                         <th className="px-4 py-3 font-medium">Date/Time</th>
                         <th className="px-4 py-3 font-medium">Type</th>
                         <th className="px-4 py-3 font-medium">Location</th>
                         <th className="px-4 py-3 font-medium">Description</th>
                         <th className="px-4 py-3 font-medium">Reported By</th>
                         <th className="px-4 py-3 font-medium">Status</th>
                         <th className="px-4 py-3 font-medium">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F0F0F0]">
                      {incidents.map((incident: any, i: number) => (
                         <tr key={i} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 text-[#616161] text-xs">
                               {new Date(incident.reported_at).toLocaleString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                               })}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#212121]">{incident.type}</td>
                            <td className="px-4 py-3 text-[#616161]">{incident.location}</td>
                            <td className="px-4 py-3 text-[#212121] max-w-[200px] truncate">{incident.description}</td>
                            <td className="px-4 py-3 text-[#616161] text-xs">{incident.reported_by}</td>
                            <td className="px-4 py-3">
                               <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  incident.status === 'Resolved' ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#EF4444]"
                               )}>
                                  {incident.status}
                               </span>
                            </td>
                            <td className="px-4 py-3">
                               {incident.status === 'Open' && (
                                  <button 
                                     onClick={() => handleResolveIncident(incident.incident_id)}
                                     disabled={actionLoading.has(incident.incident_id)}
                                     className="text-[#1677FF] font-bold text-xs hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                     {actionLoading.has(incident.incident_id) ? 'Resolving...' : 'Resolve'}
                                  </button>
                               )}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             )}
          </div>
       </div>
    </div>
  );
}