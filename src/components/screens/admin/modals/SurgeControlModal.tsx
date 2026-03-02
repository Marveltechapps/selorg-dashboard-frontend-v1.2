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
import { Slider } from '@/components/ui/slider';
import { 
  Zap,
  TrendingUp,
  Users,
  Clock,
  IndianRupee,
  Bell,
  Phone,
  X
} from 'lucide-react';
import { 
  SurgeInfo, 
  fetchSurgeInfo, 
  updateGlobalSurge, 
  updateSurgeMultiplier,
  endSurge
} from '../citywideControlApi';
import { toast } from 'sonner';

interface SurgeControlModalProps {
  open: boolean;
  onClose: () => void;
  onSurgeUpdated?: () => void;
}

export function SurgeControlModal({ 
  open, 
  onClose,
  onSurgeUpdated 
}: SurgeControlModalProps) {
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalMultiplier, setGlobalMultiplier] = useState(1.0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      loadSurgeInfo();
    }
  }, [open]);

  const loadSurgeInfo = async () => {
    setLoading(true);
    try {
      const data = await fetchSurgeInfo();
      setSurgeInfo(data);
      if (data != null) setGlobalMultiplier(data.globalMultiplier ?? 1.0);
    } catch (error) {
      console.error('Failed to load surge info:', error);
      setSurgeInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalSurge = async () => {
    setUpdating(true);
    try {
      await updateGlobalSurge(globalMultiplier);
      toast.success(`Global surge updated to ${globalMultiplier}x`);
      onSurgeUpdated?.();
      await loadSurgeInfo();
    } catch (error) {
      toast.error('Failed to update surge multiplier');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateZoneSurge = async (zoneId: string, multiplier: number) => {
    try {
      await updateSurgeMultiplier(zoneId, multiplier);
      toast.success('Zone surge updated');
      await loadSurgeInfo();
    } catch (error) {
      toast.error('Failed to update zone surge');
    }
  };

  const handleEndSurge = async () => {
    if (!confirm('Are you sure you want to end surge pricing?')) return;
    
    setUpdating(true);
    try {
      await endSurge();
      toast.success('Surge pricing ended');
      onSurgeUpdated?.();
      onClose();
    } catch (error) {
      toast.error('Failed to end surge');
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

  if (!surgeInfo) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap size={24} />
              Surge Control Management
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-[#71717a]">No surge data available</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Zap className="text-orange-500" size={28} />
                Surge Control Management
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {surgeInfo.active ? (
                  <Badge className="bg-orange-500 text-white">
                    SURGE ACTIVE ({surgeInfo.globalMultiplier}x)
                  </Badge>
                ) : (
                  <Badge variant="outline">SURGE INACTIVE</Badge>
                )}
                {surgeInfo.active && surgeInfo.startTime && (
                  <span className="text-sm text-[#71717a]">
                    Active for {formatDuration(surgeInfo.startTime)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Surge Status Overview */}
          {surgeInfo.active && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              {surgeInfo.estimatedEnd && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock size={16} />
                    <span className="text-sm">Estimated end in {formatEstimatedEnd(surgeInfo.estimatedEnd)}</span>
                  </div>
                  {surgeInfo.reason && (
                    <div className="text-sm text-orange-600">{surgeInfo.reason}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Global Surge Control */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Global Surge Multiplier</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#71717a]">Current Multiplier</span>
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
                />
                <div className="flex justify-between text-xs text-[#71717a]">
                  <span>1.0x</span>
                  <span>1.5x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={handleUpdateGlobalSurge}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Apply Global Multiplier'}
              </Button>
            </div>
          </div>

          {/* Zone-Specific Controls */}
          {surgeInfo.active && surgeInfo.zonesAffected.length > 0 && (
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-4">Zone-Specific Surge</h4>
              <div className="space-y-3">
                <div className="text-sm text-[#71717a] mb-2">
                  {surgeInfo.zonesAffected.length} zones affected
                </div>
                {surgeInfo.zonesAffected.map((zoneId, index) => {
                  const multiplier = surgeInfo.zoneMultipliers[zoneId] || 1.0;
                  const zoneName = `Zone ${zoneId.split('-')[1]}`;
                  
                  return (
                    <div key={zoneId} className="bg-[#f4f4f5] p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{zoneName}</span>
                        <span className="font-bold text-orange-600">{multiplier.toFixed(1)}x</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateZoneSurge(zoneId, Math.max(1.0, multiplier - 0.1))}
                        >
                          −
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          disabled
                        >
                          {multiplier.toFixed(1)}x
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateZoneSurge(zoneId, Math.min(2.0, multiplier + 0.1))}
                        >
                          +
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
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

          {/* Quick Actions */}
          <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
            <h4 className="font-bold mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start">
                <IndianRupee size={16} className="mr-2" />
                Increase Pricing
              </Button>
              <Button variant="outline" className="justify-start">
                <Bell size={16} className="mr-2" />
                Notify Customers
              </Button>
              <Button variant="outline" className="justify-start">
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
            <div className="text-center py-8 text-[#71717a]">
              <Zap size={48} className="mx-auto mb-2 opacity-20" />
              <div>No surge pricing currently active</div>
              <Button className="mt-4" onClick={() => setGlobalMultiplier(1.5)}>
                Activate Surge Pricing
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}