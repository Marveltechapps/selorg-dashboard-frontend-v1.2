import React, { useState } from 'react';
import { Bell, Search, Signal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RiderTopBarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'Order #ORD-101 delayed – SLA at risk', time: '2 min ago', read: false },
  { id: '2', text: 'Rider Raj K completed 5 deliveries', time: '15 min ago', read: true },
  { id: '3', text: 'New order assigned to Downtown Hub', time: '1 hour ago', read: true },
];

export function RiderTopBar({ searchQuery = '', onSearchChange }: RiderTopBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[220px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Left: Hub Status */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
           <span className="text-xl font-bold text-[#212121]">Logistics Command Center</span>
           <span className="bg-[#FFF7ED] text-[#EA580C] text-xs font-bold px-2 py-0.5 rounded-full border border-[#EA580C]/20 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse"></span>
             LIVE
           </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        {/* System Status */}
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
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full shadow-sm"></span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b border-[#E0E0E0] font-semibold text-[#212121]">Notifications</div>
            {MOCK_NOTIFICATIONS.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-3 cursor-pointer">
                <span className="text-sm text-[#212121]">{n.text}</span>
                <span className="text-xs text-[#757575]">{n.time}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
