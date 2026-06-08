import React from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OpsSidebar } from '@/components/shared/OpsSidebar';
import { VENDOR_NAV_SECTIONS } from '@/layouts/sidebar/vendorNavigationConfig';

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || '';
  if (!raw) return 'Hub';
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface VendorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function VendorSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
}: VendorSidebarProps) {
  const { user, activeStoreId } = useAuth();
  const hubLabel = formatHubLabel(user?.hubKey ?? activeStoreId);
  const userInitials = (user?.name || 'V')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Supply Chain';

  const headerSlot = (
    <>
      <div className="flex items-center gap-2 mb-2 text-[#818CF8] text-[10px] uppercase font-bold tracking-wider ops-sidebar-label">
        <Store size={12} />
        <span>Current Hub</span>
      </div>
      <div className="w-full bg-[#1E1E30] p-2.5 rounded-lg border border-[#1E1E30] ops-sidebar-label">
        <div className="flex flex-col items-start">
          <span className="font-bold text-sm text-white">{hubLabel}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
            <span className="text-[10px] text-[#818CF8]">Active</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <OpsSidebar
      dashboardId="vendor"
      title="Vendor Ops"
      subtitle="Supply Chain"
      sections={VENDOR_NAV_SECTIONS}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={onLogout}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
      favoriteDefaults={['overview', 'alerts', 'vendor-list', 'inbound']}
      headerSlot={headerSlot}
      userName={user?.name || 'Vendor Manager'}
      userRole={roleLabel}
      userInitials={userInitials}
    />
  );
}
