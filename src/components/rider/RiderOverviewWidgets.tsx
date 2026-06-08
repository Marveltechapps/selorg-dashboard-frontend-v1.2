import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchRiderCashSummary, type RiderCashSummary } from '../screens/finance/riderCashApi';
import { getSystemHealthSummary, type SystemHealthSummary } from '../screens/rider/systemHealthApi';

interface Props {
  onNavigateCash?: () => void;
  onNavigateHealth?: () => void;
}

export function RiderOverviewWidgets({ onNavigateCash, onNavigateHealth }: Props) {
  const [cash, setCash] = useState<RiderCashSummary | null>(null);
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cashData, healthData] = await Promise.all([
        fetchRiderCashSummary().catch(() => null),
        getSystemHealthSummary().catch(() => null),
      ]);
      setCash(cashData);
      setHealth(healthData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !cash && !health) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onNavigateCash}
        className="text-left bg-white border border-[#E0E0E0] rounded-xl p-4 hover:border-[#F97316] transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[#F97316]">
            <Wallet size={18} />
            <span className="text-sm font-semibold text-[#212121]">Rider Cash</span>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); load(); }}>
            <RefreshCw size={14} />
          </Button>
        </div>
        <p className="text-2xl font-bold text-[#212121]">
          ₹{(cash?.codOutstanding ?? 0).toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">COD outstanding · {cash?.pendingPayoutCount ?? 0} pending payouts</p>
      </button>

      <button
        type="button"
        onClick={onNavigateHealth}
        className="text-left bg-white border border-[#E0E0E0] rounded-xl p-4 hover:border-[#F97316] transition-colors"
      >
        <div className="flex items-center gap-2 mb-2 text-[#0891b2]">
          <Activity size={18} />
          <span className="text-sm font-semibold text-[#212121]">System Health</span>
        </div>
        <p className="text-2xl font-bold text-[#212121]">
          {health?.activeDevices ?? 0}/{health?.totalDevices ?? 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Active devices · {health?.connectivityIssues ?? 0} connectivity issues
        </p>
      </button>
    </div>
  );
}
