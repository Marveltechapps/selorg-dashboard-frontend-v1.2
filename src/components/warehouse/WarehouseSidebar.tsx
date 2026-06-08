import React, { useState } from 'react';
import { LogOut, Warehouse, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { WAREHOUSE_NAV_SECTIONS } from '@/layouts/sidebar/warehouseNavigationConfig';

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || '';
  if (!raw) return 'Fulfillment Hub';
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface WarehouseSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  badgeCounts?: Record<string, number>;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function WarehouseSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
  badgeCounts = {},
}: WarehouseSidebarProps) {
  const { user, activeStoreId } = useAuth();
  const warehouseLabel = formatHubLabel(user?.hubKey ?? activeStoreId);
  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Operator';

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of WAREHOUSE_NAV_SECTIONS) {
      initial[section.category] = !(section.collapseDefault ?? false);
    }
    return initial;
  });

  const badgeFor = (key?: string) => (key ? badgeCounts[key] ?? 0 : 0);

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'warehouse-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'warehouse-sidebar-nav w-[260px] h-screen bg-[#0F172A] text-[#E2E8F0] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1E293B]',
          mobileOpen && 'is-open'
        )}
      >
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

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4 custom-scrollbar">
          {WAREHOUSE_NAV_SECTIONS.map((section) => {
            const isOpen = sectionOpen[section.category] ?? true;
            return (
              <div key={section.category}>
                <button
                  type="button"
                  onClick={() =>
                    setSectionOpen((prev) => ({ ...prev, [section.category]: !isOpen }))
                  }
                  className="w-full px-3 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#64748B] hover:text-[#94A3B8]"
                >
                  {section.category}
                  <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {section.items
                      .filter((item) => !item.hidden)
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          activeTab === item.id || (item.aliases?.includes(activeTab) ?? false);
                        const count = badgeFor(item.badgeKey);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              onMobileClose?.();
                            }}
                            className={cn(
                              'w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group',
                              isActive
                                ? 'bg-[#0891b2] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                                : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                            )}
                          >
                            <Icon
                              size={18}
                              className={cn(
                                isActive ? 'text-white' : 'text-[#64748B] group-hover:text-white'
                              )}
                            />
                            <span className="text-sm font-medium truncate flex-1 text-left">
                              {item.label}
                            </span>
                            <NavBadge count={count} />
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]">
          <div className="flex items-center gap-3 hover:bg-[#1E293B] p-2 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#0891b2] flex items-center justify-center border border-[#0e7490] text-white font-bold text-xs shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#94A3B8] truncate">{roleLabel}</p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Log out">
              <LogOut size={16} className="text-[#64748B] hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
