import React from 'react';
import { Zone } from './types';
import { Button } from "../../../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../ui/sheet";
import { X } from 'lucide-react';

interface HeatmapDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Zone[];
}

export function HeatmapDetailsDrawer({ isOpen, onClose, zones }: HeatmapDetailsDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">Promo Heatmap Details</SheetTitle>
              <SheetDescription>Last 30 Days • All Campaigns</SheetDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-4">
          {zones.map((zone) => {
            const revenue = zone.areaSqKm ? `₹${(zone.areaSqKm * 1000).toFixed(1)}k` : '₹0';
            const percentage = zone.areaSqKm ? Math.min(100, (zone.areaSqKm / 20) * 100) : 0;
            const color = zone.color === '#10B981' ? 'bg-red-500' : 
                         zone.color === '#3B82F6' ? 'bg-orange-400' : 
                         'bg-yellow-400';
            
            return (
              <div key={zone.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{zone.name}</span>
                  <span className="font-bold text-green-600">{revenue}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t mt-6">
            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Metric</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="h-7 text-xs">Revenue</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Redemptions</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Orders</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
