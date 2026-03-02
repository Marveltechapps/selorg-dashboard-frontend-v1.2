import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin } from "lucide-react";

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  coords?: { lat: number; lng: number };
}

export function LocationMapModal({ isOpen, onClose, title, coords }: LocationMapModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title || "Location View"}</DialogTitle>
           <DialogDescription>
            Live location of the rider/vehicle.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[400px] w-full bg-gray-100 rounded-md relative flex items-center justify-center overflow-hidden border">
           {/* Mock Map Background */}
           <div className="absolute inset-0 opacity-30" 
                style={{
                    backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}>
           </div>
           
           {/* Map Center Marker */}
           <div className="relative flex flex-col items-center">
             <div className="relative">
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <MapPin size={48} className="text-red-600 drop-shadow-md" fill="currentColor" />
             </div>
             <div className="bg-white px-3 py-1 rounded shadow text-xs font-bold mt-2">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Unknown Location"}
             </div>
           </div>
           
           <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded text-[10px] text-gray-500">
              Mock Map View
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
