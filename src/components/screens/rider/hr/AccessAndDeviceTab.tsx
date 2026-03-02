import React, { useState } from "react";
import { Rider } from "./types";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Smartphone, Ban, CheckCircle } from "lucide-react";
import { updateRiderAccess } from "./hrApi";
import { toast } from "sonner";

interface AccessAndDeviceTabProps {
  riders: Rider[];
  loading: boolean;
  onRefresh: () => void;
  onAccessUpdated?: (riderId: string, access: "enabled" | "disabled") => void;
}

export function AccessAndDeviceTab({ riders, loading, onRefresh, onAccessUpdated }: AccessAndDeviceTabProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggleAccess = async (riderId: string, currentStatus: "enabled" | "disabled") => {
    const newStatus = currentStatus === "enabled" ? "disabled" : "enabled";
    setUpdating(riderId);
    
    // Optimistic update - update UI immediately
    onAccessUpdated?.(riderId, newStatus);
    
    try {
      await updateRiderAccess(riderId, newStatus);
      toast.success(`Access ${newStatus}`);
      // Background refresh to sync with server (non-blocking)
      onRefresh().catch(() => {});
    } catch (err) {
      // Revert optimistic update on error
      onAccessUpdated?.(riderId, currentStatus);
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">App Access & Device Management</h3>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-[#F5F7FA]">
            <TableRow>
              <TableHead>Rider Name</TableHead>
              <TableHead>Device Status</TableHead>
              <TableHead>App Access</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
               </TableRow>
            ) : riders.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-8 text-gray-500">No riders found</TableCell>
               </TableRow>
            ) : (
              riders.map((rider) => (
                <TableRow key={rider.id}>
                  <TableCell className="font-medium">
                    {rider.name}
                    <div className="text-xs text-gray-500">{rider.phone}</div>
                  </TableCell>
                  <TableCell>
                    {rider.deviceAssigned ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                        <Smartphone size={12} /> Assigned
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">No Device</span>
                    )}
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2">
                       <Switch 
                         checked={rider.appAccess === "enabled"} 
                         onCheckedChange={() => handleToggleAccess(rider.id, rider.appAccess)}
                         disabled={updating === rider.id}
                       />
                       <span className={`text-sm font-medium ${rider.appAccess === 'enabled' ? 'text-green-600' : 'text-gray-500'}`}>
                         {rider.appAccess === 'enabled' ? 'Active' : 'Disabled'}
                       </span>
                     </div>
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {rider.appAccess === 'enabled' ? (
                       <CheckCircle size={16} className="ml-auto text-green-500" />
                    ) : (
                       <Ban size={16} className="ml-auto text-gray-300" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
