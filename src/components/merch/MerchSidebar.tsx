import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tag, 
  Megaphone, 
  Boxes, 
  Map, 
  BarChart3, 
  AlertTriangle, 
  ShieldCheck,
  ChevronDown,
  LogOut,
  Store
} from 'lucide-react';
import { cn } from "../../lib/utils";

interface MerchSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function MerchSidebar({ activeTab, setActiveTab, onLogout }: MerchSidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Merchandising Overview', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catalog Merchandising', icon: ShoppingBag },
    { id: 'pricing', label: 'Pricing Engine', icon: Tag },
    { id: 'promotions', label: 'Promotion Campaigns', icon: Megaphone },
    { id: 'allocation', label: 'Allocation & Stock', icon: Boxes },
    { id: 'geofence', label: 'Geofence & Targeting', icon: Map },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
    { id: 'compliance', label: 'Compliance & Approvals', icon: ShieldCheck },
  ];

  return (
    <div className="w-[220px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
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
                  ? "bg-[#7C3AED] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
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
          <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center border border-[#5B21B6] text-white font-bold text-xs">
            AL
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Alice L.</p>
            <p className="text-xs text-[#808080] truncate">Head of Merch</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}
