import React, { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/utils/websocket';
import { RefreshCw, Loader2, Zap, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getPickerRegistry, type StorePickerRegistryItem } from '../../api/darkstore/pickers.api';
import { PageHeader } from '../ui/page-header';
import { useAuth, getActiveStoreId } from '../../contexts/AuthContext';

function formatLastActivity(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  if (diffMins > 0) return `${diffMins}m ago`;
  if (diffSecs > 0) return `${diffSecs}s ago`;
  return 'Just now';
}

function BatteryBadge({ level }: { level: number | null }) {
  if (level == null) return <span className="text-[#9E9E9E] text-sm">—</span>;
  const isLow = level < 20;
  const colorClass = isLow ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' : 'bg-[#F0FDF4] text-[#16A34A] border-[#86EFAC]';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border', colorClass)}>
      <Zap size={12} />
      {level}%
    </span>
  );
}

function WorkerStatusBadge({ online, derivedStatus }: { online: boolean; derivedStatus?: string }) {
  const status = derivedStatus || (online ? 'AVAILABLE' : 'OFFLINE');
  const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    AVAILABLE: { label: 'Available', bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', dot: 'bg-[#16A34A]' },
    PICKING: { label: 'Picking', bg: 'bg-[#DBEAFE]', text: 'text-[#2563EB]', dot: 'bg-[#2563EB]' },
    ON_BREAK: { label: 'On Break', bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', dot: 'bg-[#D97706]' },
    OFFLINE: { label: 'Offline', bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' },
    DEVICE_IDLE: { label: 'Idle', bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', dot: 'bg-[#6B7280]' },
  };
  const c = config[status] || config.OFFLINE;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border', c.bg, c.text, 'border-current/20')}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

function OtpBadge({ otp }: { otp: string | null | undefined }) {
  if (!otp) {
    return <span className="text-[#9E9E9E] text-sm font-mono">—</span>;
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] font-mono text-sm font-bold tracking-widest">
      {otp}
    </span>
  );
}

export function LivePickerBoardScreen() {
  const { isAuthenticated } = useAuth();
  const [pickers, setPickers] = useState<StorePickerRegistryItem[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPickers = useCallback(async () => {
    const storeId = getActiveStoreId();
    if (!storeId) {
      setPickers([]);
      setStoreName(null);
      setError('No active store selected. Choose a store from the dashboard header.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await getPickerRegistry(storeId);
      setStoreName(res?.data?.storeName ?? null);
      setPickers(res?.data?.pickers ?? []);
    } catch (e) {
      setPickers([]);
      setStoreName(null);
      setError(e instanceof Error ? e.message : 'Failed to load picker list');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPickers();
    }, 3000);
  }, [fetchPickers]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchPickers();
  }, [isAuthenticated, fetchPickers]);

  useEffect(() => {
    if (!isAuthenticated) return;

    websocketService.connect();
    websocketService.on('order:updated', debouncedFetch);
    websocketService.on('picker:updated', debouncedFetch);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      websocketService.off('order:updated', debouncedFetch);
      websocketService.off('picker:updated', debouncedFetch);
      // Do not call disconnect(): shared service; disconnect() clears all listeners app-wide.
    };
  }, [isAuthenticated, debouncedFetch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Picker Board"
        subtitle={
          storeName
            ? `${storeName} — registered pickers and store OTPs`
            : 'Picker workforce registered at this dark store'
        }
        actions={
          <button
            onClick={() => { setLoading(true); fetchPickers(); }}
            disabled={loading}
            className="px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-[#616161] hover:bg-[#F5F5F5] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        }
      />

      {loading && pickers.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#1677FF]" />
        </div>
      ) : error ? (
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-xl p-6 text-center">
          <p className="text-[#B91C1C] font-medium">{error}</p>
        </div>
      ) : pickers.length === 0 ? (
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-12 text-center">
          <p className="text-[#757575]">
            No pickers registered at this store yet. Pickers appear here after they log into the Picker App at this dark store.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Picker</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Store OTP</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Battery</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Active Order</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {pickers.map((p) => (
                  <tr key={p.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center">
                          <User size={14} className="text-[#4F46E5]" />
                        </div>
                        <div>
                          <span className="font-medium text-[#212121]">{p.name}</span>
                          {p.phone && (
                            <p className="text-xs text-[#9E9E9E] font-mono mt-0.5">{p.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <OtpBadge otp={p.permanentOtp} />
                    </td>
                    <td className="py-3 px-4">
                      <WorkerStatusBadge online={p.online} derivedStatus={p.derivedStatus} />
                      {!p.inShift && p.online === false && (
                        <p className="text-[10px] text-[#9E9E9E] mt-1">Not punched in</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <BatteryBadge level={p.batteryLevel} />
                    </td>
                    <td className="py-3 px-4 text-[#616161] font-mono text-sm">{p.activeOrderId || '—'}</td>
                    <td className="py-3 px-4 text-[#616161]">{formatLastActivity(p.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
