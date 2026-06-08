import React, { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { getRegionalPipeline, type RegionalStorePipeline } from '@/api/darkstore/operations.api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

interface RegionalCommandPanelProps {
  onStoreClick?: (storeId: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function RegionalCommandPanel({ onStoreClick, className, defaultExpanded = false }: RegionalCommandPanelProps) {
  const { user, activeStoreId } = useAuth();
  const [stores, setStores] = useState<RegionalStorePipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const storeIds = user?.assignedStores?.length
    ? user.assignedStores.join(',')
    : activeStoreId || '';

  useEffect(() => {
    if (!storeIds) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getRegionalPipeline({ storeIds })
      .then((res) => setStores(res?.data ?? []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [storeIds]);

  if (stores.length <= 1 && !loading) return null;

  return (
    <div className={cn('darkstore-card overflow-hidden darkstore-fade-in', className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[var(--ds-primary)]" />
          <span className="text-sm font-semibold text-slate-800">Regional Command</span>
          <span className="text-xs text-slate-500">({stores.length} stores)</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 text-left font-semibold">Store</th>
                <th className="px-4 py-2 text-left font-semibold">Active</th>
                <th className="px-4 py-2 text-left font-semibold">SLA Threat</th>
                <th className="px-4 py-2 text-left font-semibold">&lt; 5m</th>
                <th className="px-4 py-2 text-left font-semibold">Pickers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">Loading regional data…</td>
                </tr>
              ) : (
                stores.map((s) => (
                  <tr
                    key={s.storeId}
                    className={cn(
                      'hover:bg-slate-50 cursor-pointer',
                      s.storeId === activeStoreId && 'bg-blue-50/50'
                    )}
                    onClick={() => onStoreClick?.(s.storeId)}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {s.storeId}
                      {s.storeId === activeStoreId && (
                        <span className="ml-2 text-[10px] text-blue-600 font-bold">CURRENT</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{s.totalActive}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        variant="sla"
                        status={s.slaThreatPct >= 20 ? 'critical' : s.slaThreatPct >= 10 ? 'warning' : 'safe'}
                      />
                      <span className="ml-1.5 text-xs tabular-nums">{s.slaThreatPct}%</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-red-600 font-semibold">{s.ordersUnder5Min}</td>
                    <td className="px-4 py-2.5 tabular-nums">{s.pickerCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
