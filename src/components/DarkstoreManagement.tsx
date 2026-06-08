import React, { Suspense, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { websocketService } from '../utils/websocket';
import { useAuth } from '../contexts/AuthContext';
import { TopBar } from './TopBar';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';
import { DarkstoreProvider } from './darkstore/DarkstoreProvider';
import { ExceptionInbox } from './darkstore/ExceptionInbox';
import { RoleLandingBanner } from './darkstore/RoleLandingBanner';
import { OpsContextBar } from './darkstore/OpsContextBar';
import { MyShiftLanding } from './darkstore/MyShiftLanding';
import { AlertTierBanner } from './darkstore/AlertTierBanner';
import { LoadingState } from './ui/ux-components';
import { getEscalationSuggestions, type EscalationSuggestion } from '../api/darkstore/operations.api';
import { useDarkstoreNavCounts } from './darkstore/useDarkstoreNavCounts';
import { DARKSTORE_TAB_ALIASES } from '../layouts/sidebar/darkstoreNavigationConfig';
import {
  FulfillmentFloorScreen,
  fulfillmentInitialTab,
} from './screens/darkstore/FulfillmentFloorScreen';
import { DarkstoreStoreScoped } from './darkstore/DarkstoreStoreScoped';

const DashboardHome = React.lazy(() =>
  import('./screens/DashboardHome').then((m) => ({ default: m.DashboardHome }))
);
const LiveOrders = React.lazy(() => import('./screens/LiveOrders').then((m) => ({ default: m.LiveOrders })));
const InventoryOps = React.lazy(() => import('./screens/InventoryOps').then((m) => ({ default: m.InventoryOps })));
const StaffShifts = React.lazy(() => import('./screens/StaffShifts').then((m) => ({ default: m.StaffShifts })));
const HSDManagement = React.lazy(() => import('./screens/HSDManagement').then((m) => ({ default: m.HSDManagement })));
const QualityControl = React.lazy(() => import('./screens/QualityControl').then((m) => ({ default: m.QualityControl })));
const StoreHealth = React.lazy(() => import('./screens/StoreHealth').then((m) => ({ default: m.StoreHealth })));
const ReportsDashboard = React.lazy(() =>
  import('./screens/ReportsDashboard').then((m) => ({ default: m.ReportsDashboard }))
);
const Utilities = React.lazy(() => import('./screens/Utilities').then((m) => ({ default: m.Utilities })));
const InboundOps = React.lazy(() => import('./screens/InboundOps').then((m) => ({ default: m.InboundOps })));
const OutboundOps = React.lazy(() => import('./screens/OutboundOps').then((m) => ({ default: m.OutboundOps })));
const IssueManagement = React.lazy(() =>
  import('./screens/darkstore/IssueManagement').then((m) => ({ default: m.IssueManagement }))
);
const LivePickerBoardScreen = React.lazy(() =>
  import('./screens/LivePickerBoardScreen').then((m) => ({ default: m.LivePickerBoardScreen }))
);
const PickerPerformance = React.lazy(() =>
  import('./screens/darkstore/PickerPerformance').then((m) => ({ default: m.PickerPerformance }))
);
const SLAMonitor = React.lazy(() => import('./screens/darkstore/SLAMonitor').then((m) => ({ default: m.SLAMonitor })));
const MissingItemTracker = React.lazy(() =>
  import('./screens/darkstore/MissingItemTracker').then((m) => ({ default: m.MissingItemTracker }))
);
const LogisticsModule = React.lazy(() =>
  import('./logistics/LogisticsModule').then((m) => ({ default: m.LogisticsModule }))
);
const RegionalCommandScreen = React.lazy(() =>
  import('./screens/RegionalCommandScreen').then((m) => ({ default: m.RegionalCommandScreen }))
);
const OpsAnalyticsScreen = React.lazy(() =>
  import('./screens/darkstore/OpsAnalyticsScreen').then((m) => ({ default: m.OpsAnalyticsScreen }))
);
function ScreenFallback() {
  return <LoadingState message="Loading screen…" />;
}

function resolveTab(tab: string): string {
  return DARKSTORE_TAB_ALIASES[tab] ?? tab;
}

const FULFILLMENT_ROUTES = new Set([
  'fulfillment',
  'pickpackops',
  'packing-station',
  'livepickingmonitor',
  'picklists',
  'pickpack',
]);

export function DarkstoreManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveTab(rawTab);
  const { token, isAuthenticated, activeStoreId } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navCounts = useDarkstoreNavCounts();
  const [escalations, setEscalations] = useState<EscalationSuggestion[]>([]);
  const [p0Dismissed, setP0Dismissed] = useState(false);
  const [navContext, setNavContext] = useState<{ orderId?: string }>({});

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    websocketService.connect();
  }, [isAuthenticated, token]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !websocketService.isConnected()) {
        websocketService.resetConnection();
        websocketService.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!activeStoreId) return;
    getEscalationSuggestions({ storeId: activeStoreId })
      .then((res) => setEscalations(res?.data ?? []))
      .catch(() => setEscalations([]));
    const interval = setInterval(() => {
      getEscalationSuggestions({ storeId: activeStoreId })
        .then((res) => setEscalations(res?.data ?? []))
        .catch(() => setEscalations([]));
    }, 30000);
    return () => clearInterval(interval);
  }, [activeStoreId]);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string; orderId?: string };
      if (detail?.tab) {
        if (detail.orderId) setNavContext({ orderId: detail.orderId });
        setActiveTab(resolveTab(detail.tab));
      }
    };
    window.addEventListener('darkstore:navigate', onNav);
    return () => window.removeEventListener('darkstore:navigate', onNav);
  }, [setActiveTab]);

  return (
    <DarkstoreProvider>
      <div className="min-h-screen darkstore-shell font-sans">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={onLogout}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <div className="darkstore-content-area">
          <TopBar
            setActiveTab={setActiveTab}
            wideSidebar
            onMenuClick={() => setSidebarOpen(true)}
            dashboard="darkstore"
          />

          <main className="pt-[88px] px-4 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            <DashboardBreadcrumbs dashboard="darkstore" activeTab={activeTab} />
            {!p0Dismissed && (
              <AlertTierBanner
                suggestions={escalations}
                stockAlertCount={navCounts.alerts}
                onAction={(s) => {
                  if (s.action === 'view_sla' || s.tier === 'P0') setActiveTab('slamonitor');
                  else if (s.orderId) setActiveTab('liveorders');
                }}
                onDismissP0={() => setP0Dismissed(true)}
              />
            )}
            <RoleLandingBanner activeTab={activeTab} setActiveTab={setActiveTab} className="mb-4" />
            {activeTab !== 'overview' && activeTab !== 'liveorders' && activeTab !== 'my-shift' && (
              <OpsContextBar className="mb-4" />
            )}

            <Suspense fallback={<ScreenFallback />}>
              {activeTab === 'my-shift' && <MyShiftLanding setActiveTab={setActiveTab} />}
              {activeTab === 'regional' && (
                <DarkstoreStoreScoped title="Select a store for Regional Command">
                  <RegionalCommandScreen setActiveTab={setActiveTab} />
                </DarkstoreStoreScoped>
              )}
              {activeTab !== 'my-shift' && activeTab !== 'regional' && (
                <DarkstoreStoreScoped>
                  {activeTab === 'overview' && <DashboardHome setActiveTab={setActiveTab} />}
                  {activeTab === 'liveorders' && (
                    <LiveOrders initialTab={rawTab === 'cancelledorders' ? 'cancelled' : undefined} />
                  )}
                  {activeTab === 'exception-inbox' && <ExceptionInbox setActiveTab={setActiveTab} />}
                  {FULFILLMENT_ROUTES.has(rawTab) && (
                    <FulfillmentFloorScreen
                      key={rawTab}
                      setActiveTab={setActiveTab}
                      initialTab={fulfillmentInitialTab(rawTab)}
                    />
                  )}
                  {activeTab === 'slamonitor' && <SLAMonitor setActiveTab={setActiveTab} />}
                  {activeTab === 'missingitems' && (
                    <MissingItemTracker initialOrderFilter={navContext.orderId} setActiveTab={setActiveTab} />
                  )}
                  {activeTab === 'livepickerboard' && <LivePickerBoardScreen />}
                  {activeTab === 'pickerperformance' && <PickerPerformance />}
                  {activeTab === 'inventory' && <InventoryOps />}
                  {activeTab === 'staff' && <StaffShifts />}
                  {activeTab === 'health' && <StoreHealth />}
                  {activeTab === 'reports' && (
                    <ReportsDashboard onNavigateToAudit={() => setActiveTab('qc')} variant="darkstore" />
                  )}
                  {activeTab === 'ops-analytics' && <OpsAnalyticsScreen />}
                  {activeTab === 'hsd' && <HSDManagement />}
                  {activeTab === 'qc' && <QualityControl />}
                  {activeTab === 'inbound' && <InboundOps />}
                  {activeTab === 'outbound' && <OutboundOps />}
                  {activeTab === 'issues' && <IssueManagement />}
                  {(activeTab === 'store-settings' || activeTab === 'utilities') && <Utilities />}
                  {activeTab === 'replenishment' && <LogisticsModule variant="darkstore" section="hub" />}
                </DarkstoreStoreScoped>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </DarkstoreProvider>
  );
}
