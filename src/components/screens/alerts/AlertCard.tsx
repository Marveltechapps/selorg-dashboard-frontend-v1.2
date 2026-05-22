import React, { useState } from "react";
import { Alert, AlertActionPayload } from "@/api/alerts/alertsApi";
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone, 
  UserX, 
  Truck, 
  PackageX, 
  MoreHorizontal,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alert: Alert;
  onAction: (id: string, payload: AlertActionPayload) => void;
  isLoading?: boolean;
}

export function AlertCard({ alert, onAction, isLoading = false }: AlertCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  
  // Define styles based on priority
  const priorityStyles = {
    critical: "bg-red-50 border-l-4 border-l-red-500",
    high: "bg-orange-50 border-l-4 border-l-orange-500",
    medium: "bg-yellow-50 border-l-4 border-l-yellow-400",
    low: "bg-blue-50 border-l-4 border-l-blue-400",
  };

  const getIcon = () => {
    switch (alert.type) {
      case "sla_breach": return <Clock className="text-red-600" />;
      case "rider_no_show": return <UserX className="text-orange-600" />;
      case "delayed_delivery": return <Truck className="text-yellow-600" />;
      case "zone_deviation": return <MapPin className="text-blue-600" />;
      case "vehicle_breakdown": return <AlertTriangle className="text-red-600" />;
      case "rto_return": return <PackageX className="text-purple-600" />;
      default: return <AlertTriangle className="text-gray-600" />;
    }
  };

  const renderActionButtons = () => {
    return alert.actionsSuggested.map((action) => {
      switch (action) {
        case "notify_customer":
          return (
            <Button 
              key={action} 
              size="sm" 
              variant="outline" 
              className="bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => onAction(alert.id, { actionType: "notify_customer" })}
              disabled={isLoading}
            >
              Notify Customer
            </Button>
          );
        case "reassign_rider":
          return (
            <Button 
              key={action} 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onAction(alert.id, { actionType: "reassign_rider" })}
              disabled={isLoading}
            >
              Re-assign
            </Button>
          );
        case "call_rider":
          return (
            <Button 
              key={action} 
              size="sm" 
              variant="outline"
              className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={() => onAction(alert.id, { actionType: "call_rider" })}
              disabled={isLoading}
            >
              <Phone size={14} className="mr-1" /> Call Rider
            </Button>
          );
        case "view_location":
          return (
            <Button 
              key={action} 
              size="sm" 
              variant="outline"
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => onAction(alert.id, { actionType: "view_location" })}
              disabled={isLoading}
            >
              <MapPin size={14} className="mr-1" /> Location
            </Button>
          );
        case "mark_offline":
          return (
            <Button 
               key={action}
               size="sm"
               variant="secondary"
               onClick={() => onAction(alert.id, { actionType: "mark_offline" })}
               disabled={isLoading}
            >
              Mark Offline
            </Button>
          );
        default:
          return null;
      }
    });
  };

  return (
    <div className={cn("p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md", priorityStyles[alert.priority])}>
      <div className="flex-shrink-0 mt-1">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-sm md:text-base">{alert.title}</h3>
              <Badge variant="outline" className="bg-white/50 border-gray-300 text-xs font-normal">
                {alert.status.replace("_", " ").toUpperCase()}
              </Badge>
              {alert.priority === 'critical' && <Badge className="bg-red-600 hover:bg-red-600">CRITICAL</Badge>}
            </div>
            <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                 <Clock size={12} /> {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </span>
              {alert.source.riderName && <span>Rider: <strong>{alert.source.riderName}</strong></span>}
              {alert.source.orderId && <span>Order: <strong>#{alert.source.orderId}</strong></span>}
              {alert.source.vehicleId && <span>Vehicle: <strong>{alert.source.vehicleId}</strong></span>}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" disabled={isLoading}>
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onAction(alert.id, { actionType: "acknowledge" })}
                disabled={isLoading}
              >
                Acknowledge
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onAction(alert.id, { actionType: "add_note" })}
                disabled={isLoading}
              >
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "Hide History" : "View History"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                 className="text-green-600 focus:text-green-700"
                 onClick={() => onAction(alert.id, { actionType: "resolve" })}
                 disabled={isLoading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {renderActionButtons()}
        </div>

        {/* Timeline Section */}
        <div className="mt-3 min-w-0 pt-3 border-t border-gray-200/50">
          {!showHistory ? (
            alert.timeline.length > 0 && (
              <div 
                className="text-xs text-gray-500 flex items-center justify-between cursor-pointer hover:text-gray-700 transition-colors"
                onClick={() => setShowHistory(true)}
              >
                 <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                   <MessageSquare size={12} className="mt-0.5 shrink-0" />
                   <span className="italic text-gray-600 line-clamp-2 break-words leading-relaxed">
                     Latest: {alert.timeline[alert.timeline.length-1].note || `Status changed to ${alert.timeline[alert.timeline.length-1].status}`}
                   </span>
                 </div>
                 <ChevronDown size={14} className="ml-2 flex-shrink-0" />
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between cursor-pointer mb-2"
                onClick={() => setShowHistory(false)}
              >
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> Action History
                </span>
                <ChevronUp size={14} className="text-gray-400" />
              </div>
              
              <div className="relative ml-1 pl-5 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                {[...alert.timeline].reverse().map((entry, idx) => (
                  <div key={idx} className="relative min-w-0">
                    <div
                      className="absolute -left-[13px] top-1.5 z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-white"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-900">
                          {entry.status.replace(/_/g, " ")}
                        </span>
                        <span className="shrink-0 text-[10px] text-gray-500">
                          {format(new Date(entry.at), "HH:mm:ss, MMM d")}
                        </span>
                      </div>
                      {entry.note ? (
                        <p className="text-xs leading-relaxed text-gray-700 break-words">
                          {entry.note}
                        </p>
                      ) : null}
                      {entry.actor ? (
                        <div className="flex items-center gap-1">
                          <User size={10} className="shrink-0 text-gray-400" />
                          <span className="text-[10px] font-medium text-gray-500 break-words">
                            {entry.actor}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

