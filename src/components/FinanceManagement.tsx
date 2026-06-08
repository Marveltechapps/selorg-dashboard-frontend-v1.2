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
import { HubRequiredGuard } from './dashboard/HubRequiredGuard';
import { FINANCE_TAB_ALIASES, FINANCE_TAB_IDS } from '../layouts/sidebar/financeNavigationConfig';
import { resolveOpsTab } from '../layouts/sidebar/opsNavigationTypes';

export function FinanceManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab: rawTab, setActiveTab } = useDashboardNavigation('overview');
  const activeTab = resolveOpsTab(rawTab, FINANCE_TAB_ALIASES);
  const effectiveTab = (FINANCE_TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'overview';
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
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string };
      if (detail?.tab) setActiveTab(resolveOpsTab(detail.tab, FINANCE_TAB_ALIASES));
    };
    window.addEventListener('finance:navigate', onNav);
    return () => window.removeEventListener('finance:navigate', onNav);
  }, [setActiveTab]);

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
          <DashboardBreadcrumbs dashboard="finance" activeTab={effectiveTab} />
          <HubRequiredGuard title="Select a finance entity" requireStore={false}>
            {effectiveTab === 'overview' && <FinanceOverview />}
            {effectiveTab === 'customer-payments' && <CustomerPayments />}
            {effectiveTab === 'vendor-payments' && <VendorPayments />}
            {effectiveTab === 'rider-cash' && <RiderCashReconciliation />}
            {effectiveTab === 'refunds' && <RefundsReturns />}
            {effectiveTab === 'picker-payouts' && <PickerPayouts />}
            {effectiveTab === 'reconciliation' && <ReconciliationAudits />}
            {effectiveTab === 'ledger' && <LedgerAccounting />}
            {effectiveTab === 'billing' && <BillingInvoicing />}
            {effectiveTab === 'alerts' && <FinanceAlerts />}
            {effectiveTab === 'analytics' && <FinanceAnalytics initialView={analyticsView} />}
            {effectiveTab === 'approvals' && <TaskApprovals />}
            {effectiveTab === 'utilities' && <UtilitiesTools />}
          </HubRequiredGuard>
        </main>
      </div>
    </div>
  );
}
