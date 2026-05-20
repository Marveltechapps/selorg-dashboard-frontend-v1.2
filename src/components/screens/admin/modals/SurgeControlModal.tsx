import React, { useState, useEffect, useCallback } from 'react';
import { AdminModal } from './AdminModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Zap,
  IndianRupee,
  Bell,
  Phone,
  X,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  SurgeInfo,
  fetchSurgeInfo,
  updateGlobalSurge,
  updateSurgeMultiplier,
  endSurge,
  executeSurgeAction,
} from '../citywideControlApi';
import { toast } from 'sonner';

interface SurgeControlModalProps {
  open: boolean;
  onClose: () => void;
  cityId?: string;
  onSurgeUpdated?: () => void;
}

export function SurgeControlModal({
  open,
  onClose,
  cityId,
  onSurgeUpdated,
}: SurgeControlModalProps) {
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [globalMultiplier, setGlobalMultiplier] = useState(1.0);
  const [updating, setUpdating] = useState(false);

  const loadSurgeInfo = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchSurgeInfo(cityId);
      setSurgeInfo(data);
      if (data != null) setGlobalMultiplier(data.globalMultiplier ?? 1.0);
      if (!data) setLoadError(true);
    } catch (error) {
      console.error('Failed to load surge info:', error);
      setSurgeInfo(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (open) {
      loadSurgeInfo();
    }
  }, [open, loadSurgeInfo]);

  const refreshAfterAction = async () => {
    await loadSurgeInfo();
    onSurgeUpdated?.();
  };

  const handleUpdateGlobalSurge = async () => {
    setUpdating(true);
    try {
      await updateGlobalSurge(globalMultiplier, cityId);
      toast.success(`Global surge updated to ${globalMultiplier.toFixed(1)}x`);
      await refreshAfterAction();
    } catch {
      toast.error('Failed to update surge multiplier');
    } finally {
      setUpdating(false);
    }
  };

  const handleActivateSurge = async () => {
    setUpdating(true);
    try {
      const multiplier = Math.max(1.5, globalMultiplier);
      setGlobalMultiplier(multiplier);
      await updateGlobalSurge(multiplier, cityId);
      toast.success(`Surge pricing activated at ${multiplier.toFixed(1)}x`);
      await refreshAfterAction();
    } catch {
      toast.error('Failed to activate surge pricing');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateZoneSurge = async (zoneId: string, multiplier: number) => {
    setUpdating(true);
    try {
      await updateSurgeMultiplier(zoneId, multiplier, cityId);
      toast.success('Zone surge updated');
      await refreshAfterAction();
    } catch {
      toast.error('Failed to update zone surge');
    } finally {
      setUpdating(false);
    }
  };

  const handleEndSurge = async () => {
    if (!confirm('Are you sure you want to end surge pricing?')) return;

    setUpdating(true);
    try {
      await endSurge(cityId);
      toast.success('Surge pricing ended');
      onSurgeUpdated?.();
      onClose();
    } catch {
      toast.error('Failed to end surge');
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickAction = async (action: 'increase_pricing' | 'notify_customers' | 'notify_riders') => {
    if (action !== 'increase_pricing' && surgeInfo && !surgeInfo.active) {
      toast.error('Activate surge pricing first');
      return;
    }

    setUpdating(true);
    try {
      const result = await executeSurgeAction(action, cityId);
      if (action === 'increase_pricing') {
        const next = result.surgeInfo?.globalMultiplier ?? globalMultiplier;
        setGlobalMultiplier(next);
        toast.success(`Pricing increased to ${next.toFixed(1)}x`);
        await refreshAfterAction();
      } else if (action === 'notify_customers') {
        toast.success(`Notified ${result.sent ?? 0} customers about surge pricing`);
      } else if (action === 'notify_riders') {
        toast.success(`Notified ${result.sent ?? 0} riders about surge period`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - start) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatEstimatedEnd = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((end - now) / 60000);
    if (diffMinutes < 0) return 'Expired';
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (loading) {
    return (
      <AdminModal open={open} onOpenChange={handleDialogOpenChange} title="Surge Control Management" icon={<Zap size={24} />}>
        <div className="py-12 text-center">
          <Loader2 className="animate-spin text-orange-500 mx-auto" size={32} />
          <p className="text-gray-500 mt-3">Loading surge configuration...</p>
        </div>
      </AdminModal>
    );
  }

  if (!surgeInfo || loadError) {
    return (
      <AdminModal open={open} onOpenChange={handleDialogOpenChange} title="Surge Control Management" icon={<Zap size={24} />}>
        <div className="py-12 text-center">
          <p className="text-gray-500 mb-4">No surge data available</p>
          <Button variant="outline" onClick={loadSurgeInfo}>
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        </div>
      </AdminModal>
    );
  }

  return (
    <AdminModal
      open={open}
      onOpenChange={handleDialogOpenChange}
      title="Surge Control Management"
      icon={<Zap className="text-orange-500" size={28} />}
      subtitle={surgeInfo.active ? `SURGE ACTIVE (${surgeInfo.globalMultiplier}x)` : 'SURGE INACTIVE'}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="flex items-center gap-2 mb-4">
          {surgeInfo.active ? (
            <Badge className="bg-orange-500 text-white">
              SURGE ACTIVE ({surgeInfo.globalMultiplier}x)
            </Badge>
          ) : (
            <Badge variant="outline">SURGE INACTIVE</Badge>
          )}
          {surgeInfo.active && surgeInfo.startTime && (
            <span className="text-sm text-gray-500">
              Active for {formatDuration(surgeInfo.startTime)}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {surgeInfo.active && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              {surgeInfo.estimatedEnd && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock size={16} />
                    <span className="text-sm">
                      Estimated end in {formatEstimatedEnd(surgeInfo.estimatedEnd)}
                    </span>
                  </div>
                  {surgeInfo.reason && (
                    <div className="text-sm text-orange-600">{surgeInfo.reason}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Global Surge Multiplier</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current Multiplier</span>
                <span className="text-2xl font-bold text-orange-600">{globalMultiplier.toFixed(1)}x</span>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[globalMultiplier]}
                  onValueChange={(value) => setGlobalMultiplier(value[0])}
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                  disabled={updating}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1.0x</span>
                  <span>1.5x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={handleUpdateGlobalSurge}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Apply Global Multiplier'}
              </Button>
            </div>
          </div>

          {surgeInfo.active && surgeInfo.zonesAffected.length > 0 && (
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Zone-Specific Surge</h4>
              <div className="space-y-3">
                <div className="text-sm text-gray-500 mb-2">
                  {surgeInfo.zonesAffected.length} zones affected
                </div>
                {surgeInfo.zonesAffected.map((zoneId) => {
                  const multiplier = surgeInfo.zoneMultipliers[zoneId] || 1.0;
                  const zoneName = `Zone ${zoneId.split('-')[1] || zoneId}`;

                  return (
                    <div key={zoneId} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{zoneName}</span>
                        <span className="font-bold text-orange-600">{multiplier.toFixed(1)}x</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating}
                          onClick={() => handleUpdateZoneSurge(zoneId, Math.max(1.0, multiplier - 0.1))}
                        >
                          −
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" disabled>
                          {multiplier.toFixed(1)}x
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating}
                          onClick={() => handleUpdateZoneSurge(zoneId, Math.min(2.0, multiplier + 0.1))}
                        >
                          +
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating}
                          onClick={() => handleUpdateZoneSurge(zoneId, 1.0)}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                disabled={updating}
                onClick={() => handleQuickAction('increase_pricing')}
              >
                <IndianRupee size={16} className="mr-2" />
                Increase Pricing
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={updating || !surgeInfo.active}
                onClick={() => handleQuickAction('notify_customers')}
              >
                <Bell size={16} className="mr-2" />
                Notify Customers
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={updating || !surgeInfo.active}
                onClick={() => handleQuickAction('notify_riders')}
              >
                <Phone size={16} className="mr-2" />
                Notify Riders
              </Button>
              {surgeInfo.active && (
                <Button
                  variant="destructive"
                  className="justify-start"
                  onClick={handleEndSurge}
                  disabled={updating}
                >
                  <X size={16} className="mr-2" />
                  End Surge
                </Button>
              )}
            </div>
          </div>

          {!surgeInfo.active && (
            <div className="text-center py-8 text-gray-500">
              <Zap size={48} className="mx-auto mb-2 opacity-20" />
              <div>No surge pricing currently active</div>
              <Button className="mt-4 bg-orange-600 hover:bg-orange-700" onClick={handleActivateSurge} disabled={updating}>
                {updating ? 'Activating...' : 'Activate Surge Pricing'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
