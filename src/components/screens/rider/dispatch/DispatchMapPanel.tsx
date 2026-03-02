import React, { useState, useRef, useEffect } from "react";
import { DispatchOrder, DispatchRider } from "./types";
import { Layers, Map, Navigation, User, Package, Maximize2, Minus, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DispatchMapPanelProps {
  orders: DispatchOrder[];
  riders: DispatchRider[];
  loading: boolean;
}

export function DispatchMapPanel({ orders, riders, loading }: DispatchMapPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  
  // Layers
  const [showRiders, setShowRiders] = useState(true);
  const [showOrders, setShowOrders] = useState(true);

  const mapWidth = 800;
  const mapHeight = 600;

  // Dynamic projection from real map data bounds
  const getProjection = () => {
    const allPoints: { lat: number; lng: number }[] = [];
    riders.forEach((r) => allPoints.push(r.currentLocation));
    orders.forEach((o) => {
      if (o.pickupLocation.lat !== 0 || o.pickupLocation.lng !== 0) allPoints.push(o.pickupLocation);
      if (o.dropLocation.lat !== 0 || o.dropLocation.lng !== 0) allPoints.push(o.dropLocation);
    });
    if (allPoints.length === 0) {
      const centerLat = 40.75;
      const centerLng = -74;
      const pad = 0.02;
      return (lat: number, lng: number) => ({
        x: ((lng - (centerLng - pad)) / (pad * 2)) * mapWidth,
        y: ((centerLat + pad - lat) / (pad * 2)) * mapHeight,
      });
    }
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.005);
    const padLng = Math.max((maxLng - minLng) * 0.15, 0.005);
    const rangeLat = maxLat - minLat + padLat * 2 || 0.02;
    const rangeLng = maxLng - minLng + padLng * 2 || 0.02;
    return (lat: number, lng: number) => ({
      x: ((lng - (minLng - padLng)) / rangeLng) * mapWidth,
      y: ((maxLat + padLat - lat) / rangeLat) * mapHeight,
    });
  };
  const project = getProjection();

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev * 0.8, 0.5));

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm relative h-[600px] flex flex-col">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-[#E0E0E0] shadow-sm flex flex-col gap-1">
          <button 
            className={`p-2 rounded hover:bg-gray-100 ${showRiders ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
            onClick={() => setShowRiders(!showRiders)}
            title="Toggle Riders"
          >
            <User size={18} />
          </button>
          <button 
            className={`p-2 rounded hover:bg-gray-100 ${showOrders ? 'text-orange-600 bg-orange-50' : 'text-gray-500'}`}
            onClick={() => setShowOrders(!showOrders)}
            title="Toggle Orders"
          >
            <Package size={18} />
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomIn}><Plus size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomOut}><Minus size={18} /></button>
        </div>
      </div>

      {/* Map Stats Overlay */}
      <div className="absolute top-4 left-4 z-10">
         <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#E0E0E0] shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Live Status</div>
            <div className="flex gap-4 text-sm">
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="font-bold text-gray-700">{riders.filter(r => r.status === 'online').length}</span> Online
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-bold text-gray-700">{riders.filter(r => r.status === 'busy').length}</span> Busy
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="font-bold text-gray-700">{orders.filter(o => o.status === 'in_transit').length}</span> In-Transit
               </div>
            </div>
         </div>
      </div>

      {/* The Map */}
      <div className="flex-1 bg-[#F3F4F6] overflow-hidden relative cursor-grab active:cursor-grabbing">
         {/* Background Grid Pattern */}
         <div 
           className="absolute inset-0 opacity-10 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)',
             backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
             transform: `translate(${offset.x}px, ${offset.y}px)`,
           }}
         />
         
         <div 
           className="w-full h-full relative transition-transform duration-200 ease-out"
           style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)` }}
         >
            {/* Draw Orders Paths (Only for assigned/in-transit) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               {showOrders && orders.filter(o => o.status === 'assigned' || o.status === 'in_transit').map(order => {
                 const start = project(order.pickupLocation.lat, order.pickupLocation.lng);
                 const end = project(order.dropLocation.lat, order.dropLocation.lng);
                 const isSelected = selectedOrder === order.id;
                 
                 return (
                   <g key={`path-${order.id}`}>
                     <line 
                       x1={start.x} y1={start.y} 
                       x2={end.x} y2={end.y} 
                       stroke={isSelected ? "#F97316" : "#CBD5E1"} 
                       strokeWidth={isSelected ? 3 : 1.5}
                       strokeDasharray="4"
                     />
                   </g>
                 );
               })}
            </svg>

            {/* Render Riders */}
            {showRiders && riders.map(rider => {
              const pos = project(rider.currentLocation.lat, rider.currentLocation.lng);
              const isSelected = selectedRider === rider.id;
              
              return (
                <TooltipProvider key={rider.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 flex items-center justify-center shadow-md transition-transform hover:scale-110 z-20
                          ${rider.status === 'online' ? 'bg-green-100 border-green-500 text-green-700' : 
                            rider.status === 'busy' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-100 border-gray-400 text-gray-500'}
                          ${isSelected ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}
                        `}
                        style={{ left: pos.x, top: pos.y }}
                        onClick={() => setSelectedRider(rider.id === selectedRider ? null : rider.id)}
                      >
                        <User size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-bold">{rider.name}</p>
                        <p>{rider.status} • {rider.activeOrdersCount} orders</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Render Orders (Pickup/Drop points) */}
            {showOrders && orders.map(order => {
               if (order.status === 'delivered') return null;
               const pPos = project(order.pickupLocation.lat, order.pickupLocation.lng);
               const dPos = project(order.dropLocation.lat, order.dropLocation.lng);
               const isSelected = selectedOrder === order.id;

               return (
                 <React.Fragment key={order.id}>
                   {/* Pickup Marker */}
                   <button
                     className={`absolute w-6 h-6 -ml-3 -mt-3 rounded bg-white border border-gray-400 shadow flex items-center justify-center hover:z-30 z-10
                       ${isSelected ? 'ring-2 ring-orange-500' : ''}
                     `}
                     style={{ left: pPos.x, top: pPos.y }}
                     onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
                   >
                     <div className="w-2 h-2 bg-black rounded-full" />
                   </button>
                   
                   {/* Drop Marker */}
                    <button
                     className={`absolute w-6 h-6 -ml-3 -mt-3 rounded bg-orange-500 border border-white shadow flex items-center justify-center hover:z-30 z-10 text-white
                       ${isSelected ? 'ring-2 ring-orange-800' : ''}
                     `}
                     style={{ left: dPos.x, top: dPos.y }}
                     onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
                   >
                     <MapPinIcon size={12} />
                   </button>
                 </React.Fragment>
               );
            })}
         </div>

         {loading && (
           <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
             <div className="animate-pulse flex flex-col items-center">
               <Map size={48} className="text-gray-300 mb-2" />
               <span className="text-gray-500 font-medium">Loading Map Data...</span>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}

// Simple MapPin Icon component for inside the map
function MapPinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
