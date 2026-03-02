import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '../../../../components/ui/dialog';
import { Rider } from './types';
import { MapPin, Navigation } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';

interface RiderMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  riders: Rider[];
}

export function RiderMapModal({ isOpen, onClose, riders }: RiderMapModalProps) {
  // Simple grid for mock map
  const gridSize = 10;
  
  const getRiderAtGrid = (x: number, y: number) => {
    // Deterministic placement for demo
    // We use a simple hash of coordinates to place riders
    const index = (x * gridSize + y) % (riders.length * 3);
    if (index < riders.length) return riders[index];
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] w-full">
        <DialogHeader>
          <DialogTitle>Live Fleet Map</DialogTitle>
          <DialogDescription>
            Real-time positions of all active riders.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-gray-50 border rounded-lg h-[500px] relative overflow-hidden flex items-center justify-center p-4">
            {/* Map Grid Background */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-20 pointer-events-none">
                {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-gray-300"></div>
                ))}
            </div>
            
            <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 text-xs">
                 <div className="font-bold mb-1">Status Key</div>
                 <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Idle</div>
                 <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Busy</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div> Offline</div>
            </div>

            {/* Render Riders */}
            <div className="relative w-full h-full">
                 {riders.map((rider, i) => {
                     // Generate random position for each rider
                     const top = `${20 + (i * 17) % 60}%`;
                     const left = `${10 + (i * 23) % 80}%`;
                     
                     const color = rider.status === 'idle' ? 'bg-green-500' : rider.status === 'busy' ? 'bg-orange-500' : 'bg-gray-400';
                     
                     return (
                        <TooltipProvider key={rider.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div 
                                        className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform flex items-center justify-center ${color}`}
                                        style={{ top, left }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs">
                                        <p className="font-bold">{rider.name}</p>
                                        <p className="text-gray-500 capitalize">{rider.status}</p>
                                        {rider.currentOrderId && <p className="text-blue-500">Order #{rider.currentOrderId}</p>}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                     );
                 })}
                 
                 {/* Mock Store Location */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                     <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg z-20 animate-pulse">
                         <Navigation size={24} fill="currentColor" />
                     </div>
                     <span className="bg-white px-2 py-0.5 rounded text-xs font-bold shadow mt-1">HUB</span>
                 </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
