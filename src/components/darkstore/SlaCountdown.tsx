import React from 'react';
import { cn } from '@/lib/utils';
import { slaTextColor } from './statusColors';
import { formatRemainingMs, getRemainingMs, useLiveClock } from './useSlaCountdown';

interface SlaCountdownProps {
  deadline: string;
  status?: string;
  className?: string;
  showIcon?: boolean;
}

export function SlaCountdown({ deadline, status, className, showIcon }: SlaCountdownProps) {
  useLiveClock();
  const ms = getRemainingMs(deadline);
  const breached = ms <= 0;
  const derivedStatus =
    breached ? 'critical' : status ?? (ms < 5 * 60 * 1000 ? 'critical' : ms < 15 * 60 * 1000 ? 'warning' : 'safe');

  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums inline-flex items-center gap-1',
        slaTextColor(derivedStatus),
        breached && 'ds-sla-critical',
        className
      )}
    >
      {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {breached ? 'BREACHED' : formatRemainingMs(ms)}
    </span>
  );
}
