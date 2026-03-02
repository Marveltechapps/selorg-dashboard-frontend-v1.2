import React from 'react';
import { Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import { Zone } from './types';
import { Button } from '../../../ui/button';
import { Checkbox } from '../../../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";

interface ZoneControlsProps {
  zones: Zone[];
  onToggleVisibility: (id: string) => void;
  onZoneClick: (zone: Zone) => void;
  onEditZone: (zone: Zone) => void;
  onArchiveZone: (zone: Zone) => void;
}

export function ZoneControls({ 
  zones, 
  onToggleVisibility, 
  onZoneClick,
  onEditZone,
  onArchiveZone
}: ZoneControlsProps) {
  return (
    <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-[#E0E0E0] w-72 z-[20] max-h-[calc(100%-2rem)] overflow-y-auto">
      <h3 className="font-bold text-[#212121] mb-4 text-sm uppercase tracking-wide">Zone Controls</h3>
      <div className="space-y-3">
        {zones.map((zone) => {
          const zoneId = (zone as any)._id || zone.id;
          return (
            <div 
              key={zoneId} 
              className="flex items-center justify-between group p-1.5 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                 <Checkbox 
                  checked={zone.isVisible} 
                  onCheckedChange={() => onToggleVisibility(zoneId)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  style={{ '--primary': zone.color } as React.CSSProperties}
                />
                <button 
                  onClick={() => onZoneClick(zone)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">
                    {zone.name}
                  </span>
                </button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditZone(zone)}>Edit Zone</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onZoneClick(zone)}>View Details</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => onArchiveZone(zone)}>Archive Zone</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {zones.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            No zones created yet.
          </div>
        )}
      </div>
    </div>
  );
}
