import React from 'react';
import { VendorSidebar } from './vendor/VendorSidebar';
import { VendorTopBar } from './vendor/VendorTopBar';
import { VendorOverview } from './screens/vendor/VendorOverview';
import { VendorList } from './screens/vendor/VendorListComplete';
import { VendorOnboarding } from './screens/vendor/VendorOnboarding';
import { PurchaseOrders } from './screens/vendor/PurchaseOrders';
import { InboundOperations } from './screens/vendor/InboundOperations';
import { InventoryCoordination } from './screens/vendor/InventoryCoordination';
import { QCCompliance } from './screens/vendor/QCCompliance';
import { VendorTaskApprovals } from './screens/vendor/VendorTaskApprovals';
import { VendorAlerts } from './screens/vendor/VendorAlerts';
import { VendorCommunication } from './screens/vendor/VendorCommunication';
import { ReportsAnalytics } from './screens/vendor/ReportsAnalytics';
import { VendorSystemHealth } from './screens/vendor/VendorSystemHealth';
import { VendorFinance } from './screens/vendor/VendorFinance';
import { VendorUtilities } from './screens/vendor/VendorUtilities';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function VendorManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [vendorSearchQuery, setVendorSearchQuery] = React.useState('');

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <VendorSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[240px]">
        <VendorTopBar searchQuery={vendorSearchQuery} onSearchChange={setVendorSearchQuery} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {activeTab === 'overview' && <VendorOverview searchQuery={vendorSearchQuery} />}
            {activeTab === 'vendor-list' && <VendorList />}
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
        </main>
      </div>
    </div>
  );
}