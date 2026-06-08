import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Search, ShieldCheck, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiderDensityToggle } from './RiderDensityToggle';
import {
  fetchRiderDashboardNotifications,
  markAllRiderDashboardNotificationsRead,
  markRiderDashboardNotificationRead,
  type RiderDashboardFeedNotification,
} from '@/api/rider/riderDashboardNotifications.api';

interface RiderTopBarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onMenuClick?: () => void;
}

function envBadge(): { label: string; className: string } | null {
  const custom = (import.meta.env.VITE_ENV_LABEL as string | undefined)?.trim();
  if (custom) {
    return {
      label: custom,
      className: 'rounded-full border border-slate-200 bg-slate-50 text-slate-800',
    };
  }
  if (import.meta.env.DEV) {
    return {
      label: 'Development',
      className: 'rounded-full border border-slate-200 bg-slate-50 text-slate-700',
    };
  }
  return {
    label: 'Production',
    className: 'rounded-full border border-rose-100 bg-rose-50 text-rose-900',
  };
}

function formatTimeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function RiderTopBar({ searchQuery = '', onSearchChange, onMenuClick }: RiderTopBarProps) {
  const badge = envBadge();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RiderDashboardFeedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadLatest = async () => {
      setLoading(true);
      const list = await fetchRiderDashboardNotifications(30).catch(() => []);
      if (!active) return;
      setItems(Array.isArray(list) ? list.slice(0, 30) : []);
      setLoading(false);
    };
    loadLatest();
    const timer = window.setInterval(loadLatest, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.status !== 'opened' && item.status !== 'clicked').length,
    [items]
  );

  return (
    <div
      className={cn(
        'rider-topbar h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-0 right-0',
        'flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between',
        'shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0 z-40 transition-shadow duration-200'
      )}
    >
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="rider-mobile-only p-2 -ml-1 rounded-lg text-[#52525b] hover:bg-[#f4f4f5]"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
        <div className="relative w-full min-w-0">
          <Search
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] shrink-0 pointer-events-none"
            size={16}
            aria-hidden
          />
          <input
            type="text"
            placeholder="Search riders, order ID…"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 sm:h-10 pl-8 sm:pl-10 pr-4 w-full min-w-0 rounded-lg bg-[#f4f4f5] border-transparent text-sm text-[#18181b] focus:bg-white focus:ring-2 focus:ring-[#F97316] focus:border-transparent transition-all placeholder-[#a1a1aa]"
          />
        </div>
      </div>

      <div className="relative z-[2] flex shrink-0 min-w-0 items-center gap-1 sm:gap-4 ml-1 sm:ml-6">
        <RiderDensityToggle />
        {badge && (
          <div className={cn('hidden sm:flex items-center gap-2 px-3 py-1.5', badge.className)}>
            <ShieldCheck
              size={14}
              className={import.meta.env.DEV ? 'text-slate-600' : 'text-[#F97316]'}
            />
            <span className="text-xs font-medium">{badge.label}</span>
          </div>
        )}

        <div className="h-6 w-px bg-[#e4e4e7] mx-0 sm:mx-2 hidden sm:block shrink-0" />

        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            className="relative p-2 text-[#71717a] hover:bg-[#f4f4f5] rounded-full transition-colors group shrink-0"
            aria-label="Notifications"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? (
              <BellRing size={20} className="text-[#71717a]" />
            ) : (
              <Bell size={20} className="group-hover:text-[#18181b]" />
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#F97316] rounded-full border border-white text-[10px] leading-4 text-white text-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#e4e4e7] rounded-xl shadow-2xl overflow-hidden"
              style={{ width: 'min(460px, calc(100vw - 24px))' }}
            >
              <div className="px-4 py-3 border-b border-[#e4e4e7] flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#18181b]">Notifications</h4>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-[#EA580C] hover:underline"
                      onClick={async () => {
                        await markAllRiderDashboardNotificationsRead().catch(() => {});
                        setItems((prev) => prev.map((i) => ({ ...i, status: 'opened' })));
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                  <span className="text-xs text-[#71717a]">{items.length} latest</span>
                </div>
              </div>
              <div className="min-h-[200px] max-h-[min(75vh,540px)] overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-[#71717a] text-center">
                    Loading notifications…
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[#71717a] text-center">No notifications yet</div>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-4 py-3 border-b border-[#f4f4f5] last:border-b-0 hover:bg-[#fafafa] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#F97316]/30 focus-visible:ring-inset"
                      onClick={() => {
                        if (item.status === 'opened' || item.status === 'clicked') return;
                        markRiderDashboardNotificationRead(item.id).catch(() => {});
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, status: 'opened' } : i))
                        );
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[#18181b] line-clamp-2">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#71717a] shrink-0">
                          {formatTimeAgo(item.sentAt)}
                        </span>
                      </div>
                      {item.body ? (
                        <p className="text-xs text-[#52525b] mt-1 line-clamp-2">{item.body}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
