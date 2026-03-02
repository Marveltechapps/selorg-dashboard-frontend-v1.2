import React, { useEffect, useState } from 'react';
import { FinanceSidebar } from './finance/FinanceSidebar';
import { FinanceTopBar } from './finance/FinanceTopBar';
import { FinanceOverview } from './screens/finance/FinanceOverview';
import { CustomerPayments } from './screens/finance/CustomerPayments';
import { VendorPayments } from './screens/finance/VendorPayments';
import { RefundsReturns } from './screens/finance/RefundsReturns';
import { RiderCashReconciliation } from './screens/finance/RiderCashReconciliation';
import { ReconciliationAudits } from './screens/finance/ReconciliationAudits';
import { LedgerAccounting } from './screens/finance/LedgerAccounting';
import { BillingInvoicing } from './screens/finance/BillingInvoicing';
import { FinanceAlerts } from './screens/finance/FinanceAlerts';
import { FinanceAnalytics } from './screens/finance/FinanceAnalytics';
import { TaskApprovals } from './screens/finance/TaskApprovals';
import { SystemMonitoring } from './screens/finance/SystemMonitoring';
import { CommunicationHub } from './screens/finance/CommunicationHub';
import { UtilitiesTools } from './screens/finance/UtilitiesTools';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function FinanceManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [analyticsView, setAnalyticsView] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <FinanceSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[240px]">
        <FinanceTopBar />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {activeTab === 'overview' && <FinanceOverview />}
            {activeTab === 'customer-payments' && <CustomerPayments />}
            {activeTab === 'vendor-payments' && <VendorPayments />}
            {activeTab === 'rider-cash' && <RiderCashReconciliation />}
            {activeTab === 'refunds' && <RefundsReturns />}
            {activeTab === 'reconciliation' && <ReconciliationAudits />}
            {activeTab === 'ledger' && <LedgerAccounting />}
            {activeTab === 'billing' && <BillingInvoicing />}
            {activeTab === 'alerts' && <FinanceAlerts />}
            {activeTab === 'analytics' && <FinanceAnalytics initialView={analyticsView} />}
            {activeTab === 'approvals' && <TaskApprovals />}
            {activeTab === 'monitoring' && <SystemMonitoring />}
            {activeTab === 'communication' && <CommunicationHub />}
            {activeTab === 'utilities' && <UtilitiesTools />}
        </main>
      </div>
    </div>
  );
}
