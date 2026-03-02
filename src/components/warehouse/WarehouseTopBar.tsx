import React, { useState, useRef, useEffect } from 'react';
import { Bell, Activity, Wifi } from 'lucide-react';
import { GlobalSearch } from '../shared/GlobalSearch';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'GRN PO-2024-001 received', message: 'Vendor Alpha – 120 items', time: '2 min ago', read: false },
  { id: '2', title: 'Low stock alert', message: 'SKU-103 below threshold', time: '15 min ago', read: false },
  { id: '3', title: 'Batch BATCH-001 completed', message: 'Picker John – 24 items', time: '1 hr ago', read: true },
];

export function WarehouseTopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-[72px] bg-white border-b border-[#E2E8F0] fixed top-0 left-[240px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Left: System Status */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
           <span className="text-xl font-bold text-[#1E293B]">Ops Control Center</span>
           <span className="bg-[#CFFAFE] text-[#0891b2] text-xs font-bold px-2 py-0.5 rounded-full border border-[#0891b2]/20 flex items-center gap-1">
             <Activity size={12} />
             LIVE
           </span>
        </div>
        <div className="h-6 w-px bg-[#E2E8F0] mx-2 shrink-0" />
        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] shrink-0">
            <Wifi size={14} className="text-green-500" />
            <span>HSD Network: Strong</span>
        </div>
        <div className="flex-1 max-w-md ml-4 hidden sm:block">
          <GlobalSearch placeholder="Search SKU, Bin, PO, or Transfer ID..." />
        </div>
      </div>

      {/* Right: Notifications */}
      <div className="relative flex items-center gap-6 ml-6 border-l pl-6 border-[#E2E8F0] h-10 shrink-0" ref={notifRef}>
        <button
          type="button"
          className="relative p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors"
          onClick={() => setShowNotifications((v) => !v)}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full shadow-sm" />
        </button>
        {showNotifications && (
          <div className="absolute top-full right-2 mt-2 min-w-[360px] max-w-[420px] w-[90vw] bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-50 py-2 max-h-[28rem] overflow-y-auto overflow-x-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] font-semibold text-[#1E293B] text-sm whitespace-nowrap">Notifications</div>
            {MOCK_NOTIFICATIONS.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left px-4 py-3 hover:bg-[#F8FAFC] border-b border-[#F1F5F9] last:border-0 min-w-0 ${!n.read ? 'bg-cyan-50/50' : ''}`}
                onClick={() => setShowNotifications(false)}
              >
                <div className="font-medium text-sm text-[#1E293B] break-words overflow-wrap-anywhere">{n.title}</div>
                <div className="text-xs text-[#64748B] mt-0.5 break-words overflow-wrap-anywhere">{n.message}</div>
                <div className="text-xs text-[#94A3B8] mt-1 whitespace-nowrap">{n.time}</div>
              </button>
            ))}
            {MOCK_NOTIFICATIONS.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[#64748B]">No notifications</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
