import React from 'react';
import { LogOut, Store } from 'lucide-react';
import { cn } from "../lib/utils";
import { useAuth } from '../contexts/AuthContext';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { DARKSTORE_NAV_SECTIONS } from '../layouts/sidebar/darkstoreNavigationConfig';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const { activeStoreId, user } = useAuth();

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'darkstore-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'darkstore-sidebar-nav w-[260px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]',
          mobileOpen && 'is-open'
        )}
      >
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {DARKSTORE_NAV_SECTIONS.map((section) => (
            <div key={section.category}>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">
                {section.category}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        onMobileClose?.();
                      }}
                      className={cn(
                        'w-full h-9 px-3 flex items-center gap-3 transition-all rounded-md relative group',
                        isActive
                          ? 'bg-[#5289CD] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                          : 'text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white'
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(isActive ? 'text-white' : 'text-[#808080] group-hover:text-white')}
                      />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#1F2937] bg-[#111827]">
          <div className="flex items-center gap-3 hover:bg-[#1F2937] p-2 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#32537A] flex items-center justify-center border border-[#3D6AA1] text-white font-bold text-xs shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#808080] truncate capitalize">{user?.role || 'Operator'}</p>
            </div>
            <button type="button" onClick={onLogout}>
              <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
