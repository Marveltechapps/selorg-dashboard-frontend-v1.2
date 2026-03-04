import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getPickOps, type PickOpsOrder } from '../../api/darkstore/pickers.api';
import { PageHeader } from '../ui/page-header';

const SLA_RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', border: 'border-[#86EFAC]' },
  warning: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#FCD34D]' },
  critical: { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', border: 'border-[#FECACA]' },
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PickPackOpsScreen() {
  const { activeStoreId } = useAuth();
  const [orders, setOrders] = useState<PickOpsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const res = await getPickOps({ storeId: activeStoreId || undefined });
      setOrders(res?.data ?? []);
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : 'Failed to load pick ops');
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pick & Pack Ops"
        subtitle="Orders currently being picked or assigned"
        actions={
          <button
            onClick={() => { setLoading(true); fetchOrders(); }}
            disabled={loading}
            className="px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-[#616161] hover:bg-[#F5F5F5] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        }
      />

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#1677FF]" />
        </div>
      ) : error ? (
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-xl p-6 text-center">
          <p className="text-[#B91C1C] font-medium">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-12 text-center">
          <p className="text-[#757575]">No active picks. Orders with status PICKING or ASSIGNED will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Order ID</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Picker</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Started At</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Progress</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Missing Items</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">SLA Risk</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Zone</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const slaColors = SLA_RISK_COLORS[o.slaRisk] ?? SLA_RISK_COLORS.safe;
                  return (
                    <tr key={o.orderId} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA]">
                      <td className="py-3 px-4 font-medium text-[#212121]">{o.orderId}</td>
                      <td className="py-3 px-4 text-[#616161]">{o.pickerName}</td>
                      <td className="py-3 px-4 text-[#616161]">{formatDate(o.startedAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                o.progress >= 100 ? 'bg-[#16A34A]' : o.progress >= 50 ? 'bg-[#1677FF]' : 'bg-[#D46B08]'
                              )}
                              style={{ width: `${Math.min(100, o.progress)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-[#212121]">{o.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold',
                          o.missingItemsCount > 0 ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#F0FDF4] text-[#16A34A]'
                        )}>
                          {o.missingItemsCount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', slaColors.bg, slaColors.text, slaColors.border)}>
                          {o.slaRisk}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#616161]">{o.zone}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
