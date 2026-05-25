import React, { useEffect, useMemo, useState } from 'react';
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
  LogOut,
  Store,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DASHBOARD_BRANDS } from '@/utils/dashboardFavicon';
import { getAuthUser, useAuth, type AuthUser } from '@/contexts/AuthContext';

/** Merch dashboard chrome — matches main content (#7C3AED) and legacy sidebar (#111827). */
const MERCH_SIDEBAR = {
  bg: '#111827',
  border: '#1F2937',
  text: '#E6E6E6',
  muted: '#9E9E9E',
  inactive: '#B3B3B3',
  icon: '#808080',
  hoverBg: '#1F2937',
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryGlow: 'rgba(124, 58, 237, 0.45)',
} as const;

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || '';
  if (!raw || raw === 'default') return 'Chennai Hub';
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface MerchSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function MerchSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
}: MerchSidebarProps) {
  const { activeStoreId, user: authUser } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);

  useEffect(() => {
    setProfile(getAuthUser());
  }, []);

  const merchBrand = DASHBOARD_BRANDS.merch;
  const [c1, c2] = merchBrand.colors;

  const hubLabel = useMemo(
    () => formatHubLabel(authUser?.hubKey ?? activeStoreId ?? profile?.primaryStoreId),
    [authUser?.hubKey, activeStoreId, profile?.primaryStoreId]
  );

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || 'M';
    return (
      source
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'M'
    );
  }, [profile?.name, profile?.email]);

  const roleLabel =
    profile?.roleName ||
    (profile?.role ? profile.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null) ||
    'Merchandising';

  const navItems = [
    {
      category: 'Overview',
      items: [{ id: 'overview', label: 'Merchandising Overview', icon: LayoutDashboard }],
    },
    {
      category: 'Merchandising',
      items: [
        { id: 'catalog', label: 'Catalog Merchandising', icon: ShoppingBag },
        { id: 'pricing', label: 'Pricing Engine', icon: Tag },
        { id: 'promotions', label: 'Promotion Campaigns', icon: Megaphone },
        { id: 'allocation', label: 'Allocation & Stock', icon: Boxes },
        { id: 'geofence', label: 'Geofence & Targeting', icon: Map },
      ],
    },
    {
      category: 'Insights & Compliance',
      items: [
        { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
        { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
        { id: 'compliance', label: 'Compliance & Approvals', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'merch-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'merch-sidebar-nav w-[260px] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r',
          mobileOpen && 'is-open'
        )}
        style={{
          backgroundColor: MERCH_SIDEBAR.bg,
          borderColor: MERCH_SIDEBAR.border,
          color: MERCH_SIDEBAR.text,
        }}
      >
        {/* Brand header */}
        <div
          className="p-4 border-b flex items-center min-h-[86px]"
          style={{ borderColor: MERCH_SIDEBAR.border }}
        >
          <div className="flex items-center gap-2 text-white">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: `0 0 15px ${MERCH_SIDEBAR.primaryGlow}`,
              }}
            >
              <span
                className="text-white select-none"
                style={{
                  fontFamily: "'Recursive', system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                {merchBrand.initial}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Merchandising</h1>
              <p
                className="text-[10px] font-bold tracking-wider uppercase mt-1"
                style={{ color: MERCH_SIDEBAR.primary }}
              >
                Catalog &amp; Campaigns
              </p>
            </div>
          </div>
        </div>

        {/* Current hub */}
        <div className="p-4 border-b" style={{ borderColor: MERCH_SIDEBAR.border }}>
          <div
            className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold tracking-wider"
            style={{ color: MERCH_SIDEBAR.muted }}
          >
            <Store size={12} />
            <span>Current Hub</span>
          </div>
          <div
            className="w-full p-2.5 rounded-lg border"
            style={{ backgroundColor: MERCH_SIDEBAR.hoverBg, borderColor: MERCH_SIDEBAR.border }}
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm text-white">{hubLabel}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: MERCH_SIDEBAR.primary,
                    boxShadow: `0 0 8px ${MERCH_SIDEBAR.primaryGlow}`,
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: MERCH_SIDEBAR.primary }}
                >
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 custom-scrollbar">
          {navItems.map((section, idx) => (
            <div key={idx}>
              <h3
                className="px-3 text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: MERCH_SIDEBAR.muted }}
              >
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
                        'w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group',
                        isActive
                          ? 'text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                          : 'hover:text-white'
                      )}
                      style={
                        isActive
                          ? { backgroundColor: MERCH_SIDEBAR.primary }
                          : { color: MERCH_SIDEBAR.inactive }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = MERCH_SIDEBAR.hoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon
                        size={18}
                        className={cn(isActive ? 'text-white' : 'group-hover:text-white')}
                        style={!isActive ? { color: MERCH_SIDEBAR.icon } : undefined}
                      />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div
          className="p-4 border-t"
          style={{ borderColor: MERCH_SIDEBAR.border, backgroundColor: MERCH_SIDEBAR.bg }}
        >
          <div
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = MERCH_SIDEBAR.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-colors group-hover:text-white"
              style={{
                backgroundColor: MERCH_SIDEBAR.hoverBg,
                borderColor: `${MERCH_SIDEBAR.primary}66`,
                color: MERCH_SIDEBAR.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = MERCH_SIDEBAR.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = MERCH_SIDEBAR.hoverBg;
              }}
            >
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {profile?.name || 'Merch User'}
              </p>
              <p className="text-xs truncate" style={{ color: MERCH_SIDEBAR.icon }}>
                {roleLabel}
              </p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Log out">
              <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
