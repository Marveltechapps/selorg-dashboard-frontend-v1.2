import React from 'react';
import { 
  LayoutDashboard, 
  List,
  PackageSearch, 
  Warehouse, 
  ArrowDownToLine, 
  Send, 
  ClipboardCheck, 
  Users, 
  Activity, 
  Bell, 
  FileBarChart, 
  Smartphone, 
  Settings,
  Store,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  const { activeStoreId, user } = useAuth();
  const navItems = [
    { id: 'overview', label: 'Store Overview', icon: LayoutDashboard },
    { id: 'liveorders', label: 'Live Orders', icon: List },
    { id: 'pickpack', label: 'Pick & Pack Ops', icon: PackageSearch },
    { id: 'inventory', label: 'Inventory Mgmt', icon: Warehouse },
    { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine },
    { id: 'outbound', label: 'Outbound Ops', icon: Send },
    { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    { id: 'staff', label: 'Staff & Shifts', icon: Users },
    { id: 'health', label: 'Store Health', icon: Activity },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'hsd', label: 'HSD Devices', icon: Smartphone },
    { id: 'utilities', label: 'Utilities', icon: Settings },
  ];

  return (
    <div className="w-[220px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
      {/* Store Indicator */}
      <div className="p-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
          <Store size={12} />
          <span>Your Store</span>
        </div>
        <div className="w-full bg-[#1F2937] p-2.5 rounded-lg border border-[#32537A]/30">
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-white">{activeStoreId || 'No Store'}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              <span className="text-[10px] text-[#4ADE80]">Online</span>
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
                  ? "bg-[#5289CD] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
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
          <div className="w-8 h-8 rounded-full bg-[#32537A] flex items-center justify-center border border-[#3D6AA1] text-white font-bold text-xs">
            {(user?.name || 'U').split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-[#808080] truncate capitalize">{user?.role || 'Operator'}</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}
