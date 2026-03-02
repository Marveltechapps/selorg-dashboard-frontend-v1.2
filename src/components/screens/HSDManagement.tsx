import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, Battery, Wifi, AlertTriangle, RefreshCw, Lock, 
  Search, Filter, Activity, ScanLine, RotateCcw, UserPlus, 
  FileText, CheckCircle2, XCircle, ChevronRight, Tablet, MapPin,
  Plus, X, Loader2
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { toast } from 'sonner';
import * as hsdApi from '../../api/hsd/hsdApi';
import { useAuth } from '../../contexts/AuthContext';

export function HSDManagement() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'live' | 'logs' | 'issues'>('fleet');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="HSD Device Management"
        subtitle="Manage handheld fleet, monitor live scan sessions, and track hardware issues"
        actions={
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
          >
            <Plus size={16} />
            Register Device
          </button>
        }
      />
      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="fleet" label="Fleet Overview" icon={Tablet} active={activeTab} onClick={setActiveTab} />
        <TabButton id="live" label="Live Sessions (Scan/QC)" icon={ScanLine} active={activeTab} onClick={setActiveTab} />
        <TabButton id="issues" label="Issue Tracker" icon={AlertTriangle} active={activeTab} onClick={setActiveTab} />
        <TabButton id="logs" label="HSD Logs" icon={FileText} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'fleet' && <FleetOverview />}
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
    </div>
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#212121]">Register New Device</h3>
          <button onClick={onClose} className="p-1 text-[#616161] hover:text-[#212121] rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Device ID</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm"
              placeholder="e.g. HSD-010"
              value={formData.deviceId}
              onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Device Type</label>
            <select
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
              value={formData.deviceType}
              onChange={e => setFormData({ ...formData, deviceType: e.target.value })}
            >
              <option value="Scanner">Scanner</option>
              <option value="Tablet">Tablet</option>
              <option value="Printer">Mobile Printer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Serial Number</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm"
              placeholder="e.g. SN-998877"
              value={formData.serialNumber}
              onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#16A34A] text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Register'}
            </button>
          </div>
        </form>
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

// --- Fleet Overview Tab ---

