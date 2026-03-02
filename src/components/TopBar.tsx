import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Zap, Wrench } from 'lucide-react';
import { cn } from "../lib/utils";
import { setPendingOrderSearch } from './screens/LiveOrders';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  status?: 'normal' | 'warning' | 'critical';
}

function MetricCard({ label, value, trend, trendUp, status = 'normal' }: MetricCardProps) {
  return (
    <div className={cn(
      "flex flex-col p-3 rounded-xl border shadow-sm transition-all hover:shadow-md",
      status === 'critical' ? "bg-red-50 border-red-200" : 
      status === 'warning' ? "bg-[#FFFBE6] border-[#FFE58F]" : 
      "bg-white border-[#E0E0E0]"
    )}>
      <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-wider">{label}</span>
      <div className="flex items-end justify-between mt-1">
        <span className={cn(
          "text-2xl font-bold tracking-tight",
          status === 'critical' ? "text-[#EF4444]" : 
          status === 'warning' ? "text-[#D48806]" : 
          "text-[#212121]"
        )}>{value}</span>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-full",
            trendUp ? "text-[#22C55E] bg-[#DCFCE7]" : "text-[#EF4444] bg-[#FEE2E2]"
          )}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

const SAMPLE_NOTIFICATIONS = [
  { id: '1', title: 'Order ORD-3001 ready for dispatch', time: '2 min ago', unread: true },
  { id: '2', title: 'Stock low: SKU-101 Organic Milk', time: '15 min ago', unread: true },
  { id: '3', title: 'RTO risk: ORD-4001 - 2 attempts', time: '1 hr ago', unread: false },
  { id: '4', title: 'New batch picklist created', time: '2 hrs ago', unread: false },
];

interface TopBarProps {
  setActiveTab?: (tab: string) => void;
}

export function TopBar({ setActiveTab }: TopBarProps = {}) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (setActiveTab) setActiveTab('liveorders');
    if (q) {
      navigate(`/darkstore/liveorders?q=${encodeURIComponent(q)}`, { replace: true });
      setPendingOrderSearch(q);
    }
    setSearchQuery('');
  };

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[220px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4 flex-1" />

      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMaintenanceMode(false)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors",
              !maintenanceMode ? "bg-white shadow-sm text-[#1677FF]" : "text-[#9E9E9E] hover:text-[#212121]"
            )}
          >
            <Zap size={12} fill="currentColor" />
            Online
          </button>
          <button
            type="button"
            onClick={() => setMaintenanceMode(true)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors",
              maintenanceMode ? "bg-white shadow-sm text-[#F59E0B]" : "text-[#9E9E9E] hover:text-[#212121]"
            )}
          >
            <Wrench size={12} />
            Maintenance
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input
            type="text"
            placeholder="Search order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#1677FF] focus:border-transparent w-48 transition-all focus:w-64 placeholder-[#BDBDBD]"
          />
        </form>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full shadow-sm" />
          </button>
          {notificationsOpen && (
            <div className="absolute right-2 top-full mt-2 w-80 bg-white border border-[#E0E0E0] rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[#E0E0E0]">
                <h3 className="font-bold text-sm text-[#212121]">Notifications</h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {SAMPLE_NOTIFICATIONS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-[#F5F5F5] transition-colors",
                      n.unread && "bg-[#E6F7FF]/50"
                    )}
                    onClick={() => { setNotificationsOpen(false); if (setActiveTab) setActiveTab('alerts'); }}
                  >
                    <p className="text-sm font-medium text-[#212121]">{n.title}</p>
                    <p className="text-xs text-[#757575] mt-0.5">{n.time}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
