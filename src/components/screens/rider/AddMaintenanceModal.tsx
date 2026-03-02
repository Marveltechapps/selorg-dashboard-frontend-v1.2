import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench } from 'lucide-react';
import { Vehicle } from './fleetApi';

const MAINTENANCE_TYPES = ['Scheduled Service', 'Breakdown', 'Inspection'] as const;

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSubmit: (data: { vehicleId: string; type: string; scheduledDate: string }) => Promise<void>;
}

export function AddMaintenanceModal({ isOpen, onClose, vehicles, onSubmit }: AddMaintenanceModalProps) {
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<string>(MAINTENANCE_TYPES[0]);
  const [scheduledDate, setScheduledDate] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        vehicleId: vehicleId.trim(),
        type,
        scheduledDate: new Date(scheduledDate).toISOString(),
      });
      setVehicleId(vehicles[0]?.vehicleId ?? '');
      setType(MAINTENANCE_TYPES[0]);
      setScheduledDate(new Date().toISOString().slice(0, 16));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Maintenance Task</DialogTitle>
          <DialogDescription>Schedule a maintenance task for a vehicle.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <select
              id="vehicleId"
              className="w-full h-9 rounded-md border border-input bg-background px-3"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleId}>
                  {v.vehicleId} ({v.type})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="w-full h-9 rounded-md border border-input bg-background px-3"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Scheduled Date</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !vehicleId.trim()} className="bg-[#3B82F6] hover:bg-[#2563EB]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench size={14} className="mr-2" />}
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
