import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Bike, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  CalendarClock, 
  MessageSquare, 
  Activity, 
  ClipboardCheck,
  ChevronDown,
  LogOut,
  Store
} from 'lucide-react';
import { cn } from "../../lib/utils";

interface RiderSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function RiderSidebar({ activeTab, setActiveTab, onLogout }: RiderSidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Rider Overview', icon: LayoutDashboard },
    { id: 'hr', label: 'Rider HR & Docs', icon: Users },
    { id: 'dispatch', label: 'Dispatch Operations', icon: MapPin },
    { id: 'fleet', label: 'Fleet & Vehicle', icon: Bike },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'shifts', label: 'Staff & Shifts', icon: CalendarClock },
    { id: 'communication', label: 'Communication Hub', icon: MessageSquare },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'approvals', label: 'Task Approvals', icon: ClipboardCheck },
  ];

  return (
    <div className="w-[220px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
      {/* Fixed single hub (Chennai) */}
      <div className="p-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
          <Store size={12} />
          <span>Current Hub</span>
        </div>
        <div className="w-full bg-[#1F2937] p-2.5 rounded-lg flex items-center justify-between border border-[#1F2937]">
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-white">Chennai Hub</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] text-[#F97316]">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full h-11 px-3 flex items-center gap-3 transition-all rounded-lg relative group",
                isActive 
                  ? "bg-[#F97316] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                  : "text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : "text-[#808080] group-hover:text-white")} />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[#1F2937] bg-[#111827]">
        <div className="flex items-center gap-3 hover:bg-[#1F2937] p-2 rounded-lg cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center border border-[#C2410C] text-white font-bold text-xs">
            OM
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Ops Manager</p>
            <p className="text-xs text-[#808080] truncate">Fleet Lead</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}
