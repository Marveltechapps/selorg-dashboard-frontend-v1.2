import React, { useState, useEffect } from 'react';
import { Bell, Search, Globe, ChevronDown, Store, AlertCircle, ShoppingCart, Package } from 'lucide-react';
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface MerchTopBarProps {
  onSearch?: (query: string) => void;
  onRegionChange?: (region: string) => void;
  onScopeChange?: (scope: 'Global' | 'Local') => void;
  onNavigate?: (tab: string) => void;
  currentRegion?: string;
  currentScope?: 'Global' | 'Local';
  searchQuery?: string;
}

export function MerchTopBar({ 
  onSearch, 
  onRegionChange, 
  onScopeChange,
  onNavigate,
  currentRegion = "North America",
  currentScope = "Global",
  searchQuery = ""
}: MerchTopBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Price Conflict', message: 'SKU #882 has multiple price rules active', time: '2m ago', type: 'alert', icon: <AlertCircle className="text-red-500" size={16} />, unread: true, target: 'pricing' },
    { id: 2, title: 'Campaign Ending', message: 'Summer Sale ends in 3 hours', time: '15m ago', type: 'info', icon: <Package className="text-amber-500" size={16} />, unread: true, target: 'promotions' },
    { id: 3, title: 'Stock Alert', message: 'Beverage bundle is below threshold', time: '1h ago', type: 'warning', icon: <ShoppingCart className="text-blue-500" size={16} />, unread: true, target: 'allocation' },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Sync local state with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const markAsRead = (id?: number) => {
    if (id) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    }
  };

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[220px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Left: Market Status */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative group">
          <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 outline-none">
            <div className="w-10 h-10 rounded-lg bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED]">
              <Store size={20} />
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#212121]">{currentRegion}</span>
                <ChevronDown size={14} className="text-[#9E9E9E]" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="text-[10px] font-medium text-[#16A34A]">Market Active</span>
              </div>
            </div>
          </button>
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#E0E0E0] rounded-xl shadow-xl overflow-hidden hidden group-focus-within:block z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">Switch Region</div>
              <button 
                onClick={() => onRegionChange?.("North America")}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                  currentRegion === "North America" ? "bg-[#F5F7FA] text-[#212121]" : "hover:bg-[#F5F5F5] text-[#616161]"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", currentRegion === "North America" ? "bg-[#16A34A]" : "bg-[#E0E0E0]")} />
                <span className="font-medium text-sm">North America</span>
              </button>
              <button 
                onClick={() => onRegionChange?.("Europe")}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                  currentRegion === "Europe" ? "bg-[#F5F7FA] text-[#212121]" : "hover:bg-[#F5F5F5] text-[#616161]"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", currentRegion === "Europe" ? "bg-[#16A34A]" : "bg-[#E0E0E0]")} />
                <span className="font-medium text-sm">Europe</span>
              </button>
              <button 
                onClick={() => onRegionChange?.("APAC")}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                  currentRegion === "APAC" ? "bg-[#F5F7FA] text-[#212121]" : "hover:bg-[#F5F5F5] text-[#616161]"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", currentRegion === "APAC" ? "bg-[#16A34A]" : "bg-[#E0E0E0]")} />
                <span className="font-medium text-sm">APAC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        {/* Environment Toggle */}
        <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-lg">
          <button 
            onClick={() => onScopeChange?.("Global")}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-all",
              currentScope === "Global" ? "bg-white text-[#7C3AED] shadow-sm" : "text-[#9E9E9E] hover:text-[#212121]"
            )}
          >
            <Globe size={12} fill="currentColor" />
            Global
          </button>
          <button 
            onClick={() => onScopeChange?.("Local")}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all",
              currentScope === "Local" ? "bg-white text-[#7C3AED] shadow-sm" : "text-[#9E9E9E] hover:text-[#212121]"
            )}
          >
            Local
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input 
            type="text" 
            placeholder="Search campaigns, SKUs..." 
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent w-48 transition-all focus:w-64 placeholder-[#BDBDBD]"
            value={localSearchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setLocalSearchQuery(value);
              onSearch?.(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            autoComplete="off"
          />
        </div>

        <DropdownMenu onOpenChange={(open) => open && unreadCount > 0 && setTimeout(() => markAsRead(), 1000)}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors outline-none">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full shadow-sm"></span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[360px] max-w-[420px] w-[90vw] p-0 overflow-x-hidden">
            <DropdownMenuLabel className="p-4 border-b">
              <div className="flex items-center justify-between">
                <span className="whitespace-nowrap">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-[#F3E8FF] text-[#7C3AED] px-2 py-0.5 rounded-full font-bold uppercase">{unreadCount} New</span>
                )}
              </div>
            </DropdownMenuLabel>
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[#9E9E9E] text-sm">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem 
                    key={notif.id} 
                    className={cn(
                      "p-4 focus:bg-gray-50 cursor-pointer border-b last:border-0 min-w-0",
                      notif.unread ? "bg-purple-50/30" : ""
                    )}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.target) onNavigate?.(notif.target);
                    }}
                  >
                    <div className="flex gap-3 min-w-0 w-full">
                      <div className="mt-1 flex-shrink-0">{notif.icon}</div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn("text-sm text-[#212121] break-words overflow-wrap-anywhere", notif.unread ? "font-bold" : "font-medium")}>{notif.title}</span>
                          <span className="text-[10px] text-[#9E9E9E] whitespace-nowrap flex-shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-xs text-[#616161] leading-relaxed break-words overflow-wrap-anywhere">{notif.message}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center flex justify-between px-4">
                <button 
                  onClick={() => markAsRead()}
                  className="text-xs font-bold text-[#757575] hover:text-[#212121]"
                >
                  Mark all as read
                </button>
                <button className="text-xs font-bold text-[#7C3AED] hover:underline">View All</button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