function FleetOverview() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [deviceHistory, setDeviceHistory] = useState<Map<string, any[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
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
      const response = await hsdApi.getFleetOverview({ storeId });
      if (isMounted.current) {
        // Transform backend data to match frontend format
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
        if (!isSilent) {
          toast.success('Fleet data refreshed');
        }
      }
    } catch (error: any) {
      console.error('Failed to load fleet data:', error);
      if (isMounted.current && !isSilent) {
        toast.error('Failed to load fleet data');
      }
    } finally {
      if (isMounted.current && !isSilent) {
        setLoading(false);
      }
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
          <FleetStatCard title="Online Status" value="18/25" sub="Devices Active" icon={Wifi} color="bg-[#DCFCE7] text-[#16A34A]" />
          <FleetStatCard title="Battery Health" value="4 Low" sub="< 20% Charge" icon={Battery} color="bg-[#FFF7ED] text-[#F59E0B]" />
          <FleetStatCard title="Sync Latency" value="120ms" sub="Avg. Response" icon={RefreshCw} color="bg-[#E6F7FF] text-[#1677FF]" />
          <FleetStatCard title="Device Errors" value="2" sub="Requires Action" icon={AlertTriangle} color="bg-[#FEE2E2] text-[#EF4444]" />
       </div>

       <div className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">
            Device Inventory
            {selectedDevices.size > 0 && (
              <span className="ml-2 text-xs font-normal text-[#757575]">
                ({selectedDevices.size} selected)
              </span>
            )}
          </h3>
          <div className="flex gap-2">
             <button 
               onClick={handleResetSelected}
               disabled={selectedDevices.size === 0}
               className="px-3 py-1.5 border border-[#E0E0E0] rounded text-xs font-bold bg-white hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                <RotateCcw size={14} /> Reset Selected
             </button>
             <button 
               onClick={() => setShowAssignModal(true)}
               disabled={selectedDevices.size === 0}
               className="px-3 py-1.5 bg-[#1677FF] text-white rounded text-xs font-bold hover:bg-[#409EFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                <UserPlus size={14} /> Assign Device
             </button>
          </div>
        </div>
        
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="animate-spin text-[#1677FF]" />
          </div>
        ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selectedDevices.size === devices.length && devices.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-[#1677FF] border-[#E0E0E0] rounded focus:ring-[#1677FF]"
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
          <tbody className="divide-y divide-[#F0F0F0]">
            {devices.map((device) => (
              <tr key={device.id} className={cn(
                "hover:bg-[#F9FAFB] transition-colors",
                selectedDevices.has(device.id) && "bg-[#F0F7FF]"
              )}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedDevices.has(device.id)}
                    onChange={() => handleToggleSelection(device.id)}
                    className="w-4 h-4 text-[#1677FF] border-[#E0E0E0] rounded focus:ring-[#1677FF]"
                  />
                </td>
                <td className="px-6 py-4 font-mono font-medium text-[#212121]">{device.id}</td>
                <td className="px-6 py-4">
                  {device.user !== '-' ? (
                    <div className="flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-xs font-bold">
                         {device.user.charAt(0)}
                       </span>
                       <div>
                          <div className="text-[#212121] font-medium text-xs">{device.user}</div>
                          <div className="text-[10px] text-[#9E9E9E]">{device.type}</div>
                       </div>
                    </div>
                  ) : (
                    <span className="text-[#9E9E9E] italic text-xs">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    device.status === 'Online' ? "bg-[#DCFCE7] text-[#16A34A]" :
                    device.status === 'Charging' ? "bg-[#E0F2FE] text-[#0284C7]" :
                    device.status === 'Error' ? "bg-[#FEE2E2] text-[#EF4444]" :
                    "bg-[#F3F4F6] text-[#4B5563]"
                  )}>
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Battery size={16} className={cn(device.battery < 20 ? "text-[#EF4444]" : "text-[#16A34A]")} />
                    <span className="text-xs font-bold text-[#616161]">{device.battery}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <Wifi size={16} className={cn(
                      device.signal === 'Strong' ? "text-[#1677FF]" : 
                      device.signal === 'No Signal' ? "text-[#E0E0E0]" : "text-[#F59E0B]"
                   )} />
                </td>
                <td className="px-6 py-4 text-[#616161] text-xs">{device.lastSync}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => handleToggleHistory(device.id)}
                    className={cn(
                      "p-1.5 rounded border border-[#E0E0E0] transition-colors",
                      expandedHistory.has(device.id) ? "bg-[#1677FF] text-white" : "text-[#616161] hover:bg-[#F5F5F5]"
                    )}
                    title="View History"
                  >
                    <FileText size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeviceControl(device.id, 'lock')}
                    disabled={controlLoading === `${device.id}-lock`}
                    className="p-1.5 text-[#616161] hover:bg-[#F5F5F5] rounded border border-[#E0E0E0] disabled:opacity-50" 
                    title="Lock Device"
                  >
                    {controlLoading === `${device.id}-lock` ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDeviceControl(device.id, 'reboot')}
                    disabled={controlLoading === `${device.id}-reboot`}
                    className="p-1.5 text-[#616161] hover:bg-[#F5F5F5] rounded border border-[#E0E0E0] disabled:opacity-50" 
                    title="Reboot"
                  >
                    {controlLoading === `${device.id}-reboot` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                </td>
              </tr>
            ))}
            {devices.map((device) => expandedHistory.has(device.id) && (
              <tr key={`${device.id}-history`} className="bg-[#FAFAFA]">
                <td colSpan={8} className="px-10 py-4">
                  <div className="border-l-2 border-[#1677FF] pl-4 py-2">
                    <h4 className="text-xs font-bold text-[#212121] mb-2 uppercase tracking-wider">Device History: {device.id}</h4>
                    {loadingHistory.has(device.id) ? (
                      <div className="flex items-center gap-2 text-xs text-[#757575]">
                        <Loader2 size={12} className="animate-spin" /> Loading history...
                      </div>
                    ) : !deviceHistory.get(device.id) || deviceHistory.get(device.id)?.length === 0 ? (
                      <div className="text-xs text-[#9E9E9E]">No history recorded for this device</div>
                    ) : (
                      <div className="space-y-3">
                        {deviceHistory.get(device.id)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-start">
                            <div className="min-w-[120px] text-[10px] font-mono text-[#9E9E9E]">
                              {new Date(item.performed_at).toLocaleString()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                  item.action === 'ASSIGN' ? "bg-blue-100 text-blue-700" :
                                  item.action === 'UNASSIGN' ? "bg-gray-100 text-gray-700" :
                                  item.action === 'RESET' ? "bg-orange-100 text-orange-700" :
                                  "bg-purple-100 text-purple-700"
                                )}>
                                  {item.action}
                                </span>
                                <span className="text-xs text-[#212121] font-medium">
                                 {item.action === 'ASSIGN' ? `Assigned to ${item.metadata?.userName}` :
                                  item.action === 'UNASSIGN' ? `Unassigned (Reason: ${item.metadata?.reason})` :
                                  item.action === 'RESET' ? `Device reset (Reason: ${item.metadata?.reason})` :
                                  item.action === 'LOCK' ? 'Device locked remotely' :
                                  item.action === 'REBOOT' ? 'Device rebooted remotely' : 
                                  item.action === 'RESTART_APP' ? 'App service restarted' :
                                  item.action === 'CLEAR_CACHE' ? 'Device cache cleared' : item.action}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#757575] mt-0.5">
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#212121]">Assign Device{selectedCount > 1 ? 's' : ''}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. USR-001"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">
              User Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">
              User Type
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'Picker' | 'Packer' | 'Rider')}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none bg-white"
            >
              <option value="Picker">Picker</option>
              <option value="Packer">Packer</option>
              <option value="Rider">Rider</option>
            </select>
          </div>

          <div className="bg-[#F0F7FF] p-3 rounded-lg text-xs text-[#1677FF]">
            Assigning {selectedCount} device{selectedCount > 1 ? 's' : ''} to {userName || 'user'}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || !userId || !userName}
              className={cn(
                "flex-1 px-4 py-2 bg-[#1677FF] text-white font-medium rounded-lg hover:bg-[#409EFF] flex items-center justify-center gap-2",
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

function FleetStatCard({ title, value, sub, icon: Icon, color }: any) {
   return (
      <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center justify-between">
         <div>
            <p className="text-[#757575] text-xs font-bold uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-[#212121] mt-1">{value}</p>
            <p className="text-[10px] text-[#9E9E9E] mt-0.5">{sub}</p>
         </div>
         <div className={cn("p-3 rounded-lg", color)}>
            <Icon size={20} />
         </div>
      </div>
   )
}

// --- Live Sessions Tab (Scan & Pick Simulator) ---

function LiveSessions() {
   const [sessions, setSessions] = useState<any[]>([]);
   const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState<string | null>(null);
   const { activeStoreId } = useAuth();
   const storeId = activeStoreId || '';
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
         <div className="col-span-12 md:col-span-4 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
               <h3 className="font-bold text-[#212121]">Active Scan Sessions</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
               {loading && sessions.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center text-[#9E9E9E]">
                     <Loader2 className="animate-spin mb-2" size={24} />
                     <p className="text-xs">Loading sessions...</p>
                  </div>
               ) : sessions.length === 0 ? (
                  <div className="p-10 text-center text-[#9E9E9E]">
                     <p className="text-xs">No active sessions</p>
                  </div>
               ) : (
                  sessions.map((session, i) => (
                     <div 
                        key={i} 
                        onClick={() => setSelectedDeviceId(session.deviceId)}
                        className={cn(
                           "p-4 border-b border-[#F0F0F0] cursor-pointer hover:bg-[#F5F5F5] transition-colors",
                           selectedDeviceId === session.deviceId ? "bg-[#F0F7FF] border-l-4 border-l-[#1677FF]" : ""
                        )}
                     >
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-[#212121] text-sm">{session.deviceId}</span>
                           <span className="text-[10px] bg-[#E6F7FF] text-[#1677FF] px-1.5 py-0.5 rounded font-bold uppercase">{session.currentStatus}</span>
                        </div>
                        <div className="text-xs text-[#616161] font-medium mb-1">{session.userName}</div>
                        <div className="flex items-center gap-1 text-[10px] text-[#9E9E9E]">
                           <Activity size={12} /> {session.taskType.toUpperCase()} #{session.taskId}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Main: Device Simulator / Details */}
         <div className="col-span-12 md:col-span-8 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
               {selectedSession ? (
                  <>
                     <div className="flex justify-between items-center mb-6">
                        <div>
                           <h3 className="font-bold text-[#212121] text-lg">Live View: {selectedSession.deviceId}</h3>
                           <p className="text-xs text-[#757575]">Mirroring screen for user: {selectedSession.userName}</p>
                        </div>
                        <div className="flex gap-2">
                           <span className="flex items-center gap-1 text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-1 rounded">
                              <Wifi size={12} /> Online
                           </span>
                           <span className="flex items-center gap-1 text-xs font-bold text-[#212121] bg-[#F5F5F5] px-2 py-1 rounded">
                              <Battery size={12} /> 85%
                           </span>
                        </div>
                     </div>

                     {/* Simulated Screen Interface */}
                     <div className="bg-[#111827] rounded-xl p-4 max-w-sm mx-auto shadow-xl border-4 border-[#374151]">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center text-[#9CA3AF] text-[10px] mb-4 px-2">
                           <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           <div className="flex gap-1">
                              <Wifi size={10} />
                              <Battery size={10} />
                           </div>
                        </div>

                        {/* App Content */}
                        <div className="bg-[#1F2937] rounded-lg p-4 min-h-[400px] flex flex-col text-white">
                           <div className="flex items-center justify-between mb-4">
                              <span className="text-xs text-gray-400">Task #{selectedSession.taskId}</span>
                              <span className="text-xs font-bold text-[#34D399]">{selectedSession.itemsCompleted}/{selectedSession.itemsTotal} Items</span>
                           </div>
                           
                           <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                              <div className="w-24 h-24 bg-white/10 rounded-lg flex items-center justify-center mb-2">
                                 <ScanLine size={48} className="text-[#60A5FA] animate-pulse" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-lg">{selectedSession.currentStatus}</h4>
                                 <p className="text-sm text-gray-400">Current Zone: {selectedSession.zone || 'N/A'}</p>
                              </div>
                           </div>

                           <div className="mt-auto space-y-2">
                              <button 
                                 onClick={() => handleSessionAction('confirm_quantity')}
                                 disabled={actionLoading !== null}
                                 className="w-full py-3 bg-[#2563EB] rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors"
                              >
                                 {actionLoading === 'confirm_quantity' ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Quantity (1)'}
                              </button>
                              <button 
                                 onClick={() => handleSessionAction('report_issue')}
                                 disabled={actionLoading !== null}
                                 className="w-full py-3 bg-[#374151] rounded font-bold text-sm text-gray-300 flex items-center justify-center gap-2 hover:bg-[#4B5563] transition-colors"
                              >
                                 {actionLoading === 'report_issue' ? <Loader2 size={16} className="animate-spin" /> : 'Report Issue'}
                              </button>
                           </div>
                        </div>
                     </div>
                  </>
               ) : (
                  <div className="h-full flex items-center justify-center text-[#9E9E9E] py-20">
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
      <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
         <h4 className="font-bold text-[#212121] text-sm mb-3">Recent Device Actions</h4>
         <div className="space-y-2">
            {loading && actions.length === 0 ? (
               <p className="text-xs text-[#9E9E9E]">Loading...</p>
            ) : actions.length === 0 ? (
               <p className="text-xs text-[#9E9E9E]">No recent actions</p>
            ) : (
               actions.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 border-b border-[#F0F0F0] last:border-0">
                     <span className="font-mono text-[#9E9E9E]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                     <span className={cn(
                        "w-2 h-2 rounded-full",
                        log.result === 'success' ? "bg-[#16A34A]" : 
                        log.result === 'error' ? "bg-[#EF4444]" : "bg-[#1677FF]"
                     )} />
                     <span className="text-[#212121]">{log.details}</span>
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
   const storeId = activeStoreId || '';
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
         // Production usually applies to a selected device, but let's use a mock deviceId if none selected
         const deviceId = issues[0]?.deviceId || 'SYSTEM';
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
         <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
               <h3 className="font-bold text-[#212121]">Active Issues</h3>
               <button 
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-1.5 bg-[#EF4444] text-white rounded text-xs font-bold hover:bg-[#DC2626] flex items-center gap-2"
               >
                  <AlertTriangle size={14} /> Report Fault
               </button>
            </div>
            <div className="flex-1 overflow-auto">
               {loading && issues.length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center text-[#9E9E9E]">
                     <Loader2 className="animate-spin mb-2" size={24} />
                     <p className="text-xs">Loading issues...</p>
                  </div>
               ) : issues.length === 0 ? (
                  <div className="p-20 text-center text-[#9E9E9E]">
                     <p className="text-xs">No active issues found</p>
                  </div>
               ) : (
                  <table className="w-full text-left text-sm">
                     <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                        <tr>
                           <th className="px-4 py-3 font-medium">Ticket ID</th>
                           <th className="px-4 py-3 font-medium">Device</th>
                           <th className="px-4 py-3 font-medium">Issue Type</th>
                           <th className="px-4 py-3 font-medium">Description</th>
                           <th className="px-4 py-3 font-medium">Status</th>
                           <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#F0F0F0]">
                        {issues.map((ticket, i) => (
                           <tr key={i} className="hover:bg-[#F9FAFB]">
                              <td className="px-4 py-3 text-[#616161] font-mono text-xs">{ticket.ticketId}</td>
                              <td className="px-4 py-3 font-bold text-[#212121]">{ticket.deviceId}</td>
                              <td className="px-4 py-3 text-[#212121] capitalize">{ticket.issueType}</td>
                              <td className="px-4 py-3 text-[#616161] max-w-[200px] truncate">{ticket.description}</td>
                              <td className="px-4 py-3">
                                 <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    ticket.status === 'open' ? "bg-[#FEE2E2] text-[#EF4444]" : 
                                    ticket.status === 'resolved' ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF3C7] text-[#D97706]"
                                 )}>
                                    {ticket.status}
                                 </span>
                              </td>
                              <td className="px-4 py-3">
                                 <button
                                    onClick={() => { setSelectedIssue(ticket); setShowManageModal(true); }}
                                    className="text-[#1677FF] text-xs font-bold cursor-pointer hover:underline"
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
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[#212121]">Manage Issue</h3>
                  <button onClick={() => { setShowManageModal(false); setSelectedIssue(null); }} className="p-1 text-[#616161] hover:text-[#212121] rounded-lg"><X size={20} /></button>
                </div>
                <div className="space-y-2 text-sm mb-6">
                  <p><span className="font-bold text-[#757575]">Ticket:</span> {selectedIssue.ticketId}</p>
                  <p><span className="font-bold text-[#757575]">Device:</span> {selectedIssue.deviceId}</p>
                  <p><span className="font-bold text-[#757575]">Type:</span> {selectedIssue.issueType}</p>
                  <p><span className="font-bold text-[#757575]">Description:</span> {selectedIssue.description}</p>
                  <p><span className="font-bold text-[#757575]">Status:</span> {selectedIssue.status}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { toast.success('Action sent to device'); setShowManageModal(false); setSelectedIssue(null); }} className="flex-1 px-3 py-2 bg-[#1677FF] text-white rounded-lg text-xs font-bold">Restart App</button>
                  <button onClick={() => { toast.success('Cache clear requested'); setShowManageModal(false); setSelectedIssue(null); }} className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded-lg text-xs font-bold">Clear Cache</button>
                  <button onClick={() => { setShowManageModal(false); setSelectedIssue(null); }} className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-xs font-bold">Close</button>
                </div>
              </div>
            </div>
         )}

         <div className="col-span-12 md:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
               <h3 className="font-bold text-[#212121] mb-4">Quick Troubleshooting</h3>
               <div className="space-y-2">
                  <button 
                     onClick={() => handleTroubleshooting('restart_app')}
                     disabled={controlLoading !== null}
                     className="w-full flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors text-left disabled:opacity-50"
                  >
                     <div>
                        <div className="text-sm font-bold text-[#212121]">Restart App Service</div>
                        <div className="text-xs text-[#757575]">Fixes most crash loops</div>
                     </div>
                     {controlLoading === 'restart_app' ? <Loader2 size={16} className="animate-spin text-[#1677FF]" /> : <RotateCcw size={16} className="text-[#616161]" />}
                  </button>
                  <button 
                     onClick={() => handleTroubleshooting('clear_cache')}
                     disabled={controlLoading !== null}
                     className="w-full flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors text-left disabled:opacity-50"
                  >
                     <div>
                        <div className="text-sm font-bold text-[#212121]">Clear Cache</div>
                        <div className="text-xs text-[#757575]">Free up storage space</div>
                     </div>
                     {controlLoading === 'clear_cache' ? <Loader2 size={16} className="animate-spin text-[#1677FF]" /> : <RefreshCw size={16} className="text-[#616161]" />}
                  </button>
               </div>
            </div>
            
            <div className="bg-[#FFF7ED] p-4 rounded-xl border border-[#FED7AA] shadow-sm">
               <h3 className="font-bold text-[#C2410C] text-sm flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} /> Replacement Request
               </h3>
               <p className="text-xs text-[#9A3412] mb-3">
                  {issues.filter(i => i.issueType === 'hardware' && i.status !== 'resolved').length} devices marked as "Hardware" issues need replacement units from HQ.
               </p>
               <button 
                  onClick={handleRequisition}
                  disabled={controlLoading === 'requisition'}
                  className="text-xs font-bold text-[#C2410C] underline hover:text-[#7C2D12] disabled:opacity-50 flex items-center gap-2"
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
         <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
               <h3 className="text-lg font-bold text-[#212121]">Report Device Fault</h3>
               <button onClick={onClose} className="p-1 text-[#616161] hover:text-[#212121] rounded-lg">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                  <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Device ID</label>
                  <input
                     type="text"
                     required
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm"
                     placeholder="e.g. HSD-001"
                     value={formData.deviceId}
                     onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Issue Type</label>
                  <select
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
                     value={formData.issueType}
                     onChange={e => setFormData({ ...formData, issueType: e.target.value })}
                  >
                     <option value="hardware">Hardware</option>
                     <option value="software">Software</option>
                     <option value="connectivity">Connectivity</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Priority</label>
                  <select
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
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
                  <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Description</label>
                  <textarea
                     required
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm min-h-[100px]"
                     placeholder="Describe the issue..."
                     value={formData.description}
                     onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
               </div>
               <div className="flex gap-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg font-medium">Cancel</button>
                  <button 
                     type="submit" 
                     disabled={loading}
                     className="flex-1 px-4 py-2 bg-[#EF4444] text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : 'Report Fault'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

// --- HSD Logs Tab ---

function HSDLogs() {
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
   const { activeStoreId } = useAuth();
   const storeId = activeStoreId || '';
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
      <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden h-[600px]">
         <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#212121]">System & Activity Logs</h3>
            <div className="flex gap-2 ml-auto flex-wrap">
               <input
                  type="text"
                  placeholder="Search logs..."
                  className="pl-3 pr-3 py-1.5 text-xs border border-[#E0E0E0] rounded focus:outline-none w-40"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
               />
               <select
                  value={eventTypeFilter}
                  onChange={e => setEventTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#E0E0E0] rounded bg-white"
               >
                  <option value="all">All events</option>
                  <option value="scan_sku">Scan SKU</option>
                  <option value="qc_check">QC Check</option>
                  <option value="system">System</option>
                  <option value="error">Error</option>
               </select>
               <button onClick={loadLogs} className="p-1.5 border border-[#E0E0E0] rounded hover:bg-[#F5F5F5] text-[#616161]">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>
         <div className="flex-1 overflow-auto">
            {loading && logs.length === 0 ? (
               <div className="p-20 flex flex-col items-center justify-center text-[#9E9E9E]">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <p className="text-xs">Loading logs...</p>
               </div>
            ) : filteredLogs.length === 0 ? (
               <div className="p-20 text-center text-[#9E9E9E]">
                  <p className="text-xs">No logs found</p>
               </div>
            ) : (
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                     <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">Device / User</th>
                        <th className="px-6 py-3 font-medium">Event Type</th>
                        <th className="px-6 py-3 font-medium">Details</th>
                        <th className="px-6 py-3 font-medium">Result</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                     {filteredLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-[#F9FAFB]">
                           <td className="px-6 py-3 text-[#616161] font-mono text-xs">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </td>
                           <td className="px-6 py-3 text-[#212121] font-medium">
                              {log.deviceId} {log.userName ? `(${log.userName})` : ''}
                           </td>
                           <td className="px-6 py-3 text-[#616161] capitalize">{log.eventType.replace('_', ' ')}</td>
                           <td className="px-6 py-3 text-[#212121]">{log.details}</td>
                           <td className="px-6 py-3">
                              <span className={cn(
                                 "text-xs font-bold capitalize",
                                 log.result === 'success' ? "text-[#16A34A]" : 
                                 log.result === 'warning' || log.result === 'alert' ? "text-[#F59E0B]" : "text-[#EF4444]"
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
