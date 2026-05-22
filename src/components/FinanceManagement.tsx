import React, { useEffect, useState } from 'react';
import { FinanceSidebar } from './finance/FinanceSidebar';
import { FinanceTopBar } from './finance/FinanceTopBar';
import { FinanceOverview } from './screens/finance/FinanceOverview';
import { CustomerPayments } from './screens/finance/CustomerPayments';
import { VendorPayments } from './screens/finance/VendorPayments';
import { RefundsReturns } from './screens/finance/RefundsReturns';
import { PickerPayouts } from './screens/finance/PickerPayouts';
import { RiderCashReconciliation } from './screens/finance/RiderCashReconciliation';
import { ReconciliationAudits } from './screens/finance/ReconciliationAudits';
import { LedgerAccounting } from './screens/finance/LedgerAccounting';
import { BillingInvoicing } from './screens/finance/BillingInvoicing';
import { FinanceAlerts } from './screens/finance/FinanceAlerts';
import { FinanceAnalytics } from './screens/finance/FinanceAnalytics';
import { TaskApprovals } from './screens/finance/TaskApprovals';
import { UtilitiesTools } from './screens/finance/UtilitiesTools';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';

export function FinanceManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [analyticsView, setAnalyticsView] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent) => {
      const { tab, view } = event.detail;
      if (tab) {
        setActiveTab(tab);
        if (view) {
          setAnalyticsView(view);
        }
      }
    };

    window.addEventListener('navigateToTab', handleNavigateToTab as EventListener);
    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab as EventListener);
    };
  }, [setActiveTab]);

  useEffect(() => {
    if (activeTab === 'monitoring' || activeTab === 'communication') {
      setActiveTab('overview');
    }
  }, [activeTab, setActiveTab]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <FinanceSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="finance-content-area">
        <FinanceTopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <DashboardBreadcrumbs dashboard="finance" activeTab={activeTab} />
            {activeTab === 'overview' && <FinanceOverview />}
            {activeTab === 'customer-payments' && <CustomerPayments />}
            {activeTab === 'vendor-payments' && <VendorPayments />}
            {activeTab === 'rider-cash' && <RiderCashReconciliation />}
            {activeTab === 'refunds' && <RefundsReturns />}
            {activeTab === 'picker-payouts' && <PickerPayouts />}
            {activeTab === 'reconciliation' && <ReconciliationAudits />}
            {activeTab === 'ledger' && <LedgerAccounting />}
            {activeTab === 'billing' && <BillingInvoicing />}
            {activeTab === 'alerts' && <FinanceAlerts />}
            {activeTab === 'analytics' && <FinanceAnalytics initialView={analyticsView} />}
            {activeTab === 'approvals' && <TaskApprovals />}
            {activeTab === 'utilities' && <UtilitiesTools />}
        </main>
      </div>
    </div>
  );
}
