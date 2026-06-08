import React, { useCallback, useState } from 'react';
import { LogOut, Star, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { DASHBOARD_BRANDS } from '@/utils/dashboardFavicon';
import type { OpsNavItem, OpsNavSection } from '@/layouts/sidebar/opsNavigationTypes';
import {
  getOpsSidebarPreferences,
  toggleOpsFavorite,
  isOpsFavorite,
  setOpsNavSectionCollapsed,
  setOpsSidebarCollapsed,
} from '@/layouts/sidebar/opsSidebarPreferences';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type DashboardId = keyof typeof DASHBOARD_BRANDS;

interface OpsSidebarTheme {
  navClass: string;
  mobileClass: string;
  bg: string;
  border: string;
  text: string;
  textMuted: string;
  hoverBg: string;
  hoverText: string;
  activeBg: string;
  activeShadow: string;
  sectionTitle: string;
  headerBorder: string;
  footerBg: string;
  avatarBg: string;
  avatarBorder: string;
  avatarAccent: string;
}

const THEMES: Record<DashboardId, OpsSidebarTheme> = {
  admin: {
    navClass: 'admin-sidebar-nav',
    mobileClass: 'admin-mobile-only',
    bg: 'bg-[#09090b]',
    border: 'border-[#27272a]',
    text: 'text-[#a1a1aa]',
    textMuted: 'text-[#71717a]',
    hoverBg: 'hover:bg-[#27272a]',
    hoverText: 'hover:text-[#e4e4e7]',
    activeBg: 'bg-[#e11d48]',
    activeShadow: 'shadow-[0_1px_8px_rgba(225,29,72,0.4)]',
    sectionTitle: 'text-[#52525b]',
    headerBorder: 'border-[#27272a]',
    footerBg: 'bg-[#09090b]',
    avatarBg: 'bg-[#27272a]',
    avatarBorder: 'border-[#3f3f46]',
    avatarAccent: 'text-[#e11d48] group-hover:bg-[#e11d48] group-hover:text-white',
  },
  warehouse: {
    navClass: 'warehouse-sidebar-nav',
    mobileClass: 'warehouse-mobile-only',
    bg: 'bg-[#0F172A]',
    border: 'border-[#1E293B]',
    text: 'text-[#E2E8F0]',
    textMuted: 'text-[#94A3B8]',
    hoverBg: 'hover:bg-[#1E293B]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#0891b2]',
    activeShadow: 'shadow-[0_2px_4px_rgba(8,145,178,0.3)]',
    sectionTitle: 'text-[#64748B]',
    headerBorder: 'border-[#1E293B]',
    footerBg: 'bg-[#0F172A]',
    avatarBg: 'bg-[#1E293B]',
    avatarBorder: 'border-[#334155]',
    avatarAccent: 'text-[#0891b2] group-hover:bg-[#0891b2] group-hover:text-white',
  },
  finance: {
    navClass: 'finance-sidebar-nav',
    mobileClass: 'finance-mobile-only',
    bg: 'bg-[#0F172A]',
    border: 'border-[#1E293B]',
    text: 'text-[#E2E8F0]',
    textMuted: 'text-[#94A3B8]',
    hoverBg: 'hover:bg-[#1E293B]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#14B8A6]',
    activeShadow: 'shadow-[0_2px_4px_rgba(20,184,166,0.3)]',
    sectionTitle: 'text-[#64748B]',
    headerBorder: 'border-[#1E293B]',
    footerBg: 'bg-[#0F172A]',
    avatarBg: 'bg-[#1E293B]',
    avatarBorder: 'border-[#334155]',
    avatarAccent: 'text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white',
  },
  merch: {
    navClass: 'merch-sidebar-nav',
    mobileClass: 'merch-mobile-only',
    bg: 'bg-[#1E1B2E]',
    border: 'border-[#2D2640]',
    text: 'text-[#C4B5FD]',
    textMuted: 'text-[#8B7AB8]',
    hoverBg: 'hover:bg-[#2D2640]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#7C3AED]',
    activeShadow: 'shadow-[0_2px_4px_rgba(124,58,237,0.3)]',
    sectionTitle: 'text-[#6B5B95]',
    headerBorder: 'border-[#2D2640]',
    footerBg: 'bg-[#1E1B2E]',
    avatarBg: 'bg-[#2D2640]',
    avatarBorder: 'border-[#3D3455]',
    avatarAccent: 'text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white',
  },
  rider: {
    navClass: 'rider-sidebar-nav',
    mobileClass: 'rider-mobile-only',
    bg: 'bg-[#1C1410]',
    border: 'border-[#3D2B1F]',
    text: 'text-[#FED7AA]',
    textMuted: 'text-[#C2785C]',
    hoverBg: 'hover:bg-[#3D2B1F]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#F97316]',
    activeShadow: 'shadow-[0_2px_4px_rgba(249,115,22,0.3)]',
    sectionTitle: 'text-[#9A6B4F]',
    headerBorder: 'border-[#3D2B1F]',
    footerBg: 'bg-[#1C1410]',
    avatarBg: 'bg-[#3D2B1F]',
    avatarBorder: 'border-[#5C3D2E]',
    avatarAccent: 'text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white',
  },
  vendor: {
    navClass: 'vendor-sidebar-nav',
    mobileClass: 'vendor-mobile-only',
    bg: 'bg-[#0F0F1A]',
    border: 'border-[#1E1E30]',
    text: 'text-[#C7D2FE]',
    textMuted: 'text-[#818CF8]',
    hoverBg: 'hover:bg-[#1E1E30]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#4F46E5]',
    activeShadow: 'shadow-[0_2px_4px_rgba(79,70,229,0.3)]',
    sectionTitle: 'text-[#6366F1]',
    headerBorder: 'border-[#1E1E30]',
    footerBg: 'bg-[#0F0F1A]',
    avatarBg: 'bg-[#1E1E30]',
    avatarBorder: 'border-[#2E2E45]',
    avatarAccent: 'text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white',
  },
  production: {
    navClass: 'production-sidebar-nav',
    mobileClass: 'production-mobile-only',
    bg: 'bg-[#0A1A0F]',
    border: 'border-[#1A3020]',
    text: 'text-[#BBF7D0]',
    textMuted: 'text-[#6EE7B7]',
    hoverBg: 'hover:bg-[#1A3020]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[#16A34A]',
    activeShadow: 'shadow-[0_2px_4px_rgba(22,163,74,0.3)]',
    sectionTitle: 'text-[#4ADE80]',
    headerBorder: 'border-[#1A3020]',
    footerBg: 'bg-[#0A1A0F]',
    avatarBg: 'bg-[#1A3020]',
    avatarBorder: 'border-[#2D4A35]',
    avatarAccent: 'text-[#16A34A] group-hover:bg-[#16A34A] group-hover:text-white',
  },
  darkstore: {
    navClass: 'darkstore-sidebar-nav',
    mobileClass: 'darkstore-mobile-only',
    bg: 'bg-[#111827]',
    border: 'border-[#1F2937]',
    text: 'text-[#E6E6E6]',
    textMuted: 'text-[#808080]',
    hoverBg: 'hover:bg-[#1F2937]',
    hoverText: 'hover:text-white',
    activeBg: 'bg-[var(--ds-primary)]',
    activeShadow: 'shadow-[0_2px_4px_rgba(0,0,0,0.2)]',
    sectionTitle: 'text-[#6B7280]',
    headerBorder: 'border-[#1F2937]',
    footerBg: 'bg-[#111827]',
    avatarBg: 'bg-[#32537A]',
    avatarBorder: 'border-[#3D6AA1]',
    avatarAccent: 'text-white',
  },
};

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ops-sidebar-label ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export interface OpsSidebarProps {
  dashboardId: DashboardId;
  title: string;
  subtitle?: string;
  sections: OpsNavSection[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  badgeCounts?: Record<string, number>;
  favoriteDefaults?: string[];
  /** Extra active-tab ids that should highlight a nav item (e.g. CMS children) */
  activeTabAliases?: Record<string, string>;
  headerSlot?: React.ReactNode;
  filterItem?: (item: OpsNavItem) => boolean;
  userName?: string;
  userRole?: string;
  userInitials?: string;
}

export function OpsSidebar({
  dashboardId,
  title,
  subtitle,
  sections,
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
  badgeCounts = {},
  favoriteDefaults = [],
  activeTabAliases = {},
  headerSlot,
  filterItem,
  userName = 'User',
  userRole = 'Operator',
  userInitials = 'U',
}: OpsSidebarProps) {
  const theme = THEMES[dashboardId];
  const brand = DASHBOARD_BRANDS[dashboardId];
  const [c1, c2] = brand.colors;

  const [prefs, setPrefs] = useState(() => {
    const p = getOpsSidebarPreferences(dashboardId);
    if (p.favoriteTabs.length === 0 && favoriteDefaults.length > 0) {
      return { ...p, favoriteTabs: [...favoriteDefaults] };
    }
    return p;
  });
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      const collapsed = prefs.navSectionsCollapsed[section.category] ?? section.collapseDefault ?? false;
      initial[section.category] = !collapsed;
    }
    return initial;
  });

  const sidebarCollapsed = prefs.sidebarCollapsed;

  const badgeFor = (key?: string) => (key ? badgeCounts[key] ?? 0 : 0);

  const isItemActive = useCallback(
    (item: OpsNavItem) => {
      if (activeTab === item.id) return true;
      if (item.aliases?.includes(activeTab)) return true;
      if (activeTabAliases[item.id] === activeTab) return true;
      return false;
    },
    [activeTab, activeTabAliases],
  );

  const allItems = sections.flatMap((s) => s.items);
  const favoriteItems = allItems.filter(
    (item) => prefs.favoriteTabs.includes(item.id) && (!filterItem || filterItem(item)),
  );

  const handleToggleFavorite = (tabId: string) => {
    toggleOpsFavorite(dashboardId, tabId);
    setPrefs(getOpsSidebarPreferences(dashboardId));
  };

  const handleToggleCollapse = () => {
    const next = !sidebarCollapsed;
    setOpsSidebarCollapsed(dashboardId, next);
    setPrefs(getOpsSidebarPreferences(dashboardId));
    document.documentElement.classList.toggle(`ops-sidebar-collapsed-${dashboardId}`, next);
  };

  const renderNavButton = (item: OpsNavItem, showStar?: boolean) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const count = badgeFor(item.badgeKey);
    const fav = isOpsFavorite(dashboardId, item.id);

    const btn = (
      <div
        key={item.id}
        className={cn(
          'ops-sidebar-nav-item w-full h-9 px-3 flex items-center gap-3 transition-all rounded-md relative group',
          isActive ? cn(theme.activeBg, 'text-white', theme.activeShadow) : cn(theme.text, theme.hoverBg, theme.hoverText),
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
          <Icon size={16} className={cn('shrink-0', isActive ? 'text-white' : cn(theme.textMuted, 'group-hover:text-white'))} />
          <span className="ops-sidebar-label text-sm font-medium truncate flex-1">{item.label}</span>
          <NavBadge count={count} />
        </button>
        {showStar && (
          <button
            type="button"
            className={cn(
              'ops-sidebar-label p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
              fav && 'opacity-100 text-amber-400',
            )}
            onClick={() => handleToggleFavorite(item.id)}
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
            theme.mobileClass,
            'fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          theme.navClass,
          'w-[260px] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r transition-[width] duration-200',
          theme.bg,
          theme.border,
          mobileOpen && 'is-open',
          sidebarCollapsed && `ops-sidebar-collapsed-${dashboardId}`,
        )}
      >
        <div className={cn('p-4 border-b flex items-center justify-between gap-2', theme.headerBorder)}>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {brand.initial}
            </div>
            <div className="ops-sidebar-label min-w-0">
              <p className="font-bold text-sm text-white truncate">{title}</p>
              {subtitle && (
                <p className={cn('text-[10px] uppercase tracking-wider truncate', theme.textMuted)}>{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className={cn('ops-sidebar-label hidden md:flex p-1.5 rounded-md', theme.textMuted, theme.hoverBg, theme.hoverText)}
            onClick={handleToggleCollapse}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {headerSlot && <div className={cn('p-4 border-b', theme.headerBorder)}>{headerSlot}</div>}

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
          {favoriteItems.length > 0 && (
            <div>
              <button
                type="button"
                className={cn(
                  'ops-sidebar-label w-full px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2',
                  theme.sectionTitle,
                )}
                onClick={() => setFavoritesOpen((v) => !v)}
              >
                <span>Pinned</span>
                <ChevronsUpDown size={12} />
              </button>
              {favoritesOpen && (
                <div className="space-y-0.5">{favoriteItems.map((item) => renderNavButton(item, false))}</div>
              )}
            </div>
          )}

          {sections.map((section) => (
            <div key={section.category}>
              <button
                type="button"
                className={cn(
                  'ops-sidebar-label w-full px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2',
                  theme.sectionTitle,
                  theme.hoverText,
                )}
                onClick={() => {
                  setSectionOpen((prev) => {
                    const next = { ...prev, [section.category]: !prev[section.category] };
                    setOpsNavSectionCollapsed(dashboardId, section.category, !next[section.category]);
                    setPrefs(getOpsSidebarPreferences(dashboardId));
                    return next;
                  });
                }}
              >
                <span>{section.category}</span>
                <ChevronsUpDown size={12} />
              </button>
              {sectionOpen[section.category] !== false && (
                <div className="space-y-0.5">
                  {section.items
                    .filter((item) => !item.hidden && (!filterItem || filterItem(item)))
                    .map((item) => renderNavButton(item, true))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className={cn('p-4 border-t', theme.headerBorder, theme.footerBg)}>
          <div className={cn('flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group', theme.hoverBg)}>
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 transition-colors',
                theme.avatarBg,
                theme.avatarBorder,
                theme.avatarAccent,
              )}
            >
              {userInitials}
            </div>
            <div className="ops-sidebar-user-detail flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className={cn('text-xs truncate capitalize', theme.textMuted)}>{userRole}</p>
            </div>
            {onLogout && (
              <button type="button" onClick={onLogout} className="ops-sidebar-label">
                <LogOut size={16} className={cn(theme.textMuted, 'hover:text-red-400')} />
              </button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
