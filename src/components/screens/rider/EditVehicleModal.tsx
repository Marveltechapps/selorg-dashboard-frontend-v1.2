import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Vehicle } from './fleetApi';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave: (id: string, data: Partial<Vehicle>) => Promise<void>;
}

export function EditVehicleModal({ isOpen, onClose, vehicle, onSave }: EditVehicleModalProps) {
  const [status, setStatus] = useState<string>('active');
  const [conditionScore, setConditionScore] = useState(100);
  const [assignedRiderName, setAssignedRiderName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setStatus(vehicle.status === 'inactive' ? 'offline' : vehicle.status);
      setConditionScore(vehicle.conditionScore);
      setAssignedRiderName(vehicle.assignedRiderName ?? '');
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setLoading(true);
    try {
      const payload: Partial<Vehicle> = {
        status: status === 'offline' ? 'inactive' : status,
        conditionScore,
        assignedRiderName: assignedRiderName.trim() || null,
      };
      await onSave(vehicle.id, payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>{vehicle.vehicleId} - {vehicle.type}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full h-9 rounded-md border border-input bg-background px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditionScore">Condition Score (0-100)</Label>
            <Input
              id="conditionScore"
              type="number"
              min={0}
              max={100}
              value={conditionScore}
              onChange={(e) => setConditionScore(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedRiderName">Assigned Rider</Label>
            <Input
              id="assignedRiderName"
              placeholder="Rider name"
              value={assignedRiderName}
              onChange={(e) => setAssignedRiderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#F97316] hover:bg-[#EA580C]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
