import React, { useState, useEffect, useCallback } from 'react';
import { AdminModal } from './AdminModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  RefreshCw,
  Pause,
  Play,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  DispatchEngineStatus,
  DispatchLogEntry,
  fetchDispatchEngineStatus,
  restartDispatchEngine,
  pauseDispatchEngine,
  resumeDispatchEngine,
  updateDispatchConfig,
  manualOverrideDispatch,
  fetchDispatchLogs,
} from '../citywideControlApi';
import { toast } from 'sonner';

interface DispatchEngineModalProps {
  open: boolean;
  onClose: () => void;
  cityId?: string;
  onStatusChange?: () => void;
}

export function DispatchEngineModal({ open, onClose, cityId, onStatusChange }: DispatchEngineModalProps) {
  const [engineStatus, setEngineStatus] = useState<DispatchEngineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('nearest_available');
  const [riderSelection, setRiderSelection] = useState('proximity');
  const [batchingEnabled, setBatchingEnabled] = useState(true);
  const [surgePricingEnabled, setSurgePricingEnabled] = useState(true);

  const [showManualOverride, setShowManualOverride] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<'running' | 'paused'>('paused');
  const [overrideReason, setOverrideReason] = useState('');

  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<DispatchLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadEngineStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchDispatchEngineStatus(cityId);
      setEngineStatus(data);
      if (data?.configuration) {
        setAlgorithm(data.configuration.algorithm);
        setRiderSelection(data.configuration.riderSelection);
        setBatchingEnabled(Boolean(data.configuration.batchingEnabled));
        setSurgePricingEnabled(Boolean(data.configuration.surgePricingEnabled));
      }
      if (!data) setLoadError(true);
    } catch (error) {
      console.error('Failed to load engine status:', error);
      setEngineStatus(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (open) {
      loadEngineStatus();
    } else {
      setShowManualOverride(false);
      setShowLogs(false);
      setOverrideReason('');
    }
  }, [open, loadEngineStatus]);

  const refreshAfterAction = async () => {
    await loadEngineStatus();
    onStatusChange?.();
  };

  const handleRestart = async () => {
    if (!confirm('Are you sure you want to restart the dispatch engine? This may cause brief service interruption.')) {
      return;
    }
    setActionLoading(true);
    try {
      await restartDispatchEngine(cityId);
      toast.success('Dispatch engine restarted successfully');
      await refreshAfterAction();
    } catch {
      toast.error('Failed to restart dispatch engine');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause the dispatch engine?')) {
      return;
    }
    setActionLoading(true);
    try {
      await pauseDispatchEngine(cityId);
      toast.warning('Dispatch engine paused');
      await refreshAfterAction();
    } catch {
      toast.error('Failed to pause dispatch engine');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeDispatchEngine(cityId);
      toast.success('Dispatch engine resumed');
      await refreshAfterAction();
    } catch {
      toast.error('Failed to resume dispatch engine');
    } finally {
      setActionLoading(false);
    }
  };

  const openManualOverride = () => {
    setOverrideTarget(engineStatus?.status === 'running' ? 'paused' : 'running');
    setOverrideReason('');
    setShowManualOverride(true);
  };

  const handleManualOverride = async () => {
    setActionLoading(true);
    try {
      await manualOverrideDispatch(overrideTarget, overrideReason, cityId);
      toast.success(
        overrideTarget === 'paused'
          ? 'Dispatch paused via manual override'
          : 'Dispatch resumed via manual override'
      );
      setShowManualOverride(false);
      await refreshAfterAction();
    } catch {
      toast.error('Manual override failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = async () => {
    setShowLogs(true);
    setLogsLoading(true);
    try {
      const entries = await fetchDispatchLogs(cityId);
      setLogs(entries);
    } catch {
      toast.error('Failed to load dispatch logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const applyConfigChanges = async () => {
    setActionLoading(true);
    try {
      await updateDispatchConfig({
        algorithm,
        riderSelection,
        batchingEnabled,
        surgePricingEnabled,
      }, cityId);
      toast.success('Dispatch configuration updated');
      await refreshAfterAction();
    } catch {
      toast.error('Failed to apply dispatch changes');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-emerald-500';
      case 'paused': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  const formatLogAction = (action: string) => {
    const labels: Record<string, string> = {
      restart: 'Restart',
      pause: 'Pause',
      resume: 'Resume',
      manual_override: 'Manual Override',
      config_update: 'Config Update',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (loading) {
    return (
      <AdminModal open={open} onOpenChange={handleDialogOpenChange} title="Auto-Dispatch Engine Control" icon={<Activity size={24} />}>
          <div className="py-12 text-center px-6">
            <Loader2 className="animate-spin text-emerald-600 mx-auto" size={32} />
            <p className="text-gray-500 mt-3">Loading dispatch engine status...</p>
          </div>
      </AdminModal>
    );
  }

  if (!engineStatus || loadError) {
    return (
      <AdminModal open={open} onOpenChange={handleDialogOpenChange} title="Auto-Dispatch Engine Control" icon={<Activity size={24} />}>
          <div className="py-12 text-center px-6">
            <p className="text-gray-500 mb-4">No dispatch data available</p>
            <Button variant="outline" onClick={loadEngineStatus}>
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          </div>
      </AdminModal>
    );
  }

  return (
    <>
      <AdminModal
        open={open}
        onOpenChange={handleDialogOpenChange}
        title="Auto-Dispatch Engine Control"
        icon={<Activity className="text-emerald-500" size={28} />}
        maxWidth="max-w-3xl"
      >
          <div className="px-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(engineStatus.status)} text-white`}>
                {engineStatus.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">Uptime: {engineStatus.uptime}</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last Restart</div>
              <div className="text-sm font-medium">
                {new Date(engineStatus.lastRestart).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Engine Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f4f4f5] p-3 rounded-lg">
                  <div className="text-sm text-[#71717a]">Status</div>
                  <div className="text-xl font-bold capitalize">{engineStatus.status}</div>
                </div>
                <div className="bg-[#f4f4f5] p-3 rounded-lg">
                  <div className="text-sm text-[#71717a]">Uptime</div>
                  <div className="text-xl font-bold">{engineStatus.uptimePercent}%</div>
                </div>
                <div className="bg-[#f4f4f5] p-3 rounded-lg">
                  <div className="text-sm text-[#71717a]">Processing Orders</div>
                  <div className="text-xl font-bold">{engineStatus.processingOrders}</div>
                </div>
                <div className="bg-[#f4f4f5] p-3 rounded-lg">
                  <div className="text-sm text-[#71717a]">Avg Dispatch Time</div>
                  <div className="text-xl font-bold">{engineStatus.avgDispatchTime}s</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#71717a]">Success Rate</span>
                  <span className="font-bold text-emerald-600">{engineStatus.successRate}%</span>
                </div>
                <Progress value={engineStatus.successRate} className="h-2" />
              </div>
            </div>

            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Settings size={18} />
                Configuration
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Matching Algorithm</div>
                    <div className="text-sm text-[#71717a]">Current: {engineStatus.configuration.algorithm}</div>
                  </div>
                  <select
                    className="px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm"
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    disabled={actionLoading}
                  >
                    <option value="nearest_available">Nearest Available</option>
                    <option value="balanced">Balanced</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Rider Selection</div>
                    <div className="text-sm text-[#71717a]">Current: {engineStatus.configuration.riderSelection}</div>
                  </div>
                  <select
                    className="px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm"
                    value={riderSelection}
                    onChange={(e) => setRiderSelection(e.target.value)}
                    disabled={actionLoading}
                  >
                    <option value="proximity">Proximity</option>
                    <option value="proximity_rating">Proximity + Rating</option>
                    <option value="rating">Rating Only</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-[#e4e4e7]">
                  <div>
                    <div className="font-medium">Order Batching</div>
                    <div className="text-sm text-[#71717a]">Combine multiple orders for efficiency</div>
                  </div>
                  <Switch checked={batchingEnabled} onCheckedChange={setBatchingEnabled} disabled={actionLoading} />
                </div>
                <div className="flex items-center justify-between py-3 border-t border-[#e4e4e7]">
                  <div>
                    <div className="font-medium">Surge Pricing</div>
                    <div className="text-sm text-[#71717a]">Automatically apply surge multipliers</div>
                  </div>
                  <Switch checked={surgePricingEnabled} onCheckedChange={setSurgePricingEnabled} disabled={actionLoading} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  className="justify-start bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRestart}
                  disabled={actionLoading}
                >
                  <RefreshCw size={16} className={`mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
                  Restart Engine
                </Button>
                {engineStatus.status === 'running' ? (
                  <Button variant="outline" className="justify-start" onClick={handlePause} disabled={actionLoading}>
                    <Pause size={16} className="mr-2" />
                    Pause Dispatch
                  </Button>
                ) : (
                  <Button variant="outline" className="justify-start" onClick={handleResume} disabled={actionLoading}>
                    <Play size={16} className="mr-2" />
                    Resume Dispatch
                  </Button>
                )}
                <Button variant="outline" className="justify-start" onClick={openManualOverride} disabled={actionLoading}>
                  <Settings size={16} className="mr-2" />
                  Manual Override
                </Button>
                <Button variant="outline" className="justify-start" onClick={handleViewLogs} disabled={actionLoading}>
                  <BarChart3 size={16} className="mr-2" />
                  View Logs
                </Button>
              </div>
            </div>

            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Advanced Options</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="force-update" className="rounded" />
                  <label htmlFor="force-update" className="text-sm">Force update configuration</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="clear-cache" className="rounded" />
                  <label htmlFor="clear-cache" className="text-sm">Clear cache on restart</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reset-limits" className="rounded" />
                  <label htmlFor="reset-limits" className="text-sm">Reset rate limits</label>
                </div>
                <Button variant="outline" className="w-full mt-3" onClick={applyConfigChanges} disabled={actionLoading}>
                  Apply Changes
                </Button>
              </div>
            </div>

            {engineStatus.status === 'running' && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle size={16} />
                  All Systems Operational
                </div>
                <div className="text-sm text-emerald-700 mt-1">
                  The dispatch engine is running smoothly with {engineStatus.successRate}% success rate
                </div>
              </div>
            )}
            {engineStatus.status === 'paused' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <Pause size={16} />
                  Engine Paused
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  The dispatch engine is currently paused. Click Resume to continue operations.
                </div>
              </div>
            )}
          </div>
      </AdminModal>

      <AlertDialog open={showManualOverride} onOpenChange={setShowManualOverride}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Override</AlertDialogTitle>
            <AlertDialogDescription>
              Force the dispatch engine to a specific state. Use when automated controls are unresponsive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Target State</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={overrideTarget === 'paused' ? 'default' : 'outline'}
                  className={overrideTarget === 'paused' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  onClick={() => setOverrideTarget('paused')}
                >
                  <Pause size={14} className="mr-1" />
                  Force Pause
                </Button>
                <Button
                  type="button"
                  variant={overrideTarget === 'running' ? 'default' : 'outline'}
                  className={overrideTarget === 'running' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={() => setOverrideTarget('running')}
                >
                  <Play size={14} className="mr-1" />
                  Force Resume
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Peak hour congestion, system maintenance..."
                className="w-full px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleManualOverride();
              }}
              disabled={actionLoading}
              className={overrideTarget === 'paused' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {actionLoading ? 'Applying...' : `Force ${overrideTarget === 'paused' ? 'Pause' : 'Resume'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              Dispatch Engine Logs
            </DialogTitle>
            <DialogDescription>
              Activity history for restart, pause, resume, and manual override actions.
            </DialogDescription>
          </DialogHeader>
          {logsLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="animate-spin mx-auto text-emerald-600" size={28} />
              <p className="text-sm text-[#71717a] mt-2">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-[#71717a]">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>No activity logs yet. Actions will appear here after restart, pause, or override.</p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {logs.map((log) => (
                <div key={log.id} className="border border-[#e4e4e7] rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{formatLogAction(log.action)}</span>
                    <Badge variant="outline" className="text-xs capitalize">{log.status}</Badge>
                  </div>
                  {log.message && <p className="text-[#52525b]">{log.message}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#71717a]">
                    <Clock size={12} />
                    {new Date(log.timestamp).toLocaleString()}
                    {log.userId && <span>· {log.userId}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
