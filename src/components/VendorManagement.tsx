import React, { Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { VendorSidebar } from './vendor/VendorSidebar';
import { VendorTopBar } from './vendor/VendorTopBar';
import { CardSkeleton } from './ui/ux-components';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import { VENDOR_TAB_ALIASES, VENDOR_TAB_IDS } from '../layouts/sidebar/vendorNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

const VendorOverview = React.lazy(() =>
  import('./screens/vendor/VendorOverview').then((m) => ({ default: m.VendorOverview }))
);
const VendorList = React.lazy(() =>
  import('./screens/vendor/VendorListComplete').then((m) => ({ default: m.VendorList }))
);
const PurchaseOrders = React.lazy(() =>
  import('./screens/vendor/PurchaseOrders').then((m) => ({ default: m.PurchaseOrders }))
);
const InboundOperations = React.lazy(() =>
  import('./screens/vendor/InboundOperations').then((m) => ({ default: m.InboundOperations }))
);
const InventoryCoordination = React.lazy(() =>
  import('./screens/vendor/InventoryCoordination').then((m) => ({ default: m.InventoryCoordination }))
);
const QCCompliance = React.lazy(() =>
  import('./screens/vendor/QCCompliance').then((m) => ({ default: m.QCCompliance }))
);
const VendorTaskApprovals = React.lazy(() =>
  import('./screens/vendor/VendorTaskApprovals').then((m) => ({ default: m.VendorTaskApprovals }))
);
const VendorAlerts = React.lazy(() =>
  import('./screens/vendor/VendorAlerts').then((m) => ({ default: m.VendorAlerts }))
);
const ReportsAnalytics = React.lazy(() =>
  import('./screens/vendor/ReportsAnalytics').then((m) => ({ default: m.ReportsAnalytics }))
);
const VendorFinance = React.lazy(() =>
  import('./screens/vendor/VendorFinance').then((m) => ({ default: m.VendorFinance }))
);
const VendorUtilities = React.lazy(() =>
  import('./screens/vendor/VendorUtilities').then((m) => ({ default: m.VendorUtilities }))
);

export function VendorManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, VENDOR_TAB_ALIASES);
  const effectiveTab = (VENDOR_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';
  const location = useLocation();
  const [vendorSearchQuery, setVendorSearchQuery] = React.useState('');

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q != null) setVendorSearchQuery(q);
  }, [location.search]);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, VENDOR_TAB_ALIASES));
    };
    window.addEventListener('vendor:navigate', onNav);
    return () => window.removeEventListener('vendor:navigate', onNav);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#18181b] font-sans">
      <VendorSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />

      <div className="vendor-content-area">
        <VendorTopBar filterQuery={vendorSearchQuery} onFilterQueryChange={setVendorSearchQuery} />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <DashboardBreadcrumbs dashboard="vendor" activeTab={effectiveTab} />
          <HubRequiredGuard title="Select a supply hub" requireStore={false}>
          <Suspense
            fallback={
              <div className="p-6">
                <CardSkeleton count={6} columns={3} />
              </div>
            }
          >
            {effectiveTab === 'overview' && <VendorOverview searchQuery={vendorSearchQuery} />}
            {effectiveTab === 'vendor-list' && <VendorList onNavigateTab={setActiveTab} />}
            {effectiveTab === 'po' && <PurchaseOrders />}
            {effectiveTab === 'inbound' && <InboundOperations />}
            {effectiveTab === 'inventory' && <InventoryCoordination />}
            {effectiveTab === 'qc' && <QCCompliance />}
            {effectiveTab === 'approvals' && <VendorTaskApprovals />}
            {effectiveTab === 'alerts' && <VendorAlerts />}
            {effectiveTab === 'analytics' && <ReportsAnalytics />}
            {effectiveTab === 'finance' && <VendorFinance />}
            {effectiveTab === 'utilities' && <VendorUtilities />}
          </Suspense>
          </HubRequiredGuard>
        </main>
      </div>
    </div>
  );
}