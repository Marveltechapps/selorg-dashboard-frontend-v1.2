import React from 'react';
import {
  LayoutDashboard, 
  ArrowDownToLine, 
  Package,
  TabletSmartphone,
  ArrowUpFromLine, 
  ArrowRightLeft, 
  ClipboardCheck, 
  Users, 
  Clock,
  Calendar,
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  LogOut,
  Warehouse
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || "";
  if (!raw) return "Fulfillment Hub";
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

interface WarehouseSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function WarehouseSidebar({ activeTab, setActiveTab, onLogout }: WarehouseSidebarProps) {
  const { user, activeStoreId } = useAuth();
  const warehouseLabel = formatHubLabel(user?.hubKey ?? activeStoreId);
  const userInitials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleLabel = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Operator";

  const navItems = [
    { id: 'overview', label: 'Warehouse Overview', icon: LayoutDashboard },
    { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine },
    { id: 'inventory', label: 'Inventory & Storage', icon: Package },
    { id: 'outbound', label: 'Outbound Ops', icon: ArrowUpFromLine },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    { id: 'workforce', label: 'Workforce & Shifts', icon: Users },
    { id: 'shift-master', label: 'Shift Master', icon: Clock },
    { id: 'shift-roster', label: 'Shift Roster', icon: Calendar },
    { id: 'equipment', label: 'Equipment & Assets', icon: Wrench },
    { id: 'devices', label: 'Devices', icon: TabletSmartphone },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'utilities', label: 'Utilities', icon: Settings },
  ];

  return (
    <div className="w-[240px] h-screen bg-[#0F172A] text-[#E2E8F0] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1E293B]">
      {/* Category Selector */}
      <div className="p-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-2 mb-2 text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">
          <Warehouse size={12} />
          <span>Fulfillment Center</span>
        </div>
        <div className="w-full bg-[#1E293B] p-2.5 rounded-lg border border-[#1E293B]">
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-white">{warehouseLabel}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#0891b2] animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]" />
              <span className="text-[10px] text-[#0891b2]">Operational</span>
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
                "w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group",
                isActive 
                  ? "bg-[#0891b2] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                  : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : "text-[#64748B] group-hover:text-white")} />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]">
        <div className="flex items-center gap-3 hover:bg-[#1E293B] p-2 rounded-lg cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#0891b2] flex items-center justify-center border border-[#0e7490] text-white font-bold text-xs shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[#94A3B8] truncate">{roleLabel}</p>
          </div>
          <button type="button" onClick={onLogout}>
            <LogOut size={16} className="text-[#64748B] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}
