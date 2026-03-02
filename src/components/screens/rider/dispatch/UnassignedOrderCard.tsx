import React from "react";
import { DispatchOrder } from "./types";
import { Navigation, Clock, MapPin, CheckSquare, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface UnassignedOrderCardProps {
  order: DispatchOrder;
  onAssign: (order: DispatchOrder) => void;
  onViewDetail?: (order: DispatchOrder) => void;
  isBatchMode: boolean;
  isSelected: boolean;
  onToggleSelect: (orderId: string) => void;
}

export function UnassignedOrderCard({
  order,
  onAssign,
  onViewDetail,
  isBatchMode,
  isSelected,
  onToggleSelect,
}: UnassignedOrderCardProps) {
  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-red-100 text-red-700 hover:bg-red-100";
      case "medium": return "bg-orange-100 text-orange-700 hover:bg-orange-100";
      default: return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    }
  };

  return (
    <div 
      className={`p-3 bg-white border rounded-lg shadow-sm transition-all group relative ${
        isSelected ? "border-[#F97316] bg-orange-50" : "border-[#E0E0E0] hover:border-[#F97316]"
      }`}
      onClick={() => isBatchMode && onToggleSelect(order.id)}
    >
      {isBatchMode && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => onToggleSelect(order.id)}
            className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
          />
        </div>
      )}

      <div className={`${isBatchMode ? "pl-8" : ""}`}>
        <div className="flex justify-between mb-2">
          <span className="font-bold text-[#212121]">{order.id}</span>
          <Badge className={`${getPriorityColor(order.priority)} border-0`}>
            {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)} Priority
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-[#616161] mb-2">
          <div className="flex items-center gap-1">
            <Navigation size={12} />
            <span>{order.distanceKm} km</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{order.etaMinutes} mins ETA</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#616161] mb-3">
            <MapPin size={12} className="text-gray-400" />
            <span className="truncate max-w-[200px]">{order.dropLocation.address}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-[#F5F5F5]">
          <span className="text-xs text-[#757575] bg-gray-100 px-2 py-1 rounded">{order.zone}</span>
          {!isBatchMode && (
            <div className="flex items-center gap-2">
              {onViewDetail && (
                <Button 
                  variant="ghost" 
                  className="text-xs font-bold text-gray-500 h-auto p-0 hover:bg-transparent hover:underline"
                  onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}
                >
                  <Eye size={12} className="mr-1" /> View
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="text-xs font-bold text-[#F97316] h-auto p-0 hover:bg-transparent hover:underline"
                onClick={(e) => { e.stopPropagation(); onAssign(order); }}
              >
                Assign Rider
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
