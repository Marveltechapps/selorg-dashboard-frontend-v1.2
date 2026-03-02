import React from 'react';
import { 
  LayoutDashboard, 
  ArrowDownToLine, 
  Package, 
  ArrowUpFromLine, 
  ArrowRightLeft, 
  ClipboardCheck, 
  Users, 
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  ChevronDown,
  LogOut,
  Warehouse
} from 'lucide-react';
import { cn } from "../../lib/utils";

interface WarehouseSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function WarehouseSidebar({ activeTab, setActiveTab, onLogout }: WarehouseSidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Warehouse Overview', icon: LayoutDashboard },
    { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine },
    { id: 'inventory', label: 'Inventory & Storage', icon: Package },
    { id: 'outbound', label: 'Outbound Ops', icon: ArrowUpFromLine },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    { id: 'workforce', label: 'Workforce & Shifts', icon: Users },
    { id: 'equipment', label: 'Equipment & Assets', icon: Wrench },
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
        <details className="relative group">
          <summary className="list-none [&::-webkit-details-marker]:hidden w-full bg-[#1E293B] hover:bg-[#334155] transition-colors p-2.5 rounded-lg flex items-center justify-between cursor-pointer border border-transparent hover:border-[#0891b2] outline-none">
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm text-white">Central Warehouse A</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#0891b2] animate-pulse shadow-[0_0_8px_rgba(8,145,178,0.5)]" />
                <span className="text-[10px] text-[#0891b2]">Operational</span>
              </div>
            </div>
            <ChevronDown size={14} className="text-[#64748B] group-hover:text-white transition-transform group-open:rotate-180" />
          </summary>
          
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-[#0891b2] rounded-lg shadow-xl overflow-hidden z-50">
            <div className="p-2.5 hover:bg-[#334155] cursor-pointer flex items-center justify-between border-b border-[#0891b2]/50 transition-colors">
               <div className="flex flex-col items-start">
                 <span className="font-bold text-sm text-[#E2E8F0]">Regional Hub B</span>
                 <div className="flex items-center gap-1.5 mt-1">
                   <span className="w-2 h-2 rounded-full bg-[#0891b2]" />
                   <span className="text-[10px] text-[#0891b2]">Operational</span>
                 </div>
               </div>
            </div>
          </div>
        </details>
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
          <div className="w-8 h-8 rounded-full bg-[#0891b2] flex items-center justify-center border border-[#0e7490] text-white font-bold text-xs">
            WM
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Warehouse Mgr.</p>
            <p className="text-xs text-[#94A3B8] truncate">Operations Lead</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#64748B] hover:text-[#F87171]" />
          </button>
        </div>
      </div>
    </div>
  );
}
