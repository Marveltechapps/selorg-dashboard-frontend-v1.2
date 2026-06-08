import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Bell, PackageX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { EscalationSuggestion } from '@/api/darkstore/operations.api';
import { useDarkstore } from './DarkstoreProvider';

interface AlertTierBannerProps {
  suggestions: EscalationSuggestion[];
  stockAlertCount?: number;
  onAction: (suggestion: EscalationSuggestion) => void;
  onDismissP0?: () => void;
  className?: string;
}

export function AlertTierBanner({
  suggestions,
  stockAlertCount = 0,
  onAction,
  onDismissP0,
  className,
}: AlertTierBannerProps) {
  const { preferences } = useDarkstore();
  const playedRef = useRef(false);
  const p0 = suggestions.filter((s) => s.tier === 'P0');
  const p1 = suggestions.filter((s) => s.tier === 'P1');

  useEffect(() => {
    if (p0.length > 0 && preferences.alertSoundEnabled && !playedRef.current) {
      playedRef.current = true;
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        /* audio optional */
      }
    }
    if (p0.length === 0) playedRef.current = false;
  }, [p0.length, preferences.alertSoundEnabled]);

  if (p0.length === 0 && p1.length === 0 && stockAlertCount === 0) return null;

  return (
    <div className={cn('space-y-2 mb-4', className)}>
      {p0.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-600 text-white ds-sla-critical">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <p className="text-sm font-bold">P0 — SLA breach imminent</p>
              <p className="text-xs opacity-90 truncate">
                {p0.slice(0, 2).map((s) => s.message).join(' · ')}
                {p0.length > 2 ? ` +${p0.length - 2} more` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => onAction(p0[0])}
            >
              View SLA Monitor
            </Button>
            {onDismissP0 && (
              <button type="button" onClick={onDismissP0} className="p-1.5 hover:bg-white/10 rounded-lg" aria-label="Dismiss">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {p1.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <Bell size={16} className="text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-amber-800">
              P1 — {p1.length} order{p1.length > 1 ? 's' : ''} need assignment
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p1.slice(0, 3).map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => onAction(s)}
              >
                {s.orderId}
              </Button>
            ))}
          </div>
        </div>
      )}

      {stockAlertCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <PackageX size={16} className="text-slate-500" />
          <p className="text-xs font-medium text-slate-600">
            P2 — {stockAlertCount} high-velocity SKU stock-out alert{stockAlertCount > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
