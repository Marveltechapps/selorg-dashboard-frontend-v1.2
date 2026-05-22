import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock } from "lucide-react";
import {
  MaintenanceTask,
  updateMaintenanceTask,
  dateInputToIso,
  todayDateInputValue,
  formatMaintenanceDate,
  FleetApiError,
} from "./fleetApi";

function isoToDateInput(iso: string | undefined): string {
  if (!iso) return todayDateInputValue();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayDateInputValue();
  return d.toISOString().slice(0, 10);
}

interface RescheduleMaintenanceDialogProps {
  task: MaintenanceTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (taskId: string, scheduledDate: string) => void;
}

export function RescheduleMaintenanceDialog({
  task,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleMaintenanceDialogProps) {
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && open) {
      setDate(isoToDateInput(task.scheduledDate));
      setError(null);
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.id) {
      setError("This task cannot be rescheduled (missing task ID).");
      return;
    }
    if (!date.trim()) {
      setError("Please select a new date.");
      return;
    }
    if (date < todayDateInputValue()) {
      setError("Scheduled date cannot be in the past.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const scheduledDate = dateInputToIso(date);
      const updated = await updateMaintenanceTask(task.id, { scheduledDate });
      onSuccess(updated.id, updated.scheduledDate);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof FleetApiError) {
        setError(err.fieldErrors.scheduledDate || err.message);
      } else {
        setError(err instanceof Error ? err.message : "Reschedule failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-orange-600" />
            Reschedule Maintenance
          </DialogTitle>
          <DialogDescription>
            {task ? (
              <>
                Update the service date for <strong>{task.vehicleId || "vehicle"}</strong> (
                {task.type || "service"}). Current date:{" "}
                {formatMaintenanceDate(task.scheduledDate)}.
              </>
            ) : (
              "Select a new scheduled date."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">New scheduled date</Label>
            <Input
              id="reschedule-date"
              type="date"
              min={todayDateInputValue()}
              value={date}
              aria-invalid={!!error}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save new date
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
