import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  ShoppingCart, 
  Truck, 
  Package, 
  ClipboardCheck, 
  CheckSquare, 
  AlertTriangle, 
  MessageSquare, 
  BarChart3, 
  Activity, 
  CreditCard, 
  Wrench,
  LogOut,
  Store,
  Users
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || "";
  if (!raw) return "Hub";
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

interface VendorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function VendorSidebar({ activeTab, setActiveTab, onLogout }: VendorSidebarProps) {
  const { user, activeStoreId } = useAuth();
  const hubLabel = formatHubLabel(user?.hubKey ?? activeStoreId);

  const navItems = [
    { id: 'overview', label: 'Vendor Overview', icon: LayoutDashboard },
    { id: 'vendor-list', label: 'Vendor List', icon: Users },
    { id: 'onboarding', label: 'Onboarding & Approval', icon: UserPlus },
    { id: 'po', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'inbound', label: 'Inbound Operations', icon: Truck },
    { id: 'inventory', label: 'Inventory Coordination', icon: Package },
    { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    { id: 'approvals', label: 'Task Approvals', icon: CheckSquare },
    { id: 'alerts', label: 'Alerts & Notifications', icon: AlertTriangle },
    { id: 'communication', label: 'Communication Hub', icon: MessageSquare },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'system', label: 'System Monitoring', icon: Activity },
    { id: 'finance', label: 'Finance Integration', icon: CreditCard },
    { id: 'utilities', label: 'Utilities & Tools', icon: Wrench },
  ];

  return (
    <div className="w-[240px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
      {/* Hub label from JWT / user (matches backend tenant for all vendor API data) */}
      <div className="p-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
          <Store size={12} />
          <span>Current Hub</span>
        </div>
        <div className="w-full bg-[#1F2937] p-2.5 rounded-lg flex items-center justify-between border border-[#1F2937]">
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-white">{hubLabel}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] text-[#F97316]">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(102,126,234,0.3)] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(102,126,234,0.6)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group",
                isActive 
                  ? "bg-[#4F46E5] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
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
          <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center border border-[#3730A3] text-white font-bold text-xs">
            VM
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Vendor Mgr.</p>
            <p className="text-xs text-[#808080] truncate">Supply Chain</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}