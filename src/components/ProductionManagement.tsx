import React, { Suspense, useEffect, useState } from 'react';
import { ProductionSidebar } from './production/ProductionSidebar';
import { ProductionTopBar } from './production/ProductionTopBar';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import { useProductionFactory } from '../contexts/ProductionFactoryContext';
import { LoadingState } from './ui/ux-components';
import {
  PRODUCTION_TAB_ALIASES,
  PRODUCTION_TAB_IDS,
} from '../layouts/sidebar/productionNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

const ProductionOverview = React.lazy(() =>
  import('./screens/production/ProductionOverview').then((m) => ({ default: m.ProductionOverview }))
);
const RawMaterials = React.lazy(() =>
  import('./screens/production/RawMaterials').then((m) => ({ default: m.RawMaterials }))
);
const ProductionPlanning = React.lazy(() =>
  import('./screens/production/ProductionPlanning').then((m) => ({ default: m.ProductionPlanning }))
);
const WorkOrders = React.lazy(() =>
  import('./screens/production/WorkOrders').then((m) => ({ default: m.WorkOrders }))
);
const ProductionQC = React.lazy(() =>
  import('./screens/production/ProductionQC').then((m) => ({ default: m.ProductionQC }))
);
const MaintenanceAssets = React.lazy(() =>
  import('./screens/production/Maintenance').then((m) => ({ default: m.MaintenanceAssets }))
);
const ProductionStaff = React.lazy(() =>
  import('./screens/production/ProductionWorkforce').then((m) => ({ default: m.ProductionStaff }))
);
const ProductionAlerts = React.lazy(() =>
  import('./screens/production/ProductionAlerts').then((m) => ({ default: m.ProductionAlerts }))
);
const ProductionReports = React.lazy(() =>
  import('./screens/production/ProductionReports').then((m) => ({ default: m.ProductionReports }))
);
const ProductionUtilities = React.lazy(() =>
  import('./screens/production/ProductionUtilities').then((m) => ({ default: m.ProductionUtilities }))
);

function ScreenFallback() {
  return <LoadingState message="Loading screen…" />;
}

export function ProductionManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, PRODUCTION_TAB_ALIASES);
  const effectiveTab = (PRODUCTION_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';
  const { selectedFactoryId } = useProductionFactory();
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, PRODUCTION_TAB_ALIASES));
    };
    window.addEventListener('production:navigate', onNav);
    return () => window.removeEventListener('production:navigate', onNav);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <ProductionSidebar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="production-content-area">
        <ProductionTopBar
          setActiveTab={setActiveTab}
          onOpenDowntime={() => {
            setActiveTab('overview');
            setShowDowntimeModal(true);
          }}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <DashboardBreadcrumbs dashboard="production" activeTab={effectiveTab} />

          <HubRequiredGuard
            requireStore={false}
            scopeId={selectedFactoryId}
            scopeLabel="factory"
            title="Select a factory"
          >
            <Suspense fallback={<ScreenFallback />}>
              {effectiveTab === 'overview' && (
                <ProductionOverview
                  showDowntimeModal={showDowntimeModal}
                  onCloseDowntimeModal={() => setShowDowntimeModal(false)}
                />
              )}
              {effectiveTab === 'raw_materials' && <RawMaterials />}
              {effectiveTab === 'planning' && <ProductionPlanning />}
              {effectiveTab === 'work_orders' && <WorkOrders />}
              {effectiveTab === 'qc' && <ProductionQC />}
              {effectiveTab === 'maintenance' && <MaintenanceAssets />}
              {effectiveTab === 'workforce' && <ProductionStaff />}
              {effectiveTab === 'alerts' && <ProductionAlerts />}
              {effectiveTab === 'reports' && <ProductionReports />}
              {effectiveTab === 'utilities' && <ProductionUtilities />}
            </Suspense>
          </HubRequiredGuard>
        </main>
      </div>
    </div>
  );
}
