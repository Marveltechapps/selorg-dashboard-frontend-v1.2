import React, { useState } from 'react';
import { LogOut, Store, Star, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { DARKSTORE_NAV_SECTIONS } from '../layouts/sidebar/darkstoreNavigationConfig';
import { isNavItemVisible } from '../layouts/sidebar/darkstoreRoleNav';
import { useDarkstoreNavCounts } from './darkstore/useDarkstoreNavCounts';
import { useDarkstore } from './darkstore/DarkstoreProvider';
import { darkstorePreferences } from './darkstore/darkstorePreferences';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold darkstore-sidebar-label">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar({ activeTab, setActiveTab, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const { activeStoreId, user, switchStore } = useAuth();
  const counts = useDarkstoreNavCounts();
  const { sidebarCollapsed, setSidebarCollapsed, isFavorite, toggleFavorite, preferences } = useDarkstore();
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of DARKSTORE_NAV_SECTIONS) {
      const collapsed = preferences.navSectionsCollapsed[section.category] ?? section.collapseDefault ?? false;
      initial[section.category] = !collapsed;
    }
    return initial;
  });

  const stores = user?.assignedStores?.length
    ? user.assignedStores
    : activeStoreId
      ? [activeStoreId]
      : [];

  const isMultiStore = (user?.assignedStores?.length ?? 0) > 1;
  const isManagerRole = preferences.opsRole === 'manager';

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const badgeFor = (key?: string) => {
    if (!key) return 0;
    return counts[key as keyof typeof counts] ?? 0;
  };

  const favoriteItems = DARKSTORE_NAV_SECTIONS.flatMap((s) => s.items).filter(
    (item) =>
      preferences.favoriteTabs.includes(item.id) &&
      isNavItemVisible(item.id, preferences.opsRole, { isMultiStore, isManagerRole })
  );

  const renderNavButton = (item: (typeof DARKSTORE_NAV_SECTIONS)[0]['items'][0], showStar?: boolean) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id || (item.aliases?.includes(activeTab) ?? false);
    const count = badgeFor(item.badgeKey);
    const fav = isFavorite(item.id);

    const btn = (
      <div
        key={item.id}
        className={cn(
          'darkstore-sidebar-nav-item w-full h-9 px-3 flex items-center gap-3 transition-all rounded-md relative group',
          isActive
            ? 'bg-[var(--ds-primary)] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
            : 'text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white'
        )}
      >
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 h-full text-left"
          onClick={() => {
            setActiveTab(item.id);
            onMobileClose?.();
          }}
        >
          <Icon
            size={16}
            className={cn('shrink-0', isActive ? 'text-white' : 'text-[#808080] group-hover:text-white')}
          />
          <span className="darkstore-sidebar-label text-sm font-medium truncate flex-1">{item.label}</span>
          <NavBadge count={count} />
        </button>
        {showStar && (
          <button
            type="button"
            className={cn(
              'darkstore-sidebar-label p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
              fav && 'opacity-100 text-amber-400'
            )}
            onClick={() => toggleFavorite(item.id)}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={12} fill={fav ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
            {count > 0 ? ` (${count})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <TooltipProvider delayDuration={0}>
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
          'darkstore-sidebar-nav w-[260px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937] transition-[width] duration-200',
          mobileOpen && 'is-open'
        )}
      >
        {/* Brand + collapse */}
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#5289CD] flex items-center justify-center text-white font-bold text-sm shrink-0">
              S
            </div>
            <div className="darkstore-sidebar-label min-w-0">
              <p className="font-bold text-sm text-white truncate">Selorg Darkstore</p>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Ops Command</p>
            </div>
          </div>
          <button
            type="button"
            className="hidden md:flex p-1.5 rounded-md text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Store switcher */}
        <div className="p-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider darkstore-sidebar-label">
            <Store size={12} />
            <span>Your Store</span>
          </div>
          {stores.length > 1 ? (
            <Select value={activeStoreId || ''} onValueChange={(v) => switchStore(v)}>
              <SelectTrigger className="w-full bg-[#1F2937] border-[#32537A]/30 text-white h-9 darkstore-sidebar-store-detail">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full bg-[#1F2937] p-2.5 rounded-lg border border-[#32537A]/30 darkstore-sidebar-store-detail">
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white">{activeStoreId || 'No Store'}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  <span className="text-[10px] text-[#4ADE80]">Online</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
          {/* Favorites */}
          {favoriteItems.length > 0 && (
            <div>
              <button
                type="button"
                className="darkstore-sidebar-section-title w-full px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2"
                onClick={() => setFavoritesOpen((v) => !v)}
              >
                <span>Pinned</span>
                <ChevronsUpDown size={12} className="darkstore-sidebar-label" />
              </button>
              {favoritesOpen && (
                <div className="space-y-0.5">
                  {favoriteItems.map((item) => renderNavButton(item, false))}
                </div>
              )}
            </div>
          )}

          {DARKSTORE_NAV_SECTIONS.map((section) => (
            <div key={section.category}>
              <button
                type="button"
                className="darkstore-sidebar-section-title w-full px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2 hover:text-[#9CA3AF]"
                onClick={() => {
                  setSectionOpen((prev) => {
                    const next = { ...prev, [section.category]: !prev[section.category] };
                    darkstorePreferences.setNavSectionCollapsed(section.category, !next[section.category]);
                    return next;
                  });
                }}
              >
                <span>{section.category}</span>
                <ChevronsUpDown size={12} className="darkstore-sidebar-label" />
              </button>
              {sectionOpen[section.category] !== false && (
                <div className="space-y-0.5">
                  {section.items
                    .filter((item) =>
                      isNavItemVisible(item.id, preferences.opsRole, { isMultiStore, isManagerRole })
                    )
                    .map((item) => renderNavButton(item, true))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1F2937] bg-[#111827]">
          <div className="flex items-center gap-3 hover:bg-[#1F2937] p-2 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#32537A] flex items-center justify-center border border-[#3D6AA1] text-white font-bold text-xs shrink-0">
              {userInitials}
            </div>
            <div className="darkstore-sidebar-user-detail flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#808080] truncate capitalize">{user?.role || 'Operator'}</p>
            </div>
            <button type="button" onClick={onLogout} className="darkstore-sidebar-label">
              <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
