import React, { useEffect, useState } from 'react';
import { MerchSidebar } from './merch/MerchSidebar';
import { MerchTopBar } from './merch/MerchTopBar';
import { MerchOverview } from './screens/merch/MerchOverview';
import { CatalogMerch } from './screens/merch/CatalogMerch';
import { PricingEngine } from './screens/merch/PricingEngine';
import { PromoCampaigns } from './screens/merch/PromoCampaigns';
import { AllocationStock } from './screens/merch/AllocationStock';
import { GeofenceTargeting } from './screens/merch/geofence/GeofenceTargeting';
import { MerchAnalytics } from './screens/merch/MerchAnalytics';
import { MerchAlerts } from './screens/merch/MerchAlerts';
import { ComplianceApprovals } from './screens/merch/ComplianceApprovals';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import {
  MERCH_TAB_ALIASES,
  MERCH_TAB_IDS,
  REMOVED_MERCH_TABS,
} from '../layouts/sidebar/merchNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

export function MerchManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, MERCH_TAB_ALIASES);
  const effectiveTab = (MERCH_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState('North America');
  const [scope, setScope] = useState<'Global' | 'Local'>('Global');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useEffect(() => {
    if (REMOVED_MERCH_TABS.has(rawTab)) {
      setActiveTab('overview');
    }
  }, [rawTab, setActiveTab]);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, MERCH_TAB_ALIASES));
    };
    window.addEventListener('merch:navigate', onNav);
    return () => window.removeEventListener('merch:navigate', onNav);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <MerchSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      
      <div className="merch-content-area">
        <MerchTopBar
          onMenuClick={() => setSidebarOpen(true)}
          filterQuery={searchQuery}
          onFilterQueryChange={setSearchQuery}
        />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            <DashboardBreadcrumbs dashboard="merch" activeTab={effectiveTab} />
            <HubRequiredGuard title="Select a merchandising hub">
            {effectiveTab === 'overview' && (
                <MerchOverview 
                    onNavigate={setActiveTab} 
                    searchQuery={searchQuery} 
                    onSearchChange={setSearchQuery}
                />
            )}
            {effectiveTab === 'catalog' && <CatalogMerch searchQuery={searchQuery} />}
            {effectiveTab === 'pricing' && <PricingEngine searchQuery={searchQuery} />}
            {effectiveTab === 'promotions' && <PromoCampaigns searchQuery={searchQuery} region={region} scope={scope} onNavigate={setActiveTab} />}
            {effectiveTab === 'allocation' && <AllocationStock searchQuery={searchQuery} />}
            {effectiveTab === 'geofence' && <GeofenceTargeting searchQuery={searchQuery} />}
            {effectiveTab === 'analytics' && <MerchAnalytics searchQuery={searchQuery} onNavigate={setActiveTab} />}
            {effectiveTab === 'alerts' && <MerchAlerts searchQuery={searchQuery} onNavigate={setActiveTab} />}
            {effectiveTab === 'compliance' && <ComplianceApprovals searchQuery={searchQuery} />}
            </HubRequiredGuard>
        </main>
      </div>
    </div>
  );
}
