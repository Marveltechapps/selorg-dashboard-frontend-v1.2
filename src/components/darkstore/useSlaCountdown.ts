import { useEffect, useState } from 'react';

export function getRemainingMs(deadline: string | Date | null | undefined): number {
  if (!deadline) return 0;
  const t = typeof deadline === 'string' ? new Date(deadline).getTime() : deadline.getTime();
  if (Number.isNaN(t)) return 0;
  return t - Date.now();
}

export function formatRemainingMs(ms: number): string {
  if (ms <= 0) return 'BREACHED';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Re-render children every second for live SLA countdowns. */
export function useLiveClock(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
