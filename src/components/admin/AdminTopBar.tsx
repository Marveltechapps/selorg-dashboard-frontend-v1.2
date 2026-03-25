import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Search, Command, ShieldCheck, Menu } from 'lucide-react';
import { fetchHistory, type NotificationHistory } from '@/components/screens/admin/notificationsApi';

interface AdminTopBarProps {
  onMenuClick?: () => void;
}

export function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const history = await fetchHistory().catch(() => []);
      if (!active) return;
      setItems(Array.isArray(history) ? history.slice(0, 12) : []);
      setLoading(false);
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
      const history = await fetchHistory().catch(() => []);
      if (!active) return;
      setItems(Array.isArray(history) ? history.slice(0, 12) : []);
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

  const formatTimeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="admin-topbar h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-0 right-0 z-40 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button type="button" onClick={onMenuClick} className="admin-mobile-only p-2 -ml-1 mr-1 shrink-0 text-[#71717a] hover:bg-[#f4f4f5] rounded-lg" aria-label="Open menu">
          <Menu size={24} />
        </button>
      )}
      {/* Left: Global Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] shrink-0" size={16} />
          <input 
            type="text" 
            placeholder="Search…" 
            className="h-9 sm:h-10 pl-8 sm:pl-10 pr-8 sm:pr-12 w-full min-w-0 rounded-lg bg-[#f4f4f5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#e11d48] focus:border-transparent transition-all placeholder-[#a1a1aa] text-[#18181b]"
          />
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
             <div className="px-1.5 py-0.5 rounded border border-[#d4d4d8] bg-white text-[10px] text-[#71717a] font-mono">⌘K</div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-4 ml-1 sm:ml-6 shrink-0 min-w-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-full border border-rose-100">
           <ShieldCheck size={14} className="text-[#e11d48]" />
           <span className="text-xs font-medium text-rose-900">Prod Environment</span>
        </div>
        
        <div className="h-6 w-px bg-[#e4e4e7] mx-0 sm:mx-2 hidden sm:block"></div>

        <div className="relative shrink-0">
          <button
            ref={buttonRef}
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
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#e11d48] rounded-full border border-white text-[10px] leading-4 text-white text-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#e4e4e7] rounded-xl shadow-2xl overflow-hidden"
              style={{ width: '460px', maxWidth: 'calc(100vw - 24px)' }}
            >
              <div className="px-4 py-3 border-b border-[#e4e4e7] flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#18181b]">Notifications</h4>
                <span className="text-xs text-[#71717a]">{items.length} latest</span>
              </div>
              <div className="min-h-[300px] max-h-[min(75vh,540px)] overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-[#71717a] text-center">Loading notifications...</div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[#71717a] text-center">No notifications yet</div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-[#f4f4f5] last:border-b-0 hover:bg-[#fafafa]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#18181b] truncate">{item.title || item.templateName || 'Notification'}</p>
                        <span className="text-[10px] text-[#71717a] shrink-0">{formatTimeAgo(item.sentAt)}</span>
                      </div>
                      <p className="text-xs text-[#52525b] mt-1 line-clamp-2">{item.body || 'No message body'}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[#52525b] uppercase">{item.channel}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 uppercase">{item.status}</span>
                      </div>
                    </div>
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
