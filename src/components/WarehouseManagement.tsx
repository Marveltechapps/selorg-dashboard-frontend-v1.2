import React, { Suspense, useEffect, useState } from 'react';
import { WarehouseSidebar } from './warehouse/WarehouseSidebar';
import { WarehouseTopBar } from './warehouse/WarehouseTopBar';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import { LoadingState } from './ui/ux-components';
import {
  WAREHOUSE_TAB_ALIASES,
  WAREHOUSE_TAB_IDS,
} from '../layouts/sidebar/warehouseNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

const WarehouseOverview = React.lazy(() =>
  import('./screens/warehouse/WarehouseOverview').then((m) => ({ default: m.WarehouseOverview }))
);
const WarehouseNavigation = React.lazy(() =>
  import('./screens/warehouse/WarehouseNavigation').then((m) => ({ default: m.WarehouseNavigation }))
);
const InboundOps = React.lazy(() =>
  import('./screens/warehouse/InboundOps').then((m) => ({ default: m.InboundOps }))
);
const InventoryStorage = React.lazy(() =>
  import('./screens/warehouse/InventoryStorage').then((m) => ({ default: m.InventoryStorage }))
);
const OutboundOps = React.lazy(() =>
  import('./screens/warehouse/OutboundOps').then((m) => ({ default: m.OutboundOps }))
);
const Transfers = React.lazy(() =>
  import('./screens/warehouse/Transfers').then((m) => ({ default: m.Transfers }))
);
const QCCompliance = React.lazy(() =>
  import('./screens/warehouse/QCCompliance').then((m) => ({ default: m.QCCompliance }))
);
const WorkforceShifts = React.lazy(() =>
  import('./screens/warehouse/WorkforceShifts').then((m) => ({ default: m.WorkforceShifts }))
);
const ShiftMaster = React.lazy(() =>
  import('./screens/warehouse/ShiftMaster').then((m) => ({ default: m.ShiftMaster }))
);
const ShiftRoster = React.lazy(() =>
  import('./screens/warehouse/ShiftRoster').then((m) => ({ default: m.ShiftRoster }))
);
const EquipmentAssets = React.lazy(() =>
  import('./screens/warehouse/EquipmentAssets').then((m) => ({ default: m.EquipmentAssets }))
);
const WarehouseDevices = React.lazy(() =>
  import('./screens/warehouse/WarehouseDevices').then((m) => ({ default: m.WarehouseDevices }))
);
const Exceptions = React.lazy(() =>
  import('./screens/warehouse/Exceptions').then((m) => ({ default: m.Exceptions }))
);
const ReportsAnalytics = React.lazy(() =>
  import('./screens/warehouse/ReportsAnalytics').then((m) => ({ default: m.ReportsAnalytics }))
);
const WarehouseUtilities = React.lazy(() =>
  import('./screens/warehouse/WarehouseUtilities').then((m) => ({ default: m.WarehouseUtilities }))
);
const LogisticsModule = React.lazy(() =>
  import('./logistics/LogisticsModule').then((m) => ({ default: m.LogisticsModule }))
);

function ScreenFallback() {
  return <LoadingState message="Loading screen…" />;
}

function logisticsSection(tab: string): 'hub' | 'tracking' | 'estimate' {
  if (tab === 'logistics-tracking') return 'tracking';
  if (tab === 'logistics-estimate') return 'estimate';
  return 'hub';
}

export function WarehouseManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, WAREHOUSE_TAB_ALIASES);
  const effectiveTab = (WAREHOUSE_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, WAREHOUSE_TAB_ALIASES));
    };
    window.addEventListener('warehouse:navigate', onNav);
    return () => window.removeEventListener('warehouse:navigate', onNav);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans warehouse-shell">
      <WarehouseSidebar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="warehouse-content-area">
        <WarehouseTopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="pt-[88px] px-3 sm:px-6 md:px-8 pb-12 max-w-[1920px] mx-auto w-full min-h-screen">
          <DashboardBreadcrumbs dashboard="warehouse" activeTab={effectiveTab} />

          <HubRequiredGuard title="Select a fulfillment hub">
            <Suspense fallback={<ScreenFallback />}>
              {effectiveTab === 'overview' && <WarehouseOverview />}
              {effectiveTab === 'navigation' && <WarehouseNavigation />}
              {effectiveTab === 'inbound' && <InboundOps />}
              {effectiveTab === 'inventory' && <InventoryStorage />}
              {effectiveTab === 'outbound' && <OutboundOps />}
              {effectiveTab === 'transfers' && <Transfers />}
              {effectiveTab === 'qc' && <QCCompliance />}
              {effectiveTab === 'workforce' && <WorkforceShifts />}
              {effectiveTab === 'shift-master' && <ShiftMaster />}
              {effectiveTab === 'shift-roster' && <ShiftRoster />}
              {effectiveTab === 'equipment' && <EquipmentAssets />}
              {effectiveTab === 'devices' && <WarehouseDevices />}
              {effectiveTab === 'exceptions' && <Exceptions />}
              {effectiveTab === 'analytics' && <ReportsAnalytics />}
              {effectiveTab === 'utilities' && <WarehouseUtilities />}
              {effectiveTab === 'logistics' && (
                <LogisticsModule variant="warehouse" section={logisticsSection(rawTab)} />
              )}
            </Suspense>
          </HubRequiredGuard>
        </main>
      </div>
    </div>
  );
}
