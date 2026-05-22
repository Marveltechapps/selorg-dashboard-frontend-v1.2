import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Vehicle,
  VehicleStatus,
  PoolType,
  MaintenanceType,
  FleetApiError,
  dateInputToIso,
  todayDateInputValue,
} from "./fleetApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface VehicleManageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onUpdate: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  onScheduleMaintenance: (task: any) => Promise<void>;
}

export function VehicleManageDrawer({ 
  isOpen, 
  onClose, 
  vehicle, 
  onUpdate, 
  onScheduleMaintenance 
}: VehicleManageDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("assignment");

  // Form States
  const [status, setStatus] = useState<VehicleStatus>("active");
  const [pool, setPool] = useState<PoolType>("Hub");
  const [riderName, setRiderName] = useState("unassign"); // Use "unassign" instead of empty string
  const [maintType, setMaintType] = useState<MaintenanceType>("Scheduled Service");
  const [maintDate, setMaintDate] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  const [serviceErrors, setServiceErrors] = useState<{ scheduledDate?: string; type?: string; general?: string }>({});

  const tomorrowDateInputValue = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  // Sync state when vehicle opens
  React.useEffect(() => {
    if (vehicle) {
      setStatus(vehicle.status);
      setPool(vehicle.pool);
      // Convert empty string to "unassign" for Select component
      setRiderName(vehicle.assignedRiderName || "unassign");
      setMaintDate(tomorrowDateInputValue());
      setMaintNotes("");
      setServiceErrors({});
    }
  }, [vehicle, isOpen]);

  const handleSaveStatus = async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      await onUpdate(vehicle.id, { status, pool });
      toast.success("Vehicle status updated");
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRider = async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      // Handle "unassign" value - convert to empty string for unassignment
      const actualRiderName = riderName === "unassign" ? "" : riderName;
      await onUpdate(vehicle.id, { 
        assignedRiderName: actualRiderName, 
        assignedRiderId: actualRiderName ? "r-mock" : undefined 
      });
      toast.success(actualRiderName ? "Rider assigned" : "Rider unassigned");
      // Update local state to reflect the actual value
      if (actualRiderName === "") {
        setRiderName("unassign");
      }
    } catch (e) {
      toast.error("Failed to update assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleService = async () => {
    if (!vehicle) return;

    const errors: { scheduledDate?: string; type?: string; general?: string } = {};
    if (!maintDate.trim()) {
      errors.scheduledDate = "Scheduled date is required";
    } else if (maintDate < todayDateInputValue()) {
      errors.scheduledDate = "Scheduled date cannot be in the past";
    }
    if (!["Scheduled Service", "Breakdown", "Inspection"].includes(maintType)) {
      errors.type = "Select a valid maintenance type";
    }
    if (Object.keys(errors).length > 0) {
      setServiceErrors(errors);
      return;
    }
    setServiceErrors({});

    setLoading(true);
    try {
      const scheduledDate = dateInputToIso(maintDate);
      await onScheduleMaintenance({
        vehicleId: vehicle.vehicleId,
        vehicleInternalId: vehicle.id,
        type: maintType,
        scheduledDate,
        notes: maintNotes.trim() || undefined,
      });
      toast.success("Maintenance scheduled successfully");
      if (maintType === "Breakdown") {
        try {
          await onUpdate(vehicle.id, { status: "maintenance" });
        } catch (statusErr) {
          const msg = statusErr instanceof Error ? statusErr.message : "Could not update vehicle status";
          toast.warning(`Service scheduled, but status was not set to maintenance: ${msg}`);
        }
      }
      setMaintDate(tomorrowDateInputValue());
      setMaintNotes("");
      onClose();
    } catch (e) {
      if (e instanceof FleetApiError) {
        setServiceErrors({
          scheduledDate: e.fieldErrors.scheduledDate,
          type: e.fieldErrors.type,
          general: e.fieldErrors.vehicleId || e.message,
        });
        toast.error(e.message);
      } else {
        const errorMessage = e instanceof Error ? e.message : "Failed to schedule service";
        setServiceErrors({ general: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] z-[100] overflow-y-auto px-6 pb-6 pt-6">
        <SheetHeader className="pb-6 p-0">
          <SheetTitle>Manage {vehicle?.vehicleId ?? 'Vehicle'}</SheetTitle>
          <SheetDescription>Update status, pool, assignment, or schedule service.</SheetDescription>
        </SheetHeader>
        {!vehicle ? (
          <p className="py-8 text-center text-muted-foreground">No vehicle selected. Close and try again.</p>
        ) : (
        <>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status & Pool</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
          </TabsList>

          {/* STATUS TAB */}
          <TabsContent value="status" className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Current Status</Label>
               <Select value={status} onValueChange={(v: VehicleStatus) => setStatus(v)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="active">Active</SelectItem>
                   <SelectItem value="maintenance">Maintenance</SelectItem>
                   <SelectItem value="inactive">Inactive</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-2">
               <Label>Fleet Pool</Label>
               <Select value={pool} onValueChange={(v: PoolType) => setPool(v)}>
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

             <Button onClick={handleSaveStatus} disabled={loading} className="w-full mt-4">
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Save Changes
             </Button>
          </TabsContent>

          {/* ASSIGNMENT TAB */}
          <TabsContent value="assignment" className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Assigned Rider</Label>
               <Select value={riderName || "unassign"} onValueChange={setRiderName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">-- Unassign --</SelectItem>
                    <SelectItem value="Rider 1">Rider 1 (John Doe)</SelectItem>
                    <SelectItem value="Rider 2">Rider 2 (Jane Smith)</SelectItem>
                    <SelectItem value="Rider 3">Rider 3 (Mike Ross)</SelectItem>
                    <SelectItem value="Rider 4">Rider 4 (Rachel Zane)</SelectItem>
                  </SelectContent>
               </Select>
               <p className="text-xs text-gray-500">
                 Assigning a rider will automatically move this vehicle to the "Dedicated" pool if not already.
               </p>
             </div>

             <Button onClick={handleAssignRider} disabled={loading} className="w-full mt-4">
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Update Assignment
             </Button>
          </TabsContent>

          {/* SERVICE TAB */}
          <TabsContent value="service" className="space-y-4 py-4">
             {serviceErrors.general && (
               <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
                 {serviceErrors.general}
               </p>
             )}
             <div className="space-y-2">
               <Label htmlFor="maint-type">Maintenance Type</Label>
               <Select
                 value={maintType}
                 onValueChange={(v: MaintenanceType) => {
                   setMaintType(v);
                   setServiceErrors((prev) => ({ ...prev, type: undefined }));
                 }}
               >
                 <SelectTrigger id="maint-type" aria-invalid={!!serviceErrors.type}>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Scheduled Service">Scheduled Service</SelectItem>
                   <SelectItem value="Breakdown">Breakdown</SelectItem>
                   <SelectItem value="Inspection">Inspection</SelectItem>
                 </SelectContent>
               </Select>
               {serviceErrors.type && (
                 <p className="text-xs text-red-600">{serviceErrors.type}</p>
               )}
             </div>

             <div className="space-y-2">
               <Label htmlFor="maint-date">Scheduled Date</Label>
               <Input
                 id="maint-date"
                 type="date"
                 min={todayDateInputValue()}
                 value={maintDate}
                 aria-invalid={!!serviceErrors.scheduledDate}
                 onChange={(e) => {
                   setMaintDate(e.target.value);
                   setServiceErrors((prev) => ({ ...prev, scheduledDate: undefined }));
                 }}
               />
               {serviceErrors.scheduledDate && (
                 <p className="text-xs text-red-600">{serviceErrors.scheduledDate}</p>
               )}
             </div>

             <div className="space-y-2">
               <Label htmlFor="maint-notes">Notes</Label>
               <Textarea
                 id="maint-notes"
                 placeholder="Describe issue or service required..."
                 value={maintNotes}
                 onChange={(e) => setMaintNotes(e.target.value)}
               />
             </div>

             <Button type="button" onClick={handleScheduleService} disabled={loading} className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Schedule Maintenance
             </Button>
          </TabsContent>
        </Tabs>
        </>
        )}
      </SheetContent>
    </Sheet>
  );
}
