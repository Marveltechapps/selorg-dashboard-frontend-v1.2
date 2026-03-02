import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AvailableRider, fetchAvailableRiders, createShift } from "./shiftsApi";

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: string;
}

export function CreateShiftModal({ isOpen, onClose, onSuccess, selectedDate }: CreateShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [riders, setRiders] = useState<AvailableRider[]>([]);
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    date: selectedDate,
    startTime: "08:00",
    endTime: "16:00",
    hub: "Downtown Hub",
    isPeakHour: false,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
      loadRiders();
    }
  }, [isOpen, selectedDate]);

  const loadRiders = async () => {
    try {
      const data = await fetchAvailableRiders(selectedDate);
      setRiders(data);
    } catch (error) {
      console.error("Failed to load riders");
    }
  };

  const handleToggleRider = (riderId: string) => {
    setSelectedRiders(prev => 
      prev.includes(riderId) ? prev.filter(id => id !== riderId) : [...prev, riderId]
    );
  };

  const handleSubmit = async () => {
    if (selectedRiders.length === 0) {
      toast.error("Please select at least one rider");
      return;
    }

    setLoading(true);
    try {
      const promises = selectedRiders.map(riderId => 
        createShift({
          riderId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          hub: formData.hub,
          isPeakHour: formData.isPeakHour,
          status: 'scheduled',
        })
      );
      
      await Promise.all(promises);
      toast.success(`Successfully created ${selectedRiders.length} shifts`);
      onSuccess();
      onClose();
      setSelectedRiders([]);
    } catch (error) {
      toast.error("Failed to create shifts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="create-shift-description">
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
          <DialogDescription id="create-shift-description">Schedule shifts for one or multiple riders.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                   type="date" 
                   value={formData.date} 
                   onChange={(e) => setFormData({...formData, date: e.target.value})} 
                />
             </div>
             <div className="space-y-2">
                <Label>Hub</Label>
                <Select value={formData.hub} onValueChange={(v) => setFormData({...formData, hub: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Downtown Hub">Downtown Hub</SelectItem>
                    <SelectItem value="North Hub">North Hub</SelectItem>
                    <SelectItem value="West Hub">West Hub</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input 
                type="time" 
                value={formData.startTime} 
                onChange={(e) => setFormData({...formData, startTime: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input 
                type="time" 
                value={formData.endTime} 
                onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="peak" 
              checked={formData.isPeakHour} 
              onCheckedChange={(c) => setFormData({...formData, isPeakHour: !!c})} 
            />
            <Label htmlFor="peak" className="font-medium text-orange-600">Peak Hour Deployment</Label>
          </div>

          <div className="space-y-2">
            <Label>Select Riders</Label>
            <div className="h-[150px] border rounded-md overflow-y-auto p-2 space-y-1">
              {riders.map(rider => (
                <div 
                  key={rider.id} 
                  className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${selectedRiders.includes(rider.id) ? 'bg-blue-50 border border-blue-200' : ''}`}
                  onClick={() => handleToggleRider(rider.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedRiders.includes(rider.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                       {selectedRiders.includes(rider.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-medium">{rider.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{rider.existingHours}h today</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedRiders.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Shifts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
