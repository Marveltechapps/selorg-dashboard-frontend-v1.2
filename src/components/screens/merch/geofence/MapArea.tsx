import React, { useState, useRef } from 'react';
import { MapPin, Store as StoreIcon } from 'lucide-react';
import { Zone, Store } from './types';
import { cn } from '../../../../lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../../ui/hover-card";
import { Button } from "../../../ui/button";

interface MapAreaProps {
  zones: Zone[];
  stores: Store[];
  onZoneClick: (zone: Zone) => void;
  onStoreClick: (store: Store) => void;
  isDrawing?: boolean;
  drawingPoints?: { x: number; y: number }[];
  onMapClick?: (x: number, y: number) => void;
  showHeatmap?: boolean;
}

export function MapArea({
  zones,
  stores,
  onZoneClick,
  onStoreClick,
  isDrawing = false,
  drawingPoints = [],
  onMapClick,
  showHeatmap = false,
}: MapAreaProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const handleMapClick = (e: React.MouseEvent) => {
    if (!mapRef.current || !onMapClick) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onMapClick(x, y);
  };

  return (
    <div 
      ref={mapRef}
      className={cn(
        "relative w-full h-full bg-gray-100 overflow-hidden select-none",
        isDrawing && "cursor-crosshair"
      )}
      onClick={handleMapClick}
    >
      {/* Background Map Image */}
      <img 
        src="https://images.unsplash.com/photo-1713086246338-3324f106932d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbWFwJTIwdG9wJTIwZG93biUyMHZpZXclMjBsaWdodHxlbnwxfHx8fDE3NjYxMjMwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
        alt="Map" 
        className="absolute inset-0 w-full h-full object-cover opacity-60" 
        style={{ filter: 'grayscale(30%)' }}
      />

      {/* Grid Lines for reference (optional) */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', 
             backgroundSize: '10% 10%',
             opacity: 0.3
           }} 
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Render Zones */}
        {zones.filter(z => z.isVisible).map((zone) => {
          const zoneId = (zone as any)._id || zone.id;
          const pointsStr = zone.points.map(p => `${p.x},${p.y}`).join(' ');
          // Heatmap logic: randomize opacity or color slightly if heatmap is on
          const fillOpacity = showHeatmap ? 0.6 : 0.2;
          const fillColor = showHeatmap 
            ? (zone.name.includes('Downtown') ? '#ef4444' : zone.color) // Mock heatmap hot spot
            : zone.color;

          return (
            <g key={zoneId} className="pointer-events-auto cursor-pointer group" onClick={(e) => { e.stopPropagation(); onZoneClick(zone); }}>
              <polygon
                points={pointsStr}
                fill={fillColor}
                fillOpacity={fillOpacity}
                stroke={zone.color}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300 hover:fill-opacity-40"
              />
            </g>
          );
        })}

        {/* Render Drawing Polygon */}
        {isDrawing && drawingPoints.length > 0 && (
          <g>
            <polygon
              points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="rgba(0,0,0,0.1)"
              stroke="#000"
              strokeWidth="0.5"
              strokeDasharray="1 1"
              vectorEffect="non-scaling-stroke"
            />
            {drawingPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#000" />
            ))}
          </g>
        )}
      </svg>

      {/* Stores Markers (HTML for better interactivity/tooltips) */}
      {stores.map((store) => {
        const storeId = (store as any)._id || store.id;
        return (
          <div
            key={storeId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${store.x}%`, top: `${store.y}%` }}
            onClick={(e) => { e.stopPropagation(); onStoreClick(store); }}
          >
            <HoverCard>
              <HoverCardTrigger asChild>
                  <div className={cn(
                    "cursor-pointer p-1.5 rounded-full shadow-md transition-transform hover:scale-110",
                    store.serviceStatus === 'None' ? "bg-gray-100 text-gray-500" : "bg-white text-blue-600"
                  )}>
                     <StoreIcon size={16} fill="currentColor" className="opacity-20" />
                     <MapPin size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-3 z-50 bg-white">
                  <div className="space-y-2">
                      <h4 className="text-sm font-semibold">{store.name}</h4>
                      <p className="text-xs text-muted-foreground">{store.address}</p>
                      <div className="flex gap-2 text-xs">
                          <span className={cn(
                              "px-1.5 py-0.5 rounded",
                              store.serviceStatus === 'Full' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          )}>
                              {store.serviceStatus} Service
                          </span>
                      </div>
                      <Button 
                          variant="link" 
                          className="h-auto p-0 text-xs text-primary"
                          onClick={(e) => { e.stopPropagation(); onStoreClick(store); }}
                      >
                          View Store Targeting
                      </Button>
                  </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        );
      })}
    </div>
  );
}
