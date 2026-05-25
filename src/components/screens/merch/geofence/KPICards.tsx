import React from 'react';
import { Navigation, MapPin, Map as MapIcon, ArrowRight, Loader2 } from 'lucide-react';
import { KPIStats, TopPromoMetric } from './types';
import { Button } from "../../../ui/button";

interface KPICardsProps {
  stats: KPIStats;
  loading?: boolean;
  onViewActiveZones: () => void;
  onViewStoresCovered: () => void;
  onViewHeatmap: () => void;
}

function promoSubtitle(metric: TopPromoMetric, zoneName: string, value: number, days: number): string {
  if (zoneName === '—' || !zoneName) {
    return `No promo activity in the last ${days} days.`;
  }
  if (value <= 0) {
    return `Top zone by coverage: ${zoneName}.`;
  }
  if (metric === 'revenue') {
    const formatted = value >= 1000 ? `₹${(value / 1000).toFixed(1)}k` : `₹${Math.round(value).toLocaleString()}`;
    return `Highest revenue (${formatted}) in ${zoneName}.`;
  }
  if (metric === 'orders') {
    return `Most orders (${value.toLocaleString()}) in ${zoneName}.`;
  }
  return `Highest redemptions (${value.toLocaleString()}) in ${zoneName}.`;
}

export function KPICards({
  stats,
  loading = false,
  onViewActiveZones,
  onViewStoresCovered,
  onViewHeatmap,
}: KPICardsProps) {
  const heatmapDays = stats.heatmapDays ?? 30;
  const areaLabel = Number.isFinite(stats.totalArea)
    ? stats.totalArea.toFixed(2)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        role="button"
        tabIndex={0}
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#7C3AED]/50 transition-colors group"
        onClick={onViewActiveZones}
        onKeyDown={(e) => e.key === 'Enter' && onViewActiveZones()}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-[#212121] flex items-center gap-2">
            <Navigation size={18} className="text-[#7C3AED]" /> Active Zones
          </h3>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <p className="text-3xl font-bold text-[#212121]">{stats.activeZones}</p>
        <p className="text-xs text-[#757575]">
          {stats.totalZones} total · covering {areaLabel} km²
          {stats.inactiveZones > 0 ? ` · ${stats.inactiveZones} inactive` : ''}
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onViewStoresCovered}
        onKeyDown={(e) => e.key === 'Enter' && onViewStoresCovered()}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-[#212121] flex items-center gap-2">
            <MapPin size={18} className="text-green-600" /> Stores Covered
          </h3>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <p className="text-3xl font-bold text-[#212121]">
          {stats.storesFullyCovered}{' '}
          <span className="text-lg text-gray-400 font-normal">/ {stats.storesTotal}</span>
        </p>
        <p className="text-xs text-[#757575]">
          fully serviceable
          {stats.storesPartial > 0 ? ` · ${stats.storesPartial} partial` : ''}
          {stats.storesNone > 0 ? ` · ${stats.storesNone} uncovered` : ''}
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm cursor-pointer hover:border-[#7C3AED]/50 transition-colors group"
        onClick={onViewHeatmap}
        onKeyDown={(e) => e.key === 'Enter' && onViewHeatmap()}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-[#212121] flex items-center gap-2">
            <MapIcon size={18} className="text-blue-600" /> Promo Heatmap
          </h3>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div className="flex flex-col min-h-[72px] justify-between">
          <p className="text-sm text-[#757575] mb-2">
            {promoSubtitle(stats.topPromoMetric, stats.topPromoZone, stats.topPromoValue, heatmapDays)}
          </p>
          <Button
            variant="link"
            className="p-0 h-auto text-xs font-bold text-[#7C3AED] self-start"
            onClick={(e) => {
              e.stopPropagation();
              onViewHeatmap();
            }}
          >
            View heatmap details
          </Button>
        </div>
      </div>
    </div>
  );
}
