import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Search, Signal } from 'lucide-react';
import {
  fetchRiderDashboardNotifications,
  markAllRiderDashboardNotificationsRead,
  markRiderDashboardNotificationRead,
  type RiderDashboardFeedNotification,
} from '@/api/rider/riderDashboardNotifications.api';

interface RiderTopBarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

function formatTimeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function RiderTopBar({ searchQuery = '', onSearchChange }: RiderTopBarProps) {
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
    <div className="h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-[220px] right-0 z-40 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0 transition-shadow duration-200">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#18181b]">Logistics Command Center</span>
          <span className="bg-[#FFF7ED] text-[#EA580C] text-xs font-bold px-2 py-0.5 rounded-full border border-[#EA580C]/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg">
          <Signal size={14} className="text-[#059669]" />
          <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wide">All Systems Nominal</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input
            type="text"
            placeholder="Search riders, order ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#F97316] focus:border-transparent w-48 transition-all focus:w-64 placeholder-[#BDBDBD]"
          />
        </div>

        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors"
            aria-label="Notifications"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <BellRing size={20} /> : <Bell size={20} />}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#EF4444] rounded-full border-2 border-white text-[10px] leading-4 text-white text-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-lg"
            >
              <div className="px-3 py-2 border-b border-[#E0E0E0] flex items-center justify-between gap-2">
                <span className="font-semibold text-[#212121] text-sm">Notifications</span>
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
                  <span className="text-xs text-[#757575]">{items.length} latest</span>
                </div>
              </div>
              <div className="max-h-[min(70vh,400px)] overflow-y-auto">
                {loading ? (
                  <div className="px-3 py-6 text-sm text-[#757575] text-center">Loading notifications...</div>
                ) : items.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-[#757575] text-center">No notifications yet</div>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-3 py-3 border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFAFA] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#F97316]/30 focus-visible:ring-inset"
                      onClick={() => {
                        if (item.status === 'opened' || item.status === 'clicked') return;
                        markRiderDashboardNotificationRead(item.id).catch(() => {});
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, status: 'opened' } : i))
                        );
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-[#212121] line-clamp-2">{item.title}</span>
                        <span className="text-[10px] text-[#757575] shrink-0">{formatTimeAgo(item.sentAt)}</span>
                      </div>
                      {item.body ? (
                        <p className="text-xs text-[#757575] mt-1 line-clamp-2">{item.body}</p>
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
