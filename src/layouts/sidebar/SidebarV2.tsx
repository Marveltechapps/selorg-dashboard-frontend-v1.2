import React, { useMemo, useState } from 'react';
import { ChevronDown, LogOut, Store } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { NAVIGATION_STRUCTURE, NavSection, NavItem } from './navigationConfig';
import { resolveEffectivePermissions, userHasPermission } from '../../utils/permissions';

interface SidebarV2Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export function SidebarV2({ activeTab, setActiveTab, onLogout }: SidebarV2Props) {
  const { activeStoreId, user } = useAuth();
  const effectivePermissions = useMemo(
    () => resolveEffectivePermissions(user?.permissions, user?.role),
    [user?.permissions, user?.role]
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(NAVIGATION_STRUCTURE.map(s => [s.id, s.defaultOpen]))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const canViewItem = (permission?: string): boolean => {
    if (!permission) return true;
    if (!user) return false;
    return userHasPermission(effectivePermissions, permission);
  };

  const canViewSection = (section: NavSection): boolean => {
    if (!section.permission) return true;
    return canViewItem(section.permission);
  };

  return (
    <div className="w-[260px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
      {/* Store Indicator */}
      <div className="p-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
          <Store size={12} />
          <span>Store</span>
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
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAVIGATION_STRUCTURE.map((section) => {
          if (!canViewSection(section)) return null;
          
          const SectionIcon = section.icon;
          const isExpanded = expandedSections[section.id];
          const visibleItems = section.items.filter(item => canViewItem(item.permission));

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group text-left",
                  "text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white"
                )}
              >
                <SectionIcon size={16} className="text-[#808080] group-hover:text-white" />
                <span className="text-xs font-bold uppercase tracking-wider flex-1">{section.title}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    isExpanded ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="mt-1 space-y-0.5 pl-3 border-l border-[#1F2937]">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full h-9 px-3 flex items-center gap-3 transition-all rounded-lg relative group text-left",
                          isActive
                            ? "bg-[#5289CD] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                            : "text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white"
                        )}
                      >
                        <Icon size={16} className={cn(isActive ? "text-white" : "text-[#808080] group-hover:text-white")} />
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
