import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleType, FuelType, PoolType, Vehicle, createVehicle } from "./fleetApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newVehicle?: Vehicle) => void;
}

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "Electric Scooter" as VehicleType,
    fuelType: "EV" as FuelType,
    pool: "Hub" as PoolType,
    currentOdometerKm: 0,
  });

  const buildVehicle = (): Vehicle => ({
    id: `v-${Date.now()}`,
    vehicleId: formData.vehicleId || `NEW-${Date.now()}`,
    type: formData.type,
    fuelType: formData.fuelType,
    status: 'active',
    conditionScore: 100,
    conditionLabel: 'New',
    lastServiceDate: new Date().toISOString().slice(0, 10),
    nextServiceDueDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    currentOdometerKm: formData.currentOdometerKm || 0,
    utilizationPercent: 0,
    documents: { rcValidTill: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10), insuranceValidTill: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10) },
    pool: formData.pool,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = buildVehicle();
    try {
      const created = await createVehicle(payload);
      const vehicleToAdd: Vehicle = (created && typeof created === 'object' && 'id' in created)
        ? { ...payload, ...created }
        : payload;
      toast.success("Vehicle added successfully");
      onSuccess(vehicleToAdd);
      onClose();
      setFormData({ vehicleId: "", type: "Electric Scooter", fuelType: "EV", pool: "Hub", currentOdometerKm: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Enter the details for the new vehicle to add it to the fleet inventory.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle ID</Label>
            <Input 
              id="vehicleId"
              placeholder="e.g. EV-SCOOT-100"
              value={formData.vehicleId}
              onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: VehicleType) => setFormData({...formData, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electric Scooter">Electric Scooter</SelectItem>
                  <SelectItem value="Motorbike (Gas)">Motorbike (Gas)</SelectItem>
                  <SelectItem value="Bicycle">Bicycle</SelectItem>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select 
                value={formData.fuelType} 
                onValueChange={(v: FuelType) => setFormData({...formData, fuelType: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EV">EV</SelectItem>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Initial Pool</Label>
            <Select 
              value={formData.pool} 
              onValueChange={(v: PoolType) => setFormData({...formData, pool: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hub">Hub</SelectItem>
                <SelectItem value="Dedicated">Dedicated</SelectItem>
                <SelectItem value="Spare">Spare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="odometer">Current Odometer (km)</Label>
            <Input 
              id="odometer"
              type="number"
              min={0}
              value={formData.currentOdometerKm}
              onChange={(e) => setFormData({...formData, currentOdometerKm: parseInt(e.target.value) || 0})}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.vehicleId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
