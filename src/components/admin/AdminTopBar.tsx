import React from 'react';
import { Bell, Search, Command, ShieldCheck, Menu } from 'lucide-react';

interface AdminTopBarProps {
  onMenuClick?: () => void;
}

export function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
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

        <button className="relative p-2 text-[#71717a] hover:bg-[#f4f4f5] rounded-full transition-colors group shrink-0" aria-label="Notifications">
          <Bell size={20} className="group-hover:text-[#18181b]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#e11d48] rounded-full border-2 border-white"></span>
        </button>
      </div>
    </div>
  );
}
