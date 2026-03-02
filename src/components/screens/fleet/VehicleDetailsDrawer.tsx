import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Vehicle } from "./fleetApi";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  Gauge, 
  Activity,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface VehicleDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

export function VehicleDetailsDrawer({ isOpen, onClose, vehicle }: VehicleDetailsDrawerProps) {
  if (!vehicle) return null;

  const isDocValid = (dateStr: string) => new Date(dateStr) > new Date();
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex justify-between items-start">
            <div>
               <SheetTitle className="text-xl font-bold">{vehicle.vehicleId}</SheetTitle>
               <SheetDescription>{vehicle.type} • {vehicle.fuelType}</SheetDescription>
            </div>
            <Badge 
              variant="outline" 
              className={
                vehicle.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                vehicle.status === 'maintenance' ? 'bg-red-50 text-red-700 border-red-200' : 
                'bg-gray-100 text-gray-700 border-gray-200'
              }
            >
              {vehicle.status.toUpperCase()}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
               <div className="flex items-center gap-2 text-gray-500 mb-1">
                 <Gauge size={14} />
                 <span className="text-xs font-medium">Odometer</span>
               </div>
               <p className="font-mono text-lg font-bold text-gray-900">{vehicle.currentOdometerKm.toLocaleString()} km</p>
             </div>
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
               <div className="flex items-center gap-2 text-gray-500 mb-1">
                 <Activity size={14} />
                 <span className="text-xs font-medium">Condition</span>
               </div>
               <div className="flex items-baseline gap-2">
                 <p className="font-bold text-lg text-gray-900">{vehicle.conditionScore}/100</p>
                 <span className="text-xs text-gray-500">({vehicle.conditionLabel})</span>
               </div>
             </div>
          </div>

          <Separator />

          {/* Assignment & Location */}
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} /> Assignment & Location
            </h4>
            <div className="space-y-3 pl-6">
               <div className="grid grid-cols-3 text-sm">
                 <span className="text-gray-500">Assigned Rider</span>
                 <span className="col-span-2 font-medium text-gray-900">
                    {vehicle.assignedRiderName || "Unassigned"}
                 </span>
               </div>
               <div className="grid grid-cols-3 text-sm">
                 <span className="text-gray-500">Current Pool</span>
                 <span className="col-span-2 font-medium text-gray-900">{vehicle.pool}</span>
               </div>
               <div className="grid grid-cols-3 text-sm">
                 <span className="text-gray-500">Hub Location</span>
                 <span className="col-span-2 font-medium text-gray-900">{vehicle.location || "N/A"}</span>
               </div>
            </div>
          </div>

          <Separator />

          {/* Utilization */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm text-gray-900">Utilization (Last 30 Days)</h4>
              <span className="font-bold text-sm">{vehicle.utilizationPercent}%</span>
            </div>
            <Progress value={vehicle.utilizationPercent} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">Based on active duty hours vs available hours.</p>
          </div>

          <Separator />

          {/* Maintenance & Documents */}
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={16} /> Documents & Compliance
            </h4>
            <div className="space-y-3 pl-1">
              {[
                { label: "RC Validity", date: vehicle.documents.rcValidTill },
                { label: "Insurance", date: vehicle.documents.insuranceValidTill },
                { label: "PUC", date: vehicle.documents.pucValidTill }
              ].map((doc, i) => {
                 if (!doc.date) return null;
                 const valid = isDocValid(doc.date);
                 return (
                   <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                     <div className="flex items-center gap-3">
                        {valid ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                        <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                     </div>
                     <span className={`text-xs ${valid ? "text-gray-500" : "text-red-600 font-bold"}`}>
                       Exp: {new Date(doc.date).toLocaleDateString()}
                     </span>
                   </div>
                 );
              })}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
             <h4 className="text-orange-800 font-bold text-sm mb-2 flex items-center gap-2">
               <Calendar size={16} /> Next Service Due
             </h4>
             <p className="text-sm text-orange-700">
               {new Date(vehicle.nextServiceDueDate).toLocaleDateString()}
             </p>
             <p className="text-xs text-orange-600 mt-1">
               Approx. {Math.ceil((new Date(vehicle.nextServiceDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
             </p>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
