import React, { useEffect, useMemo, useState } from 'react';
import { createBackdropClickHandler } from "@/components/ui/modalOverlayGuards";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  RotateCcw,
  Scale,
  Truck,
  BookOpen,
  FileText,
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Wrench,
  LogOut,
  Store,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DASHBOARD_BRANDS } from '@/utils/dashboardFavicon';
import { getAuthUser, useAuth, type AuthUser } from '@/contexts/AuthContext';

function formatEntityLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || '';
  if (!raw || raw === 'default') return 'Global HQ';
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface FinanceSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function FinanceSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
}: FinanceSidebarProps) {
  const { activeStoreId, user: authUser } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);

  useEffect(() => {
    setProfile(getAuthUser());
  }, []);

  const financeBrand = DASHBOARD_BRANDS.finance;
  const [c1, c2] = financeBrand.colors;

  const entityLabel = useMemo(
    () => formatEntityLabel(authUser?.hubKey ?? activeStoreId ?? profile?.primaryStoreId),
    [authUser?.hubKey, activeStoreId, profile?.primaryStoreId]
  );

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || 'F';
    return (
      source
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'F'
    );
  }, [profile?.name, profile?.email]);

  const roleLabel =
    profile?.roleName ||
    (profile?.role ? profile.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null) ||
    'Finance';

  const navItems = [
    { id: 'overview', label: 'Finance Overview', icon: LayoutDashboard },
    { id: 'customer-payments', label: 'Customer Payments', icon: CreditCard },
    { id: 'vendor-payments', label: 'Vendor & Suppliers', icon: Wallet },
    { id: 'rider-cash', label: 'Rider Cash', icon: Truck },
    { id: 'refunds', label: 'Refunds & Returns', icon: RotateCcw },
    { id: 'picker-payouts', label: 'Picker Payouts', icon: Users },
    { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
    { id: 'ledger', label: 'Accounting Ledger', icon: BookOpen },
    { id: 'billing', label: 'Billing & Invoicing', icon: FileText },
    { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'approvals', label: 'Task Approvals', icon: CheckSquare },
    { id: 'utilities', label: 'Utilities & Tools', icon: Wrench },
  ];

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'finance-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'finance-sidebar-nav w-[240px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]',
          mobileOpen && 'is-open'
        )}
      >
        {/* Header — matches Admin sidebar brand block */}
        <div className="p-4 border-b border-[#1F2937] flex items-center min-h-[86px]">
          <div className="flex items-center gap-2 text-white">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.45)]"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
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
                {financeBrand.initial}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Finance Operations</h1>
              <p className="text-[10px] text-[#14B8A6] font-bold tracking-wider uppercase mt-1">
                Treasury & Payments
              </p>
            </div>
          </div>
        </div>

        {/* Entity / store — static card like darkstore (no mock dropdown) */}
        <div className="p-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
            <Store size={12} />
            <span>Finance Entity</span>
          </div>
          <div className="w-full bg-[#1F2937] p-2.5 rounded-lg border border-[#14B8A6]/20">
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm text-white">{entityLabel}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                <span className="text-[10px] text-[#14B8A6]">Active</span>
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
                onClick={() => {
                  setActiveTab(item.id);
                  onMobileClose?.();
                }}
                className={cn(
                  'w-full h-10 px-3 flex items-center gap-3 transition-all rounded-lg relative group',
                  isActive
                    ? 'bg-[#14B8A6] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                    : 'text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white'
                )}
              >
                <Icon
                  size={18}
                  className={cn(isActive ? 'text-white' : 'text-[#808080] group-hover:text-white')}
                />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile — matches Admin sidebar */}
        <div className="p-4 border-t border-[#1F2937] bg-[#111827]">
          <div className="flex items-center gap-3 hover:bg-[#1F2937] p-2 rounded-lg cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center border border-[#14B8A6]/40 text-[#14B8A6] font-bold text-xs group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.name || 'Finance User'}</p>
              <p className="text-xs text-[#808080] truncate">{roleLabel}</p>
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
