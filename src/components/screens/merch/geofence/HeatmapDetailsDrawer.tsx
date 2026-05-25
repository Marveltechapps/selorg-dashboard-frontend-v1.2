import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "../../../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../ui/sheet";
import { Loader2 } from 'lucide-react';
import { geofenceApi, HeatmapMetric, PromoHeatmapRow } from './geofenceApi';
import { toast } from 'sonner';

export type HeatmapMetricType = HeatmapMetric;

interface HeatmapDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMetricChange?: (metric: HeatmapMetricType) => void;
  onZoneFocus?: (zoneId: string) => void;
  onDataLoaded?: (rows: PromoHeatmapRow[]) => void;
}

function formatValue(metric: HeatmapMetricType, value: number): string {
  if (metric === 'revenue') {
    if (value >= 1_000_000) return `₹${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${Math.round(value).toLocaleString()}`;
  }
  return value.toLocaleString();
}

function metricValue(row: PromoHeatmapRow, metric: HeatmapMetricType): number {
  if (metric === 'revenue') return row.revenue;
  if (metric === 'redemptions') return row.redemptions;
  return row.orders;
}

function barColor(zoneColor: string, intensity: number): string {
  if (intensity > 0.7) return 'bg-red-500';
  if (intensity > 0.4) return 'bg-orange-400';
  if (zoneColor === '#10B981') return 'bg-emerald-500';
  if (zoneColor === '#3B82F6') return 'bg-blue-500';
  return 'bg-yellow-400';
}

export function HeatmapDetailsDrawer({
  isOpen,
  onClose,
  onMetricChange,
  onZoneFocus,
  onDataLoaded,
}: HeatmapDetailsDrawerProps) {
  const [metric, setMetric] = useState<HeatmapMetricType>('revenue');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PromoHeatmapRow[]>([]);
  const [periodLabel, setPeriodLabel] = useState('Last 30 Days • All Campaigns');
  const [totals, setTotals] = useState({ revenue: 0, orders: 0, redemptions: 0 });

  const loadHeatmap = async (periodDays = days) => {
    try {
      setLoading(true);
      const data = await geofenceApi.getPromoHeatmap(periodDays);
      const nextRows = data.rows ?? [];
      setRows(nextRows);
      onDataLoaded?.(nextRows);
      setTotals(data.totals ?? { revenue: 0, orders: 0, redemptions: 0 });
      setPeriodLabel(data.periodLabel ?? `Last ${periodDays} Days • All Campaigns`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load heatmap data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadHeatmap(days);
  }, [isOpen]);

  const maxForMetric = useMemo(() => {
    const values = rows.map((r) => metricValue(r, metric));
    return Math.max(...values, 1);
  }, [rows, metric]);

  const handleMetricChange = (next: HeatmapMetricType) => {
    setMetric(next);
    onMetricChange?.(next);
  };

  const totalForMetric = metric === 'revenue'
    ? totals.revenue
    : metric === 'redemptions'
      ? totals.redemptions
      : totals.orders;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[500px] sm:max-w-[500px] overflow-y-auto px-6 pb-8 pt-4">
        <SheetHeader className="mb-4 px-0 pr-8">
          <SheetTitle className="text-xl">Promo Heatmap Details</SheetTitle>
          <SheetDescription>{periodLabel}</SheetDescription>
        </SheetHeader>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg border text-sm">
          <span className="text-gray-500">Total {metric}: </span>
          <span className="font-bold text-green-700">{formatValue(metric, totalForMetric)}</span>
        </div>

        <div className="flex gap-2 mb-4">
          {([7, 30, 90] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'secondary' : 'outline'}
              className="h-7 text-xs"
              disabled={loading}
              onClick={() => {
                setDays(d);
                loadHeatmap(d);
              }}
            >
              {d}d
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs ml-auto"
            disabled={loading}
            onClick={() => loadHeatmap(days)}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <span className="text-sm">Loading heatmap metrics…</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No zone data for this period. Seed geofence data or add zones.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const value = metricValue(row, metric);
              const percentage = Math.min(100, (value / maxForMetric) * 100);
              return (
                <button
                  key={row.zoneId}
                  type="button"
                  className="w-full text-left rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors"
                  onClick={() => onZoneFocus?.(row.zoneId)}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.zoneName}
                    </span>
                    <span className="font-bold text-green-600">{formatValue(metric, value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor(row.color, percentage / 100)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t mt-6">
          <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Metric</h4>
          <div className="flex gap-2 flex-wrap">
            {(['revenue', 'redemptions', 'orders'] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={metric === m ? 'secondary' : 'ghost'}
                className="h-7 text-xs capitalize"
                onClick={() => handleMetricChange(m)}
              >
                {m === 'revenue' ? 'Revenue' : m === 'redemptions' ? 'Redemptions' : 'Orders'}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
