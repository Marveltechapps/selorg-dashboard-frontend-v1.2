import React from 'react';
import { Navigation, MapPin, Map as MapIcon, ArrowRight } from 'lucide-react';
import { KPIStats } from './types';
import { Button } from "../../../ui/button";

interface KPICardsProps {
  stats: KPIStats;
  onViewActiveZones: () => void;
  onViewStoresCovered: () => void;
  onViewHeatmap: () => void;
}

export function KPICards({ stats, onViewActiveZones, onViewStoresCovered, onViewHeatmap }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onViewActiveZones}
      >
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-[#212121] flex items-center gap-2">
                <Navigation size={18} className="text-[#7C3AED]" /> Active Zones
            </h3>
            <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-3xl font-bold text-[#212121]">{stats.activeZones}</p>
        <p className="text-xs text-[#757575]">covering {stats.totalArea} sq km</p>
      </div>

      <div 
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onViewStoresCovered}
      >
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-[#212121] flex items-center gap-2">
                <MapPin size={18} className="text-green-600" /> Stores Covered
            </h3>
             <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-3xl font-bold text-[#212121]">{stats.storesFullyCovered} <span className="text-lg text-gray-400 font-normal">/ {stats.storesTotal}</span></p>
        <p className="text-xs text-[#757575]">fully serviceable</p>
      </div>

      <div 
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#7C3AED]/50 transition-colors group"
        onClick={onViewHeatmap}
      >
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-[#212121] flex items-center gap-2">
                <MapIcon size={18} className="text-blue-600" /> Promo Heatmap
            </h3>
             <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex flex-col h-full justify-between">
            <p className="text-sm text-[#757575] mb-2">High redemption in <span className="font-medium text-gray-900">{stats.topPromoZone}</span>.</p>
            <Button 
                variant="link" 
                className="p-0 h-auto text-xs font-bold text-[#7C3AED] self-start"
                onClick={(e) => {
                    e.stopPropagation();
                    onViewHeatmap();
                }}
            >
                View Heatmap Details
            </Button>
        </div>
      </div>
    </div>
  );
}
