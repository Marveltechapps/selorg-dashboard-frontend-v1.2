import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Map, 
  Zap, 
  Clock, 
  Users, 
  ShoppingBag,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Settings,
  BarChart3,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zone,
  Incident,
  Exception,
  LiveMetrics,
  SurgeInfo,
  fetchLiveMetrics,
  fetchZones,
  fetchIncidents,
  fetchExceptions,
  resolveException,
  fetchSurgeInfo,
  fetchDispatchEngineStatus,
  fetchSlaConfig,
  fetchIntegrationHealth,
  updateIncident,
} from './citywideControlApi';
import { ZoneDetailModal } from './modals/ZoneDetailModal';

function OutageManageModalContent({
  selectedOutage,
  onSave,
  onCancel,
}: {
  selectedOutage: { id: string; storeId: string; storeName: string; outageReason?: string } | null;
  onSave: (status: string, estimatedResolution: string, actionsTaken: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState('Investigating');
  const [estimatedResolution, setEstimatedResolution] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [saving, setSaving] = useState(false);

  if (!selectedOutage) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status, estimatedResolution, actionsTaken);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-rose-600 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Store Outage: {selectedOutage.storeName || selectedOutage.storeId}</h4>
            <p className="text-sm text-rose-700 mt-1">{selectedOutage.outageReason || 'Unknown reason'}</p>
            <p className="text-xs text-rose-600 mt-2">
              This store is currently offline. Update status and actions below.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-[#18181b] mb-2 block">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="Investigating">Investigating</option>
            <option value="Maintenance Required">Maintenance Required</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#18181b] mb-2 block">Estimated Resolution</label>
          <input
            type="datetime-local"
            value={estimatedResolution}
            onChange={(e) => setEstimatedResolution(e.target.value)}
            className="w-full px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#18181b] mb-2 block">Actions Taken</label>
          <textarea
            rows={4}
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            placeholder="Describe actions taken to resolve the outage..."
            className="w-full px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-rose-600 hover:bg-rose-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
import { IncidentDetailModal } from './modals/IncidentDetailModal';
import { SurgeControlModal } from './modals/SurgeControlModal';
import { DispatchEngineModal } from './modals/DispatchEngineModal';
import { AnalyticsModal } from './modals/AnalyticsModal';
import { SettingsModal } from '@/components/screens/SettingsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function CitywideControl() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string>('');
  const [slaTargetMins, setSlaTargetMins] = useState<number | null>(null);
  const [integrationHealth, setIntegrationHealth] = useState<{
    integrations: { displayName: string; provider?: string; status: string; message?: string }[];
    storeOutages: { storeId: string; storeName: string; outageReason?: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherMode, setWeatherMode] = useState(false);
  
  // Modal states
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [showSurgeControl, setShowSurgeControl] = useState(false);
  const [showDispatchEngine, setShowDispatchEngine] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showOutageManage, setShowOutageManage] = useState(false);
  const [selectedOutage, setSelectedOutage] = useState<{ id: string; storeId: string; storeName: string; outageReason?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
    
    // Set up real-time updates every 2 seconds
    const interval = setInterval(() => {
      loadAllData();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    const results = await Promise.allSettled([
      fetchLiveMetrics(),
      fetchZones(),
      fetchIncidents(),
      fetchExceptions(),
      fetchSurgeInfo(),
      fetchDispatchEngineStatus(),
      fetchSlaConfig(),
      fetchIntegrationHealth(),
    ]);

    const [metricsResult, zonesResult, incidentsResult, exceptionsResult, surgeResult, dispatchResult, slaResult, healthResult] = results;

    setMetrics(metricsResult.status === 'fulfilled' ? metricsResult.value : null);
    setZones(zonesResult.status === 'fulfilled' ? zonesResult.value : []);
    setIncidents(incidentsResult.status === 'fulfilled' ? incidentsResult.value : []);
    setExceptions(exceptionsResult.status === 'fulfilled' ? exceptionsResult.value : []);
    setSurgeInfo(surgeResult.status === 'fulfilled' ? surgeResult.value : null);
    setDispatchStatus(dispatchResult.status === 'fulfilled' && dispatchResult.value ? dispatchResult.value.status : '');
    setSlaTargetMins(slaResult.status === 'fulfilled' && slaResult.value ? slaResult.value.targetMinutes : 0);
    setIntegrationHealth(healthResult.status === 'fulfilled' ? healthResult.value : null);
    setLoading(false);
    if (showLoading) {
      toast.success('Data refreshed');
    }
    if (showLoading) setRefreshing(false);
  };

  const handleResolveException = async (exceptionId: string) => {
    try {
      await resolveException(exceptionId);
      toast.success('Exception resolved');
      loadAllData();
    } catch (error) {
      toast.error('Failed to resolve exception');
    }
  };

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      case 'surge': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-emerald-500';
    }
  };

  const getZoneStatusGradient = (status: string) => {
    switch (status) {
      case 'critical': return 'from-rose-100 to-rose-200';
      case 'warning': return 'from-amber-100 to-amber-200';
      case 'surge': return 'from-orange-100 to-orange-200';
      case 'offline': return 'from-gray-100 to-gray-200';
      default: return 'from-emerald-100 to-emerald-200';
    }
  };

  const getIncidentSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-rose-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-emerald-600';
    }
  };

  const getExceptionTypeColor = (type: string) => {
    switch (type) {
      case 'rto_risk':
      case 'payment_failed':
        return 'text-rose-600';
      case 'pickup_delay':
      case 'delivery_delay':
        return 'text-amber-600';
      default:
        return 'text-orange-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const past = new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - past) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#18181b] tracking-tight">Citywide Control Room</h1>
          <p className="text-[#71717a] mt-1">Real-time monitoring of Bangalore operations across all zones.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-md shadow-lg shadow-zinc-500/20">
            <div className="w-2 h-2 bg-[#e11d48] rounded-full animate-pulse"></div>
            LIVE MODE
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeatherMode(!weatherMode)}
          >
            Weather Mode: {weatherMode ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(true)}
          >
            <BarChart3 size={16} className="mr-2" />
            Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Top Metrics - Dark Style for "Control Room" feel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#18181b] p-5 rounded-xl shadow-lg border border-[#27272a] relative overflow-hidden group hover:shadow-xl transition-shadow cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} className="text-white" />
          </div>
          <p className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-1">Live Order Flow</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-white">
              {metrics != null ? metrics.orderFlowPerHour.toLocaleString() : '—'}
            </h3>
            {metrics != null && (
              <span className="text-emerald-400 text-xs font-bold mb-1.5 flex items-center">
                <TrendingUp size={12} className="mr-1" /> {metrics.orderFlowTrend >= 0 ? '+' : ''}{metrics.orderFlowTrend}%
              </span>
            )}
          </div>
          <p className="text-[#52525b] text-xs mt-2">Orders / Hour</p>
        </div>
        
        <div className="bg-[#18181b] p-5 rounded-xl shadow-lg border border-[#27272a] relative overflow-hidden group hover:shadow-xl transition-shadow cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} className="text-white" />
          </div>
          <p className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-1">Avg Delivery Time</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-white">
              {metrics != null ? metrics.avgDeliveryTime : '—'}
            </h3>
          </div>
          <p className="text-[#52525b] text-xs mt-2">
            Target: {metrics?.targetDeliveryFormatted ?? (slaTargetMins != null ? `${slaTargetMins}m 00s` : '—')}
          </p>
        </div>

        <div className="bg-[#18181b] p-5 rounded-xl shadow-lg border border-[#27272a] relative overflow-hidden group hover:shadow-xl transition-shadow cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-white" />
          </div>
          <p className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-1">Active Riders</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-white">
              {metrics != null ? metrics.activeRiders.toLocaleString() : '—'}
            </h3>
            {metrics != null && (
              <span className="text-rose-400 text-xs font-bold mb-1.5">{metrics.riderUtilizationPercent}% Utilized</span>
            )}
          </div>
          <p className="text-[#52525b] text-xs mt-2">
            {metrics != null ? `Capacity: ${metrics.riderUtilizationPercent >= 90 ? 'High Stress' : metrics.riderUtilizationPercent >= 70 ? 'Moderate' : 'Normal'}` : '—'}
          </p>
        </div>

        <div className="bg-[#e11d48] p-5 rounded-xl shadow-lg shadow-rose-900/20 border border-rose-600 relative overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <AlertTriangle size={64} className="text-white" />
          </div>
          <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">Active Incidents</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-white">
              {metrics != null ? metrics.activeIncidentsCount : '—'}
            </h3>
            {incidents.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-white text-xs font-bold mb-1.5">
                {incidents.filter(i => i.severity === 'critical').length} Critical
              </span>
            )}
          </div>
          <p className="text-rose-100 text-xs mt-2">
            {incidents.length > 0
              ? `${incidents.filter(i => i.severity === 'critical').length} Critical, ${incidents.filter(i => i.severity === 'warning').length} Warning`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Heatmap & Map */}
        <div className="lg:col-span-2 bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-[#e4e4e7] flex justify-between items-center bg-[#fcfcfc]">
            <div className="flex items-center gap-2">
              <Map size={18} className="text-[#18181b]" />
              <h3 className="font-bold text-[#18181b]">Operational Heatmap</h3>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#71717a] px-2 py-1 bg-[#f4f4f5] rounded border border-[#e4e4e7]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#71717a] px-2 py-1 bg-[#f4f4f5] rounded border border-[#e4e4e7]">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Surge
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#71717a] px-2 py-1 bg-[#f4f4f5] rounded border border-[#e4e4e7]">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical
              </span>
            </div>
          </div>
          <div className="flex-1 bg-[#f4f4f5] p-3 overflow-auto">
            {/* Interactive Zone Grid */}
            {zones.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#71717a]">
                <div className="text-center">
                  <Map size={48} className="mx-auto mb-4 text-[#a1a1aa]" />
                  <p className="font-medium">No zones data available</p>
                  <p className="text-sm mt-2">Zone heat map will appear here once zones are configured</p>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-4 gap-3 h-full">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`bg-gradient-to-br ${getZoneStatusGradient(zone.status)} rounded-lg border-2 ${
                    zone.status === 'critical' ? 'border-rose-400' :
                    zone.status === 'warning' ? 'border-amber-400' :
                    zone.status === 'surge' ? 'border-orange-400' :
                    'border-emerald-400'
                  } p-3 cursor-pointer hover:scale-105 transition-all hover:shadow-lg relative overflow-hidden group`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#18181b]">Zone {zone.zoneNumber}</span>
                      <div className={`w-2 h-2 rounded-full ${getZoneStatusColor(zone.status)} ${zone.status !== 'normal' ? 'animate-pulse' : ''}`}></div>
                    </div>
                    <div className="text-sm font-bold text-[#18181b] mb-1">{zone.zoneName}</div>
                    <div className="text-xs text-[#52525b] mb-2">{zone.capacityPercent}% Capacity</div>
                    <div className="w-full bg-white/50 rounded-full h-1.5 mb-2">
                      <div 
                        className={`h-1.5 rounded-full ${getZoneStatusColor(zone.status)}`}
                        style={{ width: `${zone.capacityPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[#52525b] space-y-0.5">
                      <div>{zone.activeOrders} Orders</div>
                      <div>{zone.activeRiders} Riders {zone.riderStatus === 'overload' && <span className="text-rose-600 font-bold">OVERLOAD</span>}</div>
                    </div>
                    {zone.surgeMultiplier && (
                      <Badge className="mt-1 text-[9px] bg-orange-500 text-white">
                        {zone.surgeMultiplier}x Surge
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Exception Queue & Outages */}
        <div className="space-y-4">
             {/* Outage Manager */}
             <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
                 <div className="p-4 border-b border-[#e4e4e7] flex items-center justify-between bg-rose-50">
                     <h3 className="font-bold text-rose-900 flex items-center gap-2">
                         <AlertTriangle size={16} /> Outage Management
                     </h3>
                 </div>
                 <div className="divide-y divide-[#e4e4e7]">
                     {integrationHealth?.integrations?.map((svc) => (
                       <div
                         key={svc.displayName}
                         className={`p-4 flex items-center justify-between hover:bg-[#fcfcfc] ${svc.status === 'outage' ? 'bg-rose-50/50' : ''}`}
                       >
                         <div>
                           <p className="text-sm font-bold text-[#18181b]">{svc.provider || 'Service'}</p>
                           <p className="text-xs text-[#71717a]">{svc.displayName}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           <div
                             className={`w-2 h-2 rounded-full ${
                               svc.status === 'stable' ? 'bg-emerald-500' :
                               svc.status === 'latency' ? 'bg-amber-500 animate-pulse' :
                               svc.status === 'outage' ? 'bg-rose-500' : 'bg-gray-400'
                             }`}
                           />
                           <span className="text-xs font-medium text-[#18181b] capitalize">{svc.status}</span>
                         </div>
                       </div>
                     ))}
                     {integrationHealth?.storeOutages?.map((outage) => (
                       <div key={outage.id || outage.storeId} className="p-4 flex items-center justify-between bg-rose-50/50">
                         <div>
                           <p className="text-sm font-bold text-[#18181b]">Store Outage</p>
                           <p className="text-xs text-rose-700 font-bold">
                             {outage.storeName || outage.storeId} {outage.outageReason ? `(${outage.outageReason})` : ''}
                           </p>
                         </div>
                         <button
                           className="px-2 py-1 text-xs font-bold bg-white border border-rose-200 text-rose-600 rounded shadow-sm hover:bg-rose-50"
                           onClick={() => {
                             setSelectedOutage({ id: outage.id, storeId: outage.storeId, storeName: outage.storeName || outage.storeId, outageReason: outage.outageReason });
                             setShowOutageManage(true);
                           }}
                         >
                           Manage
                         </button>
                       </div>
                     ))}
                     {(!integrationHealth?.integrations?.length && !integrationHealth?.storeOutages?.length) && (
                       <div className="p-4 text-sm text-[#71717a]">No integration or outage data</div>
                     )}
                 </div>
             </div>

             {/* Live Exceptions */}
             <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm flex-1">
                 <div className="p-4 border-b border-[#e4e4e7] flex items-center justify-between bg-[#fcfcfc]">
                     <h3 className="font-bold text-[#18181b]">Exception Queue</h3>
                     <span className="text-xs font-bold bg-[#18181b] text-white px-1.5 py-0.5 rounded">{exceptions.length}</span>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                     {exceptions.length === 0 ? (
                         <div className="p-6 text-center text-[#71717a]">
                             <Activity size={32} className="mx-auto mb-2 opacity-40" />
                             <p className="text-sm font-medium">No exceptions</p>
                             <p className="text-xs mt-1">Exception queue is empty</p>
                         </div>
                     ) : exceptions.slice(0, 5).map((exception) => (
                         <div key={exception.id} className="p-3 border-b border-[#e4e4e7] last:border-0 hover:bg-[#f4f4f5] group">
                             <div className="flex justify-between mb-1">
                                 <span className={`text-xs font-bold ${getExceptionTypeColor(exception.type)}`}>
                                   {exception.type.replace('_', ' ').toUpperCase()}
                                 </span>
                                 <span className="text-[10px] text-[#71717a]">{formatTimeAgo(exception.timestamp)}</span>
                             </div>
                             <p className="text-sm font-medium text-[#18181b] mb-2">Order {exception.orderId} - {exception.description}</p>
                             <div className="flex gap-2 mb-2">
                                 <span className="text-[10px] px-1.5 py-0.5 bg-[#f4f4f5] text-[#52525b] rounded border border-[#e4e4e7]">Rider: {exception.riderName}</span>
                                 <span className="text-[10px] px-1.5 py-0.5 bg-[#f4f4f5] text-[#52525b] rounded border border-[#e4e4e7]">Store: {exception.storeName}</span>
                             </div>
                             <Button
                               variant="outline"
                               size="sm"
                               className="w-full"
                               onClick={() => handleResolveException(exception.id)}
                             >
                               Resolve
                             </Button>
                         </div>
                     ))}
                 </div>
             </div>

             {/* Quick Controls */}
             <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
                 <div className="p-4 border-b border-[#e4e4e7] flex items-center gap-2 bg-[#fcfcfc]">
                     <Settings size={16} className="text-[#18181b]" />
                     <h3 className="font-bold text-[#18181b]">Quick Controls</h3>
                 </div>
                 <div className="p-4 space-y-3">
                     <Button 
                       variant="outline" 
                       className="w-full justify-start"
                       onClick={() => setShowDispatchEngine(true)}
                     >
                       <Activity size={16} className="mr-2 text-emerald-600" />
                       <div className="flex-1 text-left">
                         <div className="text-sm font-medium">Auto-Dispatch</div>
                         <div className="text-xs text-[#71717a]">
                           {dispatchStatus ? (dispatchStatus === 'running' ? '🟢 Running' : dispatchStatus === 'paused' ? '🟡 Paused' : '🔴 Error') : '—'}
                         </div>
                       </div>
                     </Button>

                     <Button 
                       variant="outline" 
                       className="w-full justify-start"
                       onClick={() => setShowSurgeControl(true)}
                     >
                       <Zap size={16} className="mr-2 text-orange-600" />
                       <div className="flex-1 text-left">
                         <div className="text-sm font-medium">Surge Control</div>
                         <div className="text-xs text-[#71717a]">
                           {surgeInfo != null ? (surgeInfo.active && surgeInfo.globalMultiplier ? `${surgeInfo.globalMultiplier}x Active` : 'Inactive') : '—'}
                         </div>
                       </div>
                     </Button>

                     <Button 
                       variant="outline" 
                       className="w-full justify-start"
                     >
                       <Clock size={16} className="mr-2 text-blue-600" />
                       <div className="flex-1 text-left">
                         <div className="text-sm font-medium">SLA Rules</div>
                         <div className="text-xs text-[#71717a]">
                           {slaTargetMins != null && slaTargetMins > 0 ? `${slaTargetMins} mins target` : '—'}
                         </div>
                       </div>
                     </Button>
                 </div>
             </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${(metrics?.activeIncidentsCount ?? 0) > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-sm">
                {(metrics?.activeIncidentsCount ?? 0) > 0 ? 'Active incidents' : 'All systems operational'}
              </span>
            </div>
            <div className="text-sm text-[#a1a1aa]">
              Last updated: {metrics ? formatTimeAgo(metrics.lastUpdated) : '—'}
            </div>
            <div className="text-sm text-[#a1a1aa]">
              Total orders: {metrics != null && (metrics.totalOrdersLast24h ?? metrics.orderFlowPerHour) != null
                ? (metrics.totalOrdersLast24h ?? metrics.orderFlowPerHour)!.toLocaleString()
                : '—'} | Total riders: {metrics != null && (metrics.totalRiders ?? metrics.activeRiders) != null
                ? (metrics.totalRiders ?? metrics.activeRiders)!.toLocaleString()
                : '—'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white hover:bg-white/10"
              onClick={() => setShowAlerts(true)}
            >
              <Bell size={16} className="mr-2" />
              Alerts
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white hover:bg-white/10"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ZoneDetailModal
        open={selectedZoneId !== null}
        onClose={() => setSelectedZoneId(null)}
        zoneId={selectedZoneId}
      />
      <IncidentDetailModal
        open={selectedIncidentId !== null}
        onClose={() => setSelectedIncidentId(null)}
        incidentId={selectedIncidentId}
        onIncidentResolved={() => loadAllData()}
      />
      <SurgeControlModal
        open={showSurgeControl}
        onClose={() => setShowSurgeControl(false)}
        onSurgeUpdated={() => loadAllData()}
      />
      <DispatchEngineModal
        open={showDispatchEngine}
        onClose={() => setShowDispatchEngine(false)}
      />
      <AnalyticsModal
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Bell className="text-amber-500" size={24} />
              System Alerts & Notifications
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900">Active Alerts</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {incidents.filter(i => i.severity === 'critical').length} critical, {incidents.filter(i => i.severity === 'warning').length} warning incidents
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-[#18181b]">Recent Incidents</h4>
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="border border-[#e4e4e7] rounded-lg p-3 hover:bg-[#f4f4f5]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          incident.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                          incident.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {incident.severity.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-[#18181b]">{incident.title}</span>
                      </div>
                      <p className="text-xs text-[#71717a] mt-1">{incident.description}</p>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">
                        Started: {formatTimeAgo(incident.startTime)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <p className="text-sm text-[#71717a] text-center py-4">No active incidents</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-[#18181b]">Exception Queue</h4>
              {exceptions.slice(0, 3).map((exception) => (
                <div key={exception.id} className="border border-[#e4e4e7] rounded-lg p-3 hover:bg-[#f4f4f5]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className={`text-xs font-bold ${getExceptionTypeColor(exception.type)}`}>
                        {exception.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-[#18181b] mt-1">{exception.description}</p>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">
                        Order {exception.orderId} • {formatTimeAgo(exception.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {exceptions.length === 0 && (
                <p className="text-sm text-[#71717a] text-center py-4">No exceptions</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showOutageManage} onOpenChange={(open) => { setShowOutageManage(open); if (!open) setSelectedOutage(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={24} />
              Outage Management
            </DialogTitle>
          </DialogHeader>
          <OutageManageModalContent
            selectedOutage={selectedOutage}
            onSave={async (statusSelect, estimatedResolution, actionsTaken) => {
              if (!selectedOutage?.id) return;
              const status = statusSelect === 'Resolved' ? 'resolved' : 'ongoing';
              const payload: Record<string, string | null> = { status };
              if (estimatedResolution) payload.estimatedResolution = estimatedResolution;
              if (actionsTaken) payload.actionsTaken = actionsTaken;
              try {
                await updateIncident(selectedOutage.id, payload);
                toast.success('Outage management updated');
                setShowOutageManage(false);
                setSelectedOutage(null);
                loadAllData();
              } catch {
                toast.error('Failed to update outage');
              }
            }}
            onCancel={() => { setShowOutageManage(false); setSelectedOutage(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}