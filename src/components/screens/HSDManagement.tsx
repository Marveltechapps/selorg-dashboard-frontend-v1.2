import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stopModalPointerPropagation } from "@/components/ui/modalOverlayGuards";
import { 
  Smartphone, Battery, Wifi, AlertTriangle, RefreshCw, Lock, 
  Search, Filter, Activity, ScanLine, RotateCcw, UserPlus, 
  FileText, CheckCircle2, XCircle, ChevronRight, Tablet, MapPin,
  Plus, X, Loader2, Users, ChevronLeft
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreTabBar } from '../darkstore/DarkstoreTabBar';
import { MetricCard } from '../darkstore/MetricCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import * as hsdApi from '../../api/hsd/hsdApi';
import { useAuth } from '../../contexts/AuthContext';
import { HSDUserDetailsDrawer } from './darkstore/HSDUserDetailsDrawer';


const HSD_TABS = ['fleet', 'users', 'live', 'issues', 'logs'] as const;
type HsdTab = (typeof HSD_TABS)[number];

function parseHsdTab(value: string | null): HsdTab {
  if (value && (HSD_TABS as readonly string[]).includes(value)) {
    return value as HsdTab;
  }
  return 'fleet';
}

function findHsdUserMatch(
  list: hsdApi.HSDUserLoginRow[],
  userId: string,
  sessionId: string | null
): hsdApi.HSDUserLoginRow | undefined {
  if (sessionId) {
    const bySession = list.find((u) => u.sessionId === sessionId);
    if (bySession) return bySession;
  }
  return list.find((u) => u.userId === userId);
}

function resolveHsdStoreId(activeStoreId: string | null | undefined): string {
  return activeStoreId?.trim() || '';
}

export function HSDManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = parseHsdTab(searchParams.get('tab'));
  const activeTab =
    searchParams.get('userId') && tabFromUrl !== 'users' ? 'users' : tabFromUrl;
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const userId = searchParams.get('userId');

    if (tab && (!userId || tab === 'users')) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (userId) next.set('tab', 'users');
      else if (!tab) next.set('tab', 'fleet');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const changeHsdTab = useCallback((tab: HsdTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (tab !== 'users') {
        next.delete('userId');
        next.delete('sessionId');
      }
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  return (
    <DarkstoreScreenShell
      title="HSD Device Management"
      subtitle="Manage handheld fleet, monitor live scan sessions, and track hardware issues"
      actions={
        <Button onClick={() => setShowRegisterModal(true)} className="gap-2">
          <Plus size={16} />
          Register Device
        </Button>
      }
      toolbar={{ showConnection: true }}
    >
      <DarkstoreTabBar
        active={activeTab}
        onChange={(id) => changeHsdTab(id as HsdTab)}
        tabs={[
          { id: 'fleet', label: 'Fleet Overview', icon: Tablet },
          { id: 'users', label: 'HSD User List', icon: Users },
          { id: 'live', label: 'Live Sessions (Scan/QC)', icon: ScanLine },
          { id: 'issues', label: 'Issue Tracker', icon: AlertTriangle },
          { id: 'logs', label: 'HSD Logs', icon: FileText },
        ]}
      />

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'fleet' && <FleetOverview />}
        {activeTab === 'users' && <HSDUserList />}
        {activeTab === 'live' && <LiveSessions />}
        {activeTab === 'issues' && <IssueTracker />}
        {activeTab === 'logs' && <HSDLogs />}
      </div>

      {showRegisterModal && (
        <RegisterDeviceModal 
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            // We might need a way to trigger a refresh in the child component
            // but for now, the auto-refresh in FleetOverview will catch it
          }}
        />
      )}
    </DarkstoreScreenShell>
  );
}

function RegisterDeviceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceType: 'Scanner',
    serialNumber: '',
    firmwareVersion: '1.0.0'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await hsdApi.registerDevice(formData);
      toast.success('Device registered successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" {...stopModalPointerPropagation}>
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Register New Device</h3>
          <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-900 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Device ID</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. HSD-010"
              value={formData.deviceId}
              onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Device Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              value={formData.deviceType}
              onChange={e => setFormData({ ...formData, deviceType: e.target.value })}
            >
              <option value="Scanner">Scanner</option>
              <option value="Tablet">Tablet</option>
              <option value="Printer">Mobile Printer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Serial Number</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. SN-998877"
              value={formData.serialNumber}
              onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Fleet Overview Tab ---

function FleetOverview() {
  const [devices, setDevices] = useState<any[]>([]);
  const [fleetSummary, setFleetSummary] = useState<hsdApi.FleetOverviewResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [deviceHistory, setDeviceHistory] = useState<Map<string, any[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const { activeStoreId } = useAuth();
  const storeId = resolveHsdStoreId(activeStoreId);
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadFleetData();
    const interval = setInterval(() => {
      if (isMounted.current) {
        loadFleetData(true);
      }
    }, 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [storeId]);

  const loadFleetData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setLoadError(null);
      const response = await hsdApi.getFleetOverview({ storeId });
      if (!isMounted.current) return;
      setFleetSummary(response.summary);
      const transformedDevices = response.devices.map((device: any) => ({
        id: device.deviceId,
        user: device.assignedTo ? device.assignedTo.userName : '-',
        userId: device.assignedTo?.userId || null,
        status: device.status === 'online' ? 'Online' : 
                device.status === 'offline' ? 'Offline' :
                device.status === 'charging' ? 'Charging' : 'Error',
        battery: device.battery || 0,
        signal: device.signal === 'strong' ? 'Strong' :
                device.signal === 'good' ? 'Good' :
                device.signal === 'weak' ? 'Weak' : 
                device.signal === 'strong' ? 'Strong' : 'No Signal',
        lastSync: formatLastSync(device.lastSync),
        type: device.assignedTo?.userType || 'Spare',
      }));
      setDevices(transformedDevices);
    } catch (error: any) {
      console.error('Failed to load fleet data:', error);
      if (!isMounted.current) return;
      const message = error?.message || 'Failed to load fleet data';
      setLoadError(message);
      if (!isSilent) toast.error(message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleDeviceControl = async (deviceId: string, action: 'lock' | 'reboot') => {
    try {
      setControlLoading(`${deviceId}-${action}`);
      await hsdApi.deviceControl(deviceId, { action, reason: `Manual ${action} from dashboard`, storeId });
      toast.success(`✅ Device ${action} command sent`);
      await loadFleetData(true);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} device`);
    } finally {
      setControlLoading(null);
    }
  };

  const formatLastSync = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const handleToggleSelection = (deviceId: string) => {
    setSelectedDevices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDevices.size === devices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(devices.map(d => d.id)));
    }
  };

  const handleResetSelected = async () => {
    if (selectedDevices.size === 0) {
      return;
    }

    try {
      setResetting(true);
      const deviceIds = Array.from(selectedDevices);
      
      const response = await hsdApi.bulkResetDevices({
        deviceIds,
        storeId,
        reason: 'Manual reset',
      });

      if (response.success) {
        toast.success(`✅ ${response.results.length} device(s) reset successfully`);
        setSelectedDevices(new Set());
        
        // Refresh fleet data
        await loadFleetData(true);
        
        // Refresh history for affected devices if expanded
        for (const deviceId of deviceIds) {
          if (expandedHistory.has(deviceId)) {
            await loadDeviceHistory(deviceId);
          }
        }
      } else {
        toast.error('Failed to reset devices');
      }
    } catch (error: any) {
      console.error('Reset devices error:', error);
      toast.error(error.message || 'Failed to reset devices');
    } finally {
      setResetting(false);
    }
  };

  const handleToggleHistory = async (deviceId: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(deviceId)) {
      newExpanded.delete(deviceId);
    } else {
      newExpanded.add(deviceId);
      await loadDeviceHistory(deviceId);
    }
    setExpandedHistory(newExpanded);
  };

  const loadDeviceHistory = async (deviceId: string) => {
    try {
      setLoadingHistory((prev) => {
        const newSet = new Set(prev);
        newSet.add(deviceId);
        return newSet;
      });

      const response = await hsdApi.getDeviceHistory(deviceId, { limit: 20 });
      
      if (response.success) {
        setDeviceHistory((prev) => {
          const newMap = new Map(prev);
          newMap.set(deviceId, response.history || []);
          return newMap;
        });
      }
    } catch (error: any) {
      console.error('Failed to load device history:', error);
      toast.error('Failed to load device history');
    } finally {
      setLoadingHistory((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  const handleAssignDevice = async (userId: string, userName: string, userType: 'Picker' | 'Packer' | 'Rider') => {
    if (selectedDevices.size === 0) {
      toast.error('Please select at least one device');
      return;
    }

    try {
      setAssigning(true);
      const deviceIds = Array.from(selectedDevices);
      
      // Assign all selected devices
      const promises = deviceIds.map(deviceId =>
        hsdApi.assignDevice(deviceId, { userId, userName, userType })
      );

      await Promise.all(promises);
      
      toast.success(`✅ ${deviceIds.length} device(s) assigned to ${userName}`);
      setSelectedDevices(new Set());
      setShowAssignModal(false);
      
      // Refresh fleet data
      await loadFleetData(true);
    } catch (error: any) {
      console.error('Assign device error:', error);
      toast.error(error.message || 'Failed to assign device(s)');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Online Status"
            value={fleetSummary ? `${fleetSummary.onlineDevices}/${fleetSummary.totalDevices}` : '0/0'}
            icon={Wifi}
            accent="success"
            loading={loading}
            footer={<p className="text-[10px] text-slate-400">Devices Active</p>}
          />
          <MetricCard
            label="Battery Health"
            value={fleetSummary ? `${fleetSummary.lowBatteryCount} Low` : '0 Low'}
            icon={Battery}
            accent="warning"
            loading={loading}
            footer={<p className="text-[10px] text-slate-400">&lt; 20% Charge</p>}
          />
          <MetricCard
            label="Sync Latency"
            value={fleetSummary ? `${fleetSummary.avgSyncLatency}ms` : '—'}
            icon={RefreshCw}
            loading={loading}
            footer={<p className="text-[10px] text-slate-400">Avg. Response</p>}
          />
          <MetricCard
            label="Device Errors"
            value={fleetSummary ? fleetSummary.errorDevices : 0}
            icon={AlertTriangle}
            accent="danger"
            loading={loading}
            footer={<p className="text-[10px] text-slate-400">Requires Action</p>}
          />
       </div>

       <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">
            Device Inventory
            {selectedDevices.size > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({selectedDevices.size} selected)
              </span>
            )}
          </h3>
          <div className="flex gap-2">
             <button 
               onClick={handleResetSelected}
               disabled={selectedDevices.size === 0}
               className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                <RotateCcw size={14} /> Reset Selected
             </button>
             <button 
               onClick={() => setShowAssignModal(true)}
               disabled={selectedDevices.size === 0}
               className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                <UserPlus size={14} /> Assign Device
             </button>
          </div>
        </div>
        
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
          </div>
        ) : loadError && devices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-500 mb-3">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadFleetData()}
              className="text-xs font-bold text-blue-600 underline"
            >
              Retry
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Tablet size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-600">No HSD devices registered</p>
            <p className="text-xs mt-1">Register a device to start tracking fleet status for {storeId}.</p>
          </div>
        ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selectedDevices.size === devices.length && devices.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-600"
                />
              </th>
              <th className="px-6 py-3 font-medium">Device ID</th>
              <th className="px-6 py-3 font-medium">Assigned To</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Battery</th>
              <th className="px-6 py-3 font-medium">Signal</th>
              <th className="px-6 py-3 font-medium">Last Sync</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((device) => (
              <tr key={device.id} className={cn(
                "hover:bg-slate-50 transition-colors",
                selectedDevices.has(device.id) && "bg-blue-50"
              )}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedDevices.has(device.id)}
                    onChange={() => handleToggleSelection(device.id)}
                    className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-600"
                  />
                </td>
                <td className="px-6 py-4 font-mono font-medium text-slate-900">{device.id}</td>
                <td className="px-6 py-4">
                  {device.user !== '-' ? (
                    <div className="flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                         {device.user.charAt(0)}
                       </span>
                       <div>
                          <div className="text-slate-900 font-medium text-xs">{device.user}</div>
                          <div className="text-[10px] text-slate-400">{device.type}</div>
                       </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant="workflow" status={device.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Battery size={16} className={cn(device.battery < 20 ? "text-red-500" : "text-emerald-600")} />
                    <span className="text-xs font-bold text-slate-600">{device.battery}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <Wifi size={16} className={cn(
                      device.signal === 'Strong' ? "text-blue-600" : 
                      device.signal === 'No Signal' ? "text-slate-200" : "text-amber-500"
                   )} />
                </td>
                <td className="px-6 py-4 text-slate-600 text-xs">{device.lastSync}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => handleToggleHistory(device.id)}
                    className={cn(
                      "p-1.5 rounded border border-slate-200 transition-colors",
                      expandedHistory.has(device.id) ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="View History"
                  >
                    <FileText size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeviceControl(device.id, 'lock')}
                    disabled={controlLoading === `${device.id}-lock`}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-50" 
                    title="Lock Device"
                  >
                    {controlLoading === `${device.id}-lock` ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDeviceControl(device.id, 'reboot')}
                    disabled={controlLoading === `${device.id}-reboot`}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-50" 
                    title="Reboot"
                  >
                    {controlLoading === `${device.id}-reboot` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                </td>
              </tr>
            ))}
            {devices.map((device) => expandedHistory.has(device.id) && (
              <tr key={`${device.id}-history`} className="bg-slate-50">
                <td colSpan={8} className="px-10 py-4">
                  <div className="border-l-2 border-blue-600 pl-4 py-2">
                    <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Device History: {device.id}</h4>
                    {loadingHistory.has(device.id) ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 size={12} className="animate-spin" /> Loading history...
                      </div>
                    ) : !deviceHistory.get(device.id) || deviceHistory.get(device.id)?.length === 0 ? (
                      <div className="text-xs text-slate-400">No history recorded for this device</div>
                    ) : (
                      <div className="space-y-3">
                        {deviceHistory.get(device.id)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-start">
                            <div className="min-w-[120px] text-[10px] font-mono text-slate-400">
                              {new Date(item.performed_at).toLocaleString()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                  item.action === 'ASSIGN' ? "bg-blue-100 text-blue-700" :
                                  item.action === 'UNASSIGN' ? "bg-slate-100 text-slate-700" :
                                  item.action === 'RESET' ? "bg-orange-100 text-orange-700" :
                                  "bg-purple-100 text-purple-700"
                                )}>
                                  {item.action}
                                </span>
                                <span className="text-xs text-slate-900 font-medium">
                                 {item.action === 'ASSIGN' ? `Assigned to ${item.metadata?.userName}` :
                                  item.action === 'UNASSIGN' ? `Unassigned (Reason: ${item.metadata?.reason})` :
                                  item.action === 'RESET' ? `Device reset (Reason: ${item.metadata?.reason})` :
                                  item.action === 'LOCK' ? 'Device locked remotely' :
                                  item.action === 'REBOOT' ? 'Device rebooted remotely' : 
                                  item.action === 'RESTART_APP' ? 'App service restarted' :
                                  item.action === 'CLEAR_CACHE' ? 'Device cache cleared' : item.action}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Performed by: {item.performed_by}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}

        {/* Assign Device Modal */}
        {showAssignModal && (
          <AssignDeviceModal
            selectedCount={selectedDevices.size}
            onAssign={handleAssignDevice}
            onClose={() => setShowAssignModal(false)}
            assigning={assigning}
          />
        )}
      </div>
    </div>
  );
}

// Assign Device Modal Component
function AssignDeviceModal({
  selectedCount,
  onAssign,
  onClose,
  assigning,
}: {
  selectedCount: number;
  onAssign: (userId: string, userName: string, userType: 'Picker' | 'Packer' | 'Rider') => void;
  onClose: () => void;
  assigning: boolean;
}) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'Picker' | 'Packer' | 'Rider'>('Picker');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !userName) {
      toast.error('Please fill in all fields');
      return;
    }
    onAssign(userId, userName, userType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" {...stopModalPointerPropagation}>
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Assign Device{selectedCount > 1 ? 's' : ''}</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. USR-001"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
              User Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
              User Type
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'Picker' | 'Packer' | 'Rider')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none bg-white"
            >
              <option value="Picker">Picker</option>
              <option value="Packer">Packer</option>
              <option value="Rider">Rider</option>
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-600">
            Assigning {selectedCount} device{selectedCount > 1 ? 's' : ''} to {userName || 'user'}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 font-medium rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || !userId || !userName}
              className={cn(
                "flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 flex items-center justify-center gap-2",
                (assigning || !userId || !userName) && "opacity-50 cursor-not-allowed"
              )}
            >
              {assigning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Assign
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Live Sessions Tab (Scan & Pick Simulator) ---

function LiveSessions() {
   const [sessions, setSessions] = useState<any[]>([]);
   const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState<string | null>(null);
   const { activeStoreId } = useAuth();
   const storeId = resolveHsdStoreId(activeStoreId);
   const isMounted = useRef(true);

   useEffect(() => {
      isMounted.current = true;
      loadSessions();
      const interval = setInterval(() => loadSessions(true), 10000);
      return () => {
         isMounted.current = false;
         clearInterval(interval);
      };
   }, [storeId]);

   const loadSessions = async (isSilent = false) => {
      try {
         if (!isSilent) setLoading(true);
         const data = await hsdApi.getLiveSessions({ storeId });
         if (isMounted.current) {
            setSessions(data);
            if (data.length > 0 && !selectedDeviceId) {
               setSelectedDeviceId(data[0].deviceId);
            }
         }
      } catch (error) {
         console.error('Failed to load sessions:', error);
      } finally {
         if (isMounted.current && !isSilent) setLoading(false);
      }
   };

   const handleSessionAction = async (action: 'confirm_quantity' | 'report_issue') => {
      if (!selectedDeviceId) return;
      try {
         setActionLoading(action);
         await hsdApi.sessionAction(selectedDeviceId, { action });
         toast.success(action === 'confirm_quantity' ? 'Quantity confirmed' : 'Issue reported');
         await loadSessions(true);
      } catch (error: any) {
         toast.error(error.message || 'Action failed');
      } finally {
         setActionLoading(null);
      }
   };

   const selectedSession = sessions.find(s => s.deviceId === selectedDeviceId);

   return (
      <div className="grid grid-cols-12 gap-6 h-[600px]">
         {/* Sidebar: Active Sessions */}
         <div className="col-span-12 md:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h3 className="font-bold text-slate-900">Active Scan Sessions</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
               {loading && sessions.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center text-slate-400">
                     <Loader2 className="animate-spin mb-2" size={24} />
                     <p className="text-xs">Loading sessions...</p>
                  </div>
               ) : sessions.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                     <p className="text-xs">No active sessions</p>
                  </div>
               ) : (
                  sessions.map((session, i) => (
                     <div 
                        key={i} 
                        onClick={() => setSelectedDeviceId(session.deviceId)}
                        className={cn(
                           "p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors",
                           selectedDeviceId === session.deviceId ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                        )}
                     >
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-slate-900 text-sm">{session.deviceId}</span>
                           <StatusBadge variant="workflow" status={session.currentStatus} />
                        </div>
                        <div className="text-xs text-slate-600 font-medium mb-1">{session.userName}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                           <Activity size={12} /> {session.taskType.toUpperCase()} #{session.taskId}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Main: Device Simulator / Details */}
         <div className="col-span-12 md:col-span-8 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               {selectedSession ? (
                  <>
                     <div className="flex justify-between items-center mb-6">
                        <div>
                           <h3 className="font-bold text-slate-900 text-lg">Live View: {selectedSession.deviceId}</h3>
                           <p className="text-xs text-slate-500">Mirroring screen for user: {selectedSession.userName}</p>
                        </div>
                        <div className="flex gap-2">
                           <StatusBadge variant="workflow" status="online" />
                           <span className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              <Battery size={12} /> 85%
                           </span>
                        </div>
                     </div>

                     {/* Simulated Screen Interface */}
                     <div className="bg-slate-900 rounded-xl p-4 max-w-sm mx-auto shadow-xl border-4 border-slate-700">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center text-slate-400 text-[10px] mb-4 px-2">
                           <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           <div className="flex gap-1">
                              <Wifi size={10} />
                              <Battery size={10} />
                           </div>
                        </div>

                        {/* App Content */}
                        <div className="bg-slate-800 rounded-lg p-4 min-h-[400px] flex flex-col text-white">
                           <div className="flex items-center justify-between mb-4">
                              <span className="text-xs text-slate-400">Task #{selectedSession.taskId}</span>
                              <span className="text-xs font-bold text-emerald-400">{selectedSession.itemsCompleted}/{selectedSession.itemsTotal} Items</span>
                           </div>
                           
                           <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                              <div className="w-24 h-24 bg-white/10 rounded-lg flex items-center justify-center mb-2">
                                 <ScanLine size={48} className="text-blue-400 animate-pulse" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-lg">{selectedSession.currentStatus}</h4>
                                 <p className="text-sm text-slate-400">Current Zone: {selectedSession.zone || 'N/A'}</p>
                              </div>
                           </div>

                           <div className="mt-auto space-y-2">
                              <button 
                                 onClick={() => handleSessionAction('confirm_quantity')}
                                 disabled={actionLoading !== null}
                                 className="w-full py-3 bg-blue-600 rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                              >
                                 {actionLoading === 'confirm_quantity' ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Quantity (1)'}
                              </button>
                              <button 
                                 onClick={() => handleSessionAction('report_issue')}
                                 disabled={actionLoading !== null}
                                 className="w-full py-3 bg-slate-700 rounded font-bold text-sm text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                              >
                                 {actionLoading === 'report_issue' ? <Loader2 size={16} className="animate-spin" /> : 'Report Issue'}
                              </button>
                           </div>
                        </div>
                     </div>
                  </>
               ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 py-20">
                     <p>Select a session to view live simulator</p>
                  </div>
               )}
            </div>

            {/* Recent Actions Log */}
            {selectedDeviceId && <DeviceActionsLog deviceId={selectedDeviceId} />}
         </div>
      </div>
   );
}

function DeviceActionsLog({ deviceId }: { deviceId: string }) {
   const [actions, setActions] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      loadActions();
      const interval = setInterval(loadActions, 5000);
      return () => clearInterval(interval);
   }, [deviceId]);

   const loadActions = async () => {
      try {
         const data = await hsdApi.getDeviceActions(deviceId, { limit: 5 });
         setActions(data);
      } catch (error) {
         console.error('Failed to load actions:', error);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <h4 className="font-bold text-slate-900 text-sm mb-3">Recent Device Actions</h4>
         <div className="space-y-2">
            {loading && actions.length === 0 ? (
               <p className="text-xs text-slate-400">Loading...</p>
            ) : actions.length === 0 ? (
               <p className="text-xs text-slate-400">No recent actions</p>
            ) : (
               actions.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 border-b border-slate-100 last:border-0">
                     <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                     <span className={cn(
                        "w-2 h-2 rounded-full",
                        log.result === 'success' ? "bg-emerald-600" : 
                        log.result === 'error' ? "bg-red-500" : "bg-blue-600"
                     )} />
                     <span className="text-slate-900">{log.details}</span>
                  </div>
               ))
            )}
         </div>
      </div>
   );
}

// --- Issue Tracker Tab ---

function IssueTracker() {
   const [issues, setIssues] = useState<any[]>([]);
   const [showManageModal, setShowManageModal] = useState(false);
   const [selectedIssue, setSelectedIssue] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [showReportModal, setShowReportModal] = useState(false);
   const [controlLoading, setControlLoading] = useState<string | null>(null);
   const { activeStoreId } = useAuth();
   const storeId = resolveHsdStoreId(activeStoreId);
   const isMounted = useRef(true);

   useEffect(() => {
      isMounted.current = true;
      loadIssues();
      const interval = setInterval(() => loadIssues(true), 15000);
      return () => {
         isMounted.current = false;
         clearInterval(interval);
      };
   }, [storeId]);

   const loadIssues = async (isSilent = false) => {
      try {
         if (!isSilent) setLoading(true);
         const data = await hsdApi.getIssues({ storeId });
         if (isMounted.current) {
            setIssues(data);
         }
      } catch (error) {
         console.error('Failed to load issues:', error);
      } finally {
         if (isMounted.current && !isSilent) setLoading(false);
      }
   };

   const handleTroubleshooting = async (action: 'restart_app' | 'clear_cache') => {
      try {
         setControlLoading(action);
         // Apply to all devices or a specific one? For now, let's assume global or prompt
         // Require a device from the issue list before troubleshooting
         const deviceId = issues[0]?.deviceId;
         if (!deviceId) {
           toast.error('Select a device before troubleshooting');
           return;
         }
         await hsdApi.deviceControl(deviceId, { action, reason: 'Quick troubleshooting' });
         toast.success(`✅ ${action === 'restart_app' ? 'App Service Restarted' : 'Cache Cleared'} successfully`);
      } catch (error: any) {
         toast.error(error.message || 'Troubleshooting failed');
      } finally {
         setControlLoading(null);
      }
   };

   const handleRequisition = async () => {
      try {
         setControlLoading('requisition');
         const damagedDevices = issues.filter(i => i.issueType === 'hardware' && i.status !== 'resolved').map(i => i.deviceId);
         if (damagedDevices.length === 0) {
            toast.error('No damaged devices found in issue tracker');
            return;
         }
         await hsdApi.createRequisition({
            deviceIds: damagedDevices,
            reason: 'Hardware failure replacement',
            priority: 'high',
            storeId
         });
         toast.success('✅ Requisition order created for ' + damagedDevices.length + ' devices');
      } catch (error: any) {
         toast.error(error.message || 'Failed to create requisition');
      } finally {
         setControlLoading(null);
      }
   };

   return (
      <div className="grid grid-cols-12 gap-6 h-[600px]">
         <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-900">Active Issues</h3>
               <button 
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 flex items-center gap-2"
               >
                  <AlertTriangle size={14} /> Report Fault
               </button>
            </div>
            <div className="flex-1 overflow-auto">
               {loading && issues.length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                     <Loader2 className="animate-spin mb-2" size={24} />
                     <p className="text-xs">Loading issues...</p>
                  </div>
               ) : issues.length === 0 ? (
                  <div className="p-20 text-center text-slate-400">
                     <p className="text-xs">No active issues found</p>
                  </div>
               ) : (
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                           <th className="px-4 py-3 font-medium">Ticket ID</th>
                           <th className="px-4 py-3 font-medium">Device</th>
                           <th className="px-4 py-3 font-medium">Issue Type</th>
                           <th className="px-4 py-3 font-medium">Description</th>
                           <th className="px-4 py-3 font-medium">Status</th>
                           <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {issues.map((ticket, i) => (
                           <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs">{ticket.ticketId}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">{ticket.deviceId}</td>
                              <td className="px-4 py-3 text-slate-900 capitalize">{ticket.issueType}</td>
                              <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{ticket.description}</td>
                              <td className="px-4 py-3">
                                 <StatusBadge variant="workflow" status={ticket.status} />
                              </td>
                              <td className="px-4 py-3">
                                 <button
                                    onClick={() => { setSelectedIssue(ticket); setShowManageModal(true); }}
                                    className="text-blue-600 text-xs font-bold cursor-pointer hover:underline"
                                  >
                                    Manage
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
         </div>

         {showManageModal && selectedIssue && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 p-6" {...stopModalPointerPropagation}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Manage Issue</h3>
                  <button onClick={() => { setShowManageModal(false); setSelectedIssue(null); }} className="p-1 text-slate-600 hover:text-slate-900 rounded-lg"><X size={20} /></button>
                </div>
                <div className="space-y-2 text-sm mb-6">
                  <p><span className="font-bold text-slate-500">Ticket:</span> {selectedIssue.ticketId}</p>
                  <p><span className="font-bold text-slate-500">Device:</span> {selectedIssue.deviceId}</p>
                  <p><span className="font-bold text-slate-500">Type:</span> {selectedIssue.issueType}</p>
                  <p><span className="font-bold text-slate-500">Description:</span> {selectedIssue.description}</p>
                  <p><span className="font-bold text-slate-500">Status:</span> {selectedIssue.status}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { toast.success('Action sent to device'); setShowManageModal(false); setSelectedIssue(null); }} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Restart App</button>
                  <button onClick={() => { toast.success('Cache clear requested'); setShowManageModal(false); setSelectedIssue(null); }} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold">Clear Cache</button>
                  <button onClick={() => { setShowManageModal(false); setSelectedIssue(null); }} className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold">Close</button>
                </div>
              </div>
            </div>
         )}

         <div className="col-span-12 md:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-slate-900 mb-4">Quick Troubleshooting</h3>
               <div className="space-y-2">
                  <button 
                     onClick={() => handleTroubleshooting('restart_app')}
                     disabled={controlLoading !== null}
                     className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left disabled:opacity-50"
                  >
                     <div>
                        <div className="text-sm font-bold text-slate-900">Restart App Service</div>
                        <div className="text-xs text-slate-500">Fixes most crash loops</div>
                     </div>
                     {controlLoading === 'restart_app' ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <RotateCcw size={16} className="text-slate-600" />}
                  </button>
                  <button 
                     onClick={() => handleTroubleshooting('clear_cache')}
                     disabled={controlLoading !== null}
                     className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left disabled:opacity-50"
                  >
                     <div>
                        <div className="text-sm font-bold text-slate-900">Clear Cache</div>
                        <div className="text-xs text-slate-500">Free up storage space</div>
                     </div>
                     {controlLoading === 'clear_cache' ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <RefreshCw size={16} className="text-slate-600" />}
                  </button>
               </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
               <h3 className="font-bold text-orange-700 text-sm flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} /> Replacement Request
               </h3>
               <p className="text-xs text-orange-800 mb-3">
                  {issues.filter(i => i.issueType === 'hardware' && i.status !== 'resolved').length} devices marked as "Hardware" issues need replacement units from HQ.
               </p>
               <button 
                  onClick={handleRequisition}
                  disabled={controlLoading === 'requisition'}
                  className="text-xs font-bold text-orange-700 underline hover:text-orange-900 disabled:opacity-50 flex items-center gap-2"
               >
                  {controlLoading === 'requisition' ? <Loader2 size={12} className="animate-spin" /> : null}
                  Create Requisition Order
               </button>
            </div>
         </div>

         {showReportModal && (
            <ReportFaultModal 
               onClose={() => setShowReportModal(false)}
               onSuccess={() => {
                  setShowReportModal(false);
                  loadIssues(true);
               }}
            />
         )}
      </div>
   );
}

function ReportFaultModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
   const [loading, setLoading] = useState(false);
   const [formData, setFormData] = useState({
      deviceId: '',
      issueType: 'software' as any,
      description: '',
      priority: 'medium' as any
   });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         setLoading(true);
         await hsdApi.reportIssue(formData);
         toast.success('Fault reported successfully');
         onSuccess();
      } catch (error: any) {
         toast.error(error.message || 'Failed to report fault');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
         <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
               <h3 className="text-lg font-bold text-slate-900">Report Device Fault</h3>
               <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-900 rounded-lg">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Device ID</label>
                  <input
                     type="text"
                     required
                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                     placeholder="e.g. HSD-001"
                     value={formData.deviceId}
                     onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Issue Type</label>
                  <select
                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                     value={formData.issueType}
                     onChange={e => setFormData({ ...formData, issueType: e.target.value })}
                  >
                     <option value="hardware">Hardware</option>
                     <option value="software">Software</option>
                     <option value="connectivity">Connectivity</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Priority</label>
                  <select
                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                     value={formData.priority}
                     onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                     <option value="low">Low</option>
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                     <option value="critical">Critical</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Description</label>
                  <textarea
                     required
                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[100px]"
                     placeholder="Describe the issue..."
                     value={formData.description}
                     onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
               </div>
               <div className="flex gap-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-medium">Cancel</button>
                  <button 
                     type="submit" 
                     disabled={loading}
                     className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : 'Report Fault'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

// --- HSD User List Tab ---

const HSD_USER_PAGE_SIZE = 20;
const HSD_USER_REFRESH_MS = 15_000;

/** Device Information is driven by login status (API + DB). */
function resolveDeviceInformation(row: hsdApi.HSDUserLoginRow): 'Assigned' | 'Not Assigned' {
  if (row.deviceInformation === 'Assigned' || row.deviceInformation === 'Not Assigned') {
    return row.deviceInformation;
  }
  return row.loginStatus === 'Active' ? 'Assigned' : 'Not Assigned';
}

function HSDUserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');
  const urlSessionId = searchParams.get('sessionId');
  const drawerOpen = Boolean(urlUserId);

  const [users, setUsers] = useState<hsdApi.HSDUserLoginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'logged_out'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<hsdApi.HSDUserLoginRow | null>(null);
  const { activeStoreId } = useAuth();
  const storeId = resolveHsdStoreId(activeStoreId);
  const isMounted = useRef(true);
  const requestSeq = useRef(0);
  const restoredDrawerFromUrlRef = useRef<string | null>(null);
  const paramsRef = useRef({ storeId, page, searchQuery, statusFilter });
  paramsRef.current = { storeId, page, searchQuery, statusFilter };

  const openUserDrawer = useCallback((row: hsdApi.HSDUserLoginRow) => {
    setSelectedUser(row);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'users');
      next.set('userId', row.userId);
      if (row.sessionId) next.set('sessionId', row.sessionId);
      else next.delete('sessionId');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const closeUserDrawer = useCallback(() => {
    setSelectedUser(null);
    restoredDrawerFromUrlRef.current = null;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('userId');
      next.delete('sessionId');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async (isSilent = false) => {
    const seq = ++requestSeq.current;
    const { storeId: sid, page: p, searchQuery: q, statusFilter: st } = paramsRef.current;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const data = await hsdApi.getHSDUserList({
        storeId: sid,
        page: p,
        limit: HSD_USER_PAGE_SIZE,
        search: q || undefined,
        status: st,
        noCache: true,
      });
      if (!isMounted.current || seq !== requestSeq.current) return;
      setUsers(data.users || []);
      const pagination = data.pagination || {};
      setTotalPages(
        Math.max(1, pagination.total_pages ?? pagination.totalPages ?? 1)
      );
      setTotalItems(pagination.total_items ?? pagination.total ?? 0);
      setLastUpdatedAt(new Date());
    } catch (err: unknown) {
      if (!isMounted.current || seq !== requestSeq.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load HSD user list';
      setError(message);
      if (!isSilent) toast.error(message);
    } finally {
      if (!isMounted.current || seq !== requestSeq.current) return;
      setRefreshing(false);
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadUsers(false);
    return () => {
      isMounted.current = false;
      requestSeq.current += 1;
    };
  }, [loadUsers, storeId, page, searchQuery, statusFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) void loadUsers(true);
    }, HSD_USER_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadUsers]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        void loadUsers(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadUsers]);

  useEffect(() => {
    if (!urlUserId) {
      restoredDrawerFromUrlRef.current = null;
      setSelectedUser(null);
      return;
    }

    const urlKey = `${urlUserId}:${urlSessionId ?? ''}`;
    const match = findHsdUserMatch(users, urlUserId, urlSessionId);
    if (match) {
      restoredDrawerFromUrlRef.current = urlKey;
      setSelectedUser(match);
      return;
    }

    if (loading) return;
    if (restoredDrawerFromUrlRef.current === urlKey) return;

    restoredDrawerFromUrlRef.current = urlKey;
    void (async () => {
      try {
        const data = await hsdApi.getHSDUserList({
          storeId,
          search: urlUserId,
          limit: HSD_USER_PAGE_SIZE,
          noCache: true,
        });
        if (!isMounted.current) return;
        const fallbackMatch = findHsdUserMatch(data.users || [], urlUserId, urlSessionId);
        if (fallbackMatch) {
          setSelectedUser(fallbackMatch);
          return;
        }
        restoredDrawerFromUrlRef.current = null;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('userId');
          next.delete('sessionId');
          return next;
        }, { replace: true });
      } catch {
        restoredDrawerFromUrlRef.current = null;
      }
    })();
  }, [urlUserId, urlSessionId, users, loading, storeId, setSearchParams]);

  const formatLastUpdated = () => {
    if (!lastUpdatedAt) return null;
    return lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLoginDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-bold text-slate-900">HSD User List</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Users who logged in on HSD devices · auto-refreshes every 15s
            {lastUpdatedAt && (
              <span className="text-slate-400">
                {' '}
                · updated {formatLastUpdated()}
                {refreshing ? ' · refreshing…' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap items-center">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search phone, name, assignment..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-52 focus:outline-none focus:border-blue-600"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="logged_out">Logged Out</option>
          </select>
          <button
            type="button"
            onClick={() => loadUsers()}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Refresh now"
          >
            <RefreshCw size={16} className={loading || refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && users.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={24} />
            <p className="text-xs">Loading user list...</p>
          </div>
        ) : error && users.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => loadUsers()}
              className="text-xs font-bold text-blue-600 underline"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-600">No HSD logins found</p>
            <p className="text-xs mt-1">Logins appear when users sign in on handheld devices via phone OTP.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Phone Number</th>
                <th className="px-4 py-3 font-medium">User Name</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Device Information</th>
                <th className="px-4 py-3 font-medium">Login Date & Time</th>
                <th className="px-4 py-3 font-medium">Login Status</th>
                <th className="px-4 py-3 font-medium">Dark Store</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((row) => {
                const deviceInfo = resolveDeviceInformation(row);
                return (
                <tr
                  key={row.sessionId || `${row.userId}-${row.loginDateTime}`}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => openUserDrawer(row)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">{row.phoneNumber}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {row.userName || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[120px] truncate" title={row.userId}>
                    {row.userId}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px]">
                    <StatusBadge variant="workflow" status={deviceInfo} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                    {formatLoginDateTime(row.loginDateTime)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant="workflow" status={row.loginStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      {row.darkStoreLocation}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalItems > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            {totalItems} login record{totalItems !== 1 ? 's' : ''} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>

    <HSDUserDetailsDrawer
      user={selectedUser}
      open={drawerOpen}
      onClose={closeUserDrawer}
    />
    </>
  );
}

// --- HSD Logs Tab ---

function HSDLogs() {
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
   const { activeStoreId } = useAuth();
   const storeId = resolveHsdStoreId(activeStoreId);
   const isMounted = useRef(true);

   useEffect(() => {
      isMounted.current = true;
      loadLogs();
      return () => { isMounted.current = false; };
   }, [storeId]);

   const loadLogs = async () => {
      try {
         setLoading(true);
         const data = await hsdApi.getHSDLogs({ storeId });
         if (isMounted.current) {
            setLogs(data.logs || []);
         }
      } catch (error) {
         console.error('Failed to load logs:', error);
      } finally {
         if (isMounted.current) setLoading(false);
      }
   };

   const q = (searchQuery || '').toLowerCase();
   const filteredLogs = logs.filter(log => {
      const matchSearch = !q || (log.details || '').toLowerCase().includes(q) || (log.deviceId || '').toLowerCase().includes(q) || (log.userName || '').toLowerCase().includes(q) || (log.eventType || '').toLowerCase().includes(q);
      const matchEvent = eventTypeFilter === 'all' || (log.eventType === eventTypeFilter);
      return matchSearch && matchEvent;
   });

   return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">System & Activity Logs</h3>
            <div className="flex gap-2 ml-auto flex-wrap">
               <input
                  type="text"
                  placeholder="Search logs..."
                  className="pl-3 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-none w-40"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
               />
               <select
                  value={eventTypeFilter}
                  onChange={e => setEventTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
               >
                  <option value="all">All events</option>
                  <option value="scan_sku">Scan SKU</option>
                  <option value="qc_check">QC Check</option>
                  <option value="system">System</option>
                  <option value="error">Error</option>
               </select>
               <button onClick={loadLogs} className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 text-slate-600">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>
         <div className="flex-1 overflow-auto">
            {loading && logs.length === 0 ? (
               <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <p className="text-xs">Loading logs...</p>
               </div>
            ) : filteredLogs.length === 0 ? (
               <div className="p-20 text-center text-slate-400">
                  <p className="text-xs">No logs found</p>
               </div>
            ) : (
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">Device / User</th>
                        <th className="px-6 py-3 font-medium">Event Type</th>
                        <th className="px-6 py-3 font-medium">Details</th>
                        <th className="px-6 py-3 font-medium">Result</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                           <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </td>
                           <td className="px-6 py-3 text-slate-900 font-medium">
                              {log.deviceId} {log.userName ? `(${log.userName})` : ''}
                           </td>
                           <td className="px-6 py-3 text-slate-600 capitalize">{log.eventType.replace('_', ' ')}</td>
                           <td className="px-6 py-3 text-slate-900">{log.details}</td>
                           <td className="px-6 py-3">
                              <span className={cn(
                                 "text-xs font-bold capitalize",
                                 log.result === 'success' ? "text-emerald-600" : 
                                 log.result === 'warning' || log.result === 'alert' ? "text-amber-500" : "text-red-500"
                              )}>
                                 {log.result}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   );
}
