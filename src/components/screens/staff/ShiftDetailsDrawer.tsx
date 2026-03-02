import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shift, updateShiftStatus } from "./shiftsApi";
import { Loader2, CheckCircle2, AlertCircle, Clock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShiftDetailsDrawerProps {
  shift: Shift | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function ShiftDetailsDrawer({ shift, onClose, onUpdate }: ShiftDetailsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [overtime, setOvertime] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (shift) {
      setOvertime(shift.overtimeMinutes || 0);
      setNotes("");
    }
  }, [shift]);

  if (!shift) return null;

  const handleStatusUpdate = async (status: Shift['status']) => {
    setLoading(true);
    try {
      const updates: any = { status };
      
      if (status === 'active') {
        updates.checkInTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } else if (status === 'completed') {
        updates.checkOutTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }

      await updateShiftStatus(shift.id, updates);
      toast.success(`Shift marked as ${status}`);
      onUpdate();
      onClose();
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleOvertimeRequest = async () => {
    setLoading(true);
    try {
      await updateShiftStatus(shift.id, { overtimeMinutes: overtime });
      toast.success("Overtime request submitted");
      onUpdate();
    } catch (e) {
      toast.error("Failed to submit overtime");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Active Now</Badge>;
      case 'scheduled': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Scheduled</Badge>;
      case 'completed': return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200">Completed</Badge>;
      case 'absent': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Absent</Badge>;
      case 'late': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Late</Badge>;
      default: return null;
    }
  };

  return (
    <Sheet open={!!shift} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
             Shift Details {getStatusBadge(shift.status)}
          </SheetTitle>
          <SheetDescription>
            Manage shift timing, status, and overtime for {shift.riderName}.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Rider Info */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-500">
               <User size={24} />
             </div>
             <div>
               <h3 className="font-bold text-gray-900">{shift.riderName}</h3>
               <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {shift.hub}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {shift.date}</span>
               </div>
             </div>
          </div>

          {/* Time & Attendance */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <Label className="text-gray-500">Scheduled Time</Label>
               <div className="text-lg font-mono font-medium">{shift.startTime} - {shift.endTime}</div>
             </div>
             <div className="space-y-1">
               <Label className="text-gray-500">Actual Time</Label>
               <div className="text-lg font-mono font-medium">
                 {shift.checkInTime || "--:--"} - {shift.checkOutTime || "--:--"}
               </div>
             </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
             <Label>Quick Actions</Label>
             <div className="flex flex-wrap gap-2">
               {shift.status === 'scheduled' && (
                 <>
                   <Button size="sm" onClick={() => handleStatusUpdate('active')} className="bg-green-600 hover:bg-green-700 text-white">
                     <CheckCircle2 size={16} className="mr-2" /> Check In
                   </Button>
                   <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('absent')} className="text-red-600 hover:bg-red-50">
                     Mark Absent
                   </Button>
                 </>
               )}
               {shift.status === 'active' && (
                 <Button size="sm" onClick={() => handleStatusUpdate('completed')} className="bg-gray-900 text-white hover:bg-black">
                   <Clock size={16} className="mr-2" /> Check Out
                 </Button>
               )}
               {shift.status === 'absent' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('scheduled')}>
                    Reset to Scheduled
                  </Button>
               )}
             </div>
          </div>

          {/* Overtime */}
          <div className="border-t pt-6 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
               Overtime Management
               {shift.overtimeMinutes ? <Badge variant="secondary">{shift.overtimeMinutes}m Requested</Badge> : null}
            </h4>
            
            <div className="flex items-end gap-4">
               <div className="space-y-2 flex-1">
                 <Label>Additional Minutes</Label>
                 <Input 
                   type="number" 
                   min="0" 
                   value={overtime} 
                   onChange={(e) => setOvertime(parseInt(e.target.value) || 0)} 
                 />
               </div>
               <Button variant="secondary" onClick={handleOvertimeRequest} disabled={loading}>
                 Request Approval
               </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Reason for overtime or shift change..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
