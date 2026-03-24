import React, { Suspense } from 'react';
import { VendorSidebar } from './vendor/VendorSidebar';
import { VendorTopBar } from './vendor/VendorTopBar';
import { CardSkeleton } from './ui/ux-components';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

const VendorOverview = React.lazy(() =>
  import('./screens/vendor/VendorOverview').then((m) => ({ default: m.VendorOverview }))
);
const VendorList = React.lazy(() =>
  import('./screens/vendor/VendorListComplete').then((m) => ({ default: m.VendorList }))
);
const VendorOnboarding = React.lazy(() =>
  import('./screens/vendor/VendorOnboarding').then((m) => ({ default: m.VendorOnboarding }))
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
const VendorCommunication = React.lazy(() =>
  import('./screens/vendor/VendorCommunication').then((m) => ({ default: m.VendorCommunication }))
);
const ReportsAnalytics = React.lazy(() =>
  import('./screens/vendor/ReportsAnalytics').then((m) => ({ default: m.ReportsAnalytics }))
);
const VendorSystemHealth = React.lazy(() =>
  import('./screens/vendor/VendorSystemHealth').then((m) => ({ default: m.VendorSystemHealth }))
);
const VendorFinance = React.lazy(() =>
  import('./screens/vendor/VendorFinance').then((m) => ({ default: m.VendorFinance }))
);
const VendorUtilities = React.lazy(() =>
  import('./screens/vendor/VendorUtilities').then((m) => ({ default: m.VendorUtilities }))
);

export function VendorManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [vendorSearchQuery, setVendorSearchQuery] = React.useState('');

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <VendorSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[240px]">
        <VendorTopBar searchQuery={vendorSearchQuery} onSearchChange={setVendorSearchQuery} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <Suspense
            fallback={
              <div className="p-6">
                <CardSkeleton count={6} columns={3} />
              </div>
            }
          >
            {activeTab === 'overview' && <VendorOverview searchQuery={vendorSearchQuery} />}
            {activeTab === 'vendor-list' && <VendorList onNavigateTab={setActiveTab} />}
            {activeTab === 'onboarding' && <VendorOnboarding />}
            {activeTab === 'po' && <PurchaseOrders />}
            {activeTab === 'inbound' && <InboundOperations />}
            {activeTab === 'inventory' && <InventoryCoordination />}
            {activeTab === 'qc' && <QCCompliance />}
            {activeTab === 'approvals' && <VendorTaskApprovals />}
            {activeTab === 'alerts' && <VendorAlerts />}
            {activeTab === 'communication' && <VendorCommunication />}
            {activeTab === 'analytics' && <ReportsAnalytics />}
            {activeTab === 'system' && <VendorSystemHealth />}
            {activeTab === 'finance' && <VendorFinance />}
            {activeTab === 'utilities' && <VendorUtilities />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}