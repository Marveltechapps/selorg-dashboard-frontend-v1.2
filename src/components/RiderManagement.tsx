import React, { Suspense, useEffect, useState } from 'react';
import { RiderOpsProvider } from './rider/RiderOpsProvider';
import { RiderSidebar } from './rider/RiderSidebar';
import { RiderTopBar } from './rider/RiderTopBar';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import { LoadingState } from './ui/ux-components';
import { RIDER_TAB_ALIASES, RIDER_TAB_IDS } from '../layouts/sidebar/riderNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

const RiderOverview = React.lazy(() =>
  import('./screens/rider/RiderOverview').then((m) => ({ default: m.RiderOverview }))
);
const RiderHR = React.lazy(() =>
  import('./screens/rider/RiderHR').then((m) => ({ default: m.RiderHR }))
);
const DispatchOps = React.lazy(() =>
  import('./screens/rider/DispatchOps').then((m) => ({ default: m.DispatchOps }))
);
const FleetManagement = React.lazy(() =>
  import('./screens/fleet/FleetManagement').then((m) => ({ default: m.FleetManagement }))
);
const RiderAlerts = React.lazy(() =>
  import('./screens/AlertsDashboard').then((m) => ({ default: m.AlertsDashboard }))
);
const RiderAnalytics = React.lazy(() =>
  import('./screens/rider/RiderAnalytics').then((m) => ({ default: m.RiderAnalytics }))
);
const RiderShiftManagement = React.lazy(() =>
  import('./screens/rider/RiderShiftManagement').then((m) => ({ default: m.RiderShiftManagement }))
);
const CommunicationHub = React.lazy(() =>
  import('./screens/rider/CommunicationHub').then((m) => ({ default: m.CommunicationHub }))
);
const SystemHealth = React.lazy(() =>
  import('./screens/rider/SystemHealth').then((m) => ({ default: m.SystemHealth }))
);
const TaskApprovals = React.lazy(() =>
  import('./screens/rider/TaskApprovals').then((m) => ({ default: m.TaskApprovals }))
);
const DeliveryEscalations = React.lazy(() =>
  import('./screens/rider/DeliveryEscalations').then((m) => ({ default: m.DeliveryEscalations }))
);
const TrainingKitManagement = React.lazy(() =>
  import('./screens/rider/TrainingKitManagement').then((m) => ({ default: m.TrainingKitManagement }))
);
const GroupDelivery = React.lazy(() =>
  import('./screens/rider/GroupDelivery').then((m) => ({ default: m.GroupDelivery }))
);
const RiderLiveChatSupport = React.lazy(() =>
  import('./screens/rider/RiderLiveChatSupport').then((m) => ({ default: m.RiderLiveChatSupport }))
);
const RiderCashOps = React.lazy(() =>
  import('./screens/rider/RiderCashOps').then((m) => ({ default: m.RiderCashOps }))
);

function ScreenFallback() {
  return <LoadingState message="Loading screen…" />;
}

export function RiderManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, RIDER_TAB_ALIASES);
  const [riderSearchQuery, setRiderSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const effectiveTab = (RIDER_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, RIDER_TAB_ALIASES));
    };
    window.addEventListener('rider:navigate', onNav);
    return () => window.removeEventListener('rider:navigate', onNav);
  }, [setActiveTab]);

  const navigateTo = (tab: string) => setActiveTab(tab);

  return (
    <RiderOpsProvider>
    <div className="min-h-screen bg-[#fcfcfc] text-[#18181b] font-sans">
      <RiderSidebar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="rider-content-area">
        <RiderTopBar
          searchQuery={riderSearchQuery}
          onSearchChange={setRiderSearchQuery}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <DashboardBreadcrumbs dashboard="rider" activeTab={effectiveTab} />

          <HubRequiredGuard title="Select a delivery hub">
            <Suspense fallback={<ScreenFallback />}>
              {effectiveTab === 'overview' && (
                <RiderOverview
                  searchQuery={riderSearchQuery}
                  onNavigateTab={navigateTo}
                />
              )}
              {effectiveTab === 'hr' && <RiderHR searchQuery={riderSearchQuery} />}
              {effectiveTab === 'dispatch' && <DispatchOps searchQuery={riderSearchQuery} />}
              {effectiveTab === 'fleet' && <FleetManagement searchQuery={riderSearchQuery} />}
              {effectiveTab === 'escalations' && <DeliveryEscalations searchQuery={riderSearchQuery} />}
              {effectiveTab === 'alerts' && <RiderAlerts searchQuery={riderSearchQuery} />}
              {effectiveTab === 'analytics' && <RiderAnalytics searchQuery={riderSearchQuery} />}
              {effectiveTab === 'rider-shifts' && <RiderShiftManagement searchQuery={riderSearchQuery} />}
              {effectiveTab === 'approvals' && <TaskApprovals searchQuery={riderSearchQuery} />}
              {effectiveTab === 'training-kit' && <TrainingKitManagement />}
              {effectiveTab === 'group-delivery' && <GroupDelivery searchQuery={riderSearchQuery} />}
              {effectiveTab === 'live-chat-support' && <RiderLiveChatSupport />}
              {effectiveTab === 'communication' && <CommunicationHub searchQuery={riderSearchQuery} />}
              {effectiveTab === 'health' && <SystemHealth />}
              {effectiveTab === 'rider-cash' && <RiderCashOps />}
            </Suspense>
          </HubRequiredGuard>
        </main>
      </div>
    </div>
    </RiderOpsProvider>
  );
}
