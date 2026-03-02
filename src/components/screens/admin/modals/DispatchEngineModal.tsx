import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  CheckCircle
} from 'lucide-react';
import { 
  DispatchEngineStatus, 
  fetchDispatchEngineStatus,
  restartDispatchEngine,
  pauseDispatchEngine,
  resumeDispatchEngine,
  updateDispatchConfig
} from '../citywideControlApi';
import { toast } from 'sonner';

interface DispatchEngineModalProps {
  open: boolean;
  onClose: () => void;
}

export function DispatchEngineModal({ open, onClose }: DispatchEngineModalProps) {
  const [engineStatus, setEngineStatus] = useState<DispatchEngineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadEngineStatus();
    }
  }, [open]);

  const loadEngineStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchDispatchEngineStatus();
      setEngineStatus(data);
    } catch (error) {
      console.error('Failed to load engine status:', error);
      setEngineStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm('Are you sure you want to restart the dispatch engine? This may cause brief service interruption.')) {
      return;
    }

    setActionLoading(true);
    try {
      await restartDispatchEngine();
      toast.success('Dispatch engine restarted successfully');
      await loadEngineStatus();
    } catch (error) {
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
      await pauseDispatchEngine();
      toast.warning('Dispatch engine paused');
      await loadEngineStatus();
    } catch (error) {
      toast.error('Failed to pause dispatch engine');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeDispatchEngine();
      toast.success('Dispatch engine resumed');
      await loadEngineStatus();
    } catch (error) {
      toast.error('Failed to resume dispatch engine');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfigUpdate = async (key: string, value: any) => {
    try {
      await updateDispatchConfig({ [key]: value });
      toast.success('Configuration updated');
      await loadEngineStatus();
    } catch (error) {
      toast.error('Failed to update configuration');
    }
  };

  if (!engineStatus) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity size={24} />
              Auto-Dispatch Engine Control
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-[#71717a]">No dispatch data available</div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-emerald-500';
      case 'paused': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Activity className="text-emerald-500" size={28} />
                Auto-Dispatch Engine Control
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getStatusColor(engineStatus.status)} text-white`}>
                  {engineStatus.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-[#71717a]">
                  Uptime: {engineStatus.uptime}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#71717a]">Last Restart</div>
              <div className="text-sm font-medium">
                {new Date(engineStatus.lastRestart).toLocaleString()}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Engine Status */}
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

          {/* Configuration */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Settings size={18} />
              Configuration
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Matching Algorithm</div>
                  <div className="text-sm text-[#71717a]">
                    Current: {engineStatus.configuration.algorithm}
                  </div>
                </div>
                <select className="px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm">
                  <option value="ai-optimized">AI-Optimized</option>
                  <option value="proximity">Proximity-Based</option>
                  <option value="balanced">Balanced</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Rider Selection</div>
                  <div className="text-sm text-[#71717a]">
                    Current: {engineStatus.configuration.riderSelection}
                  </div>
                </div>
                <select className="px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm">
                  <option value="proximity-rating">Proximity + Rating</option>
                  <option value="proximity">Proximity Only</option>
                  <option value="rating">Rating Only</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[#e4e4e7]">
                <div>
                  <div className="font-medium">Order Batching</div>
                  <div className="text-sm text-[#71717a]">
                    Combine multiple orders for efficiency
                  </div>
                </div>
                <Switch
                  checked={engineStatus.configuration.batchingEnabled}
                  onCheckedChange={(checked) => handleConfigUpdate('batchingEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[#e4e4e7]">
                <div>
                  <div className="font-medium">Surge Pricing</div>
                  <div className="text-sm text-[#71717a]">
                    Automatically apply surge multipliers
                  </div>
                </div>
                <Switch
                  checked={engineStatus.configuration.surgePricingEnabled}
                  onCheckedChange={(checked) => handleConfigUpdate('surgePricingEnabled', checked)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="default"
                className="justify-start bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRestart}
                disabled={actionLoading}
              >
                <RefreshCw size={16} className="mr-2" />
                Restart Engine
              </Button>

              {engineStatus.status === 'running' ? (
                <Button 
                  variant="outline"
                  className="justify-start"
                  onClick={handlePause}
                  disabled={actionLoading}
                >
                  <Pause size={16} className="mr-2" />
                  Pause Dispatch
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="justify-start"
                  onClick={handleResume}
                  disabled={actionLoading}
                >
                  <Play size={16} className="mr-2" />
                  Resume Dispatch
                </Button>
              )}

              <Button 
                variant="outline"
                className="justify-start"
              >
                <Settings size={16} className="mr-2" />
                Manual Override
              </Button>

              <Button 
                variant="outline"
                className="justify-start"
              >
                <BarChart3 size={16} className="mr-2" />
                View Logs
              </Button>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Advanced Options</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="force-update" className="rounded" />
                <label htmlFor="force-update" className="text-sm">
                  Force update configuration
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="clear-cache" className="rounded" />
                <label htmlFor="clear-cache" className="text-sm">
                  Clear cache on restart
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="reset-limits" className="rounded" />
                <label htmlFor="reset-limits" className="text-sm">
                  Reset rate limits
                </label>
              </div>
              <Button variant="outline" className="w-full mt-3">
                Apply Changes
              </Button>
            </div>
          </div>

          {/* Status Message */}
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
      </DialogContent>
    </Dialog>
  );
}