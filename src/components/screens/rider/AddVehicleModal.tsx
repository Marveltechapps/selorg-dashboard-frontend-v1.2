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
import { Loader2, Plus } from 'lucide-react';

const VEHICLE_TYPES = ['Electric Scooter', 'Motorbike (Gas)', 'Bicycle', 'Car', 'Van'] as const;
const FUEL_TYPES = ['EV', 'Petrol', 'Diesel', 'Other'] as const;

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { vehicleId: string; type: string; fuelType: string }) => Promise<void>;
}

export function AddVehicleModal({ isOpen, onClose, onSubmit }: AddVehicleModalProps) {
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<string>(VEHICLE_TYPES[0]);
  const [fuelType, setFuelType] = useState<string>(FUEL_TYPES[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ vehicleId: vehicleId.trim(), type, fuelType });
      setVehicleId('');
      setType(VEHICLE_TYPES[0]);
      setFuelType(FUEL_TYPES[0]);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
          <DialogDescription>Register a new vehicle in the fleet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle ID</Label>
            <Input
              id="vehicleId"
              placeholder="e.g. VH-001"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="w-full h-9 rounded-md border border-input bg-background px-3"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <select
              id="fuelType"
              className="w-full h-9 rounded-md border border-input bg-background px-3"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
            >
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !vehicleId.trim()} className="bg-[#16A34A] hover:bg-[#15803D]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
