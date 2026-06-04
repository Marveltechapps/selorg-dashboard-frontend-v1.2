import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RiderSidebar } from './rider/RiderSidebar';
import { RiderTopBar } from './rider/RiderTopBar';
import { RiderOverview } from './screens/rider/RiderOverview';
import { RiderHR } from './screens/rider/RiderHR';
import { DispatchOps } from './screens/rider/DispatchOps';
import { FleetManagement } from './screens/fleet/FleetManagement';
import { AlertsDashboard as RiderAlerts } from './screens/AlertsDashboard';
import { RiderAnalytics } from './screens/rider/RiderAnalytics';
import { RiderShiftManagement } from './screens/rider/RiderShiftManagement';
import { CommunicationHub } from './screens/rider/CommunicationHub';
import { TaskApprovals } from './screens/rider/TaskApprovals';
import { DeliveryEscalations } from './screens/rider/DeliveryEscalations';
import { TrainingKitManagement } from './screens/rider/TrainingKitManagement';
import { GroupDelivery } from './screens/rider/GroupDelivery';
import { RiderLiveChatSupport } from './screens/rider/RiderLiveChatSupport';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { DashboardBreadcrumbs } from './ui/DashboardBreadcrumbs';

const RIDER_TABS = [
  'overview',
  'hr',
  'dispatch',
  'fleet',
  'escalations',
  'alerts',
  'analytics',
  'rider-shifts',
  'communication',
  'approvals',
  'training-kit',
  'group-delivery',
  'live-chat-support',
] as const;

export function RiderManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [riderSearchQuery, setRiderSearchQuery] = useState('');
  // UI toggle: hide the Communication Hub screen (but keep code/integration intact).
  const SHOW_COMMUNICATION_HUB = false;
  const requestedTab = RIDER_TABS.includes(activeTab as any) ? activeTab : 'overview';
  const tab =
    !SHOW_COMMUNICATION_HUB && requestedTab === 'communication'
      ? 'overview'
      : requestedTab === 'shifts' || requestedTab === 'health'
        ? 'overview'
        : requestedTab;

  // Hidden routes: redirect direct URLs away from removed screens.
  if (!SHOW_COMMUNICATION_HUB && activeTab === 'communication') {
    return <Navigate to="/rider/overview" replace />;
  }
  if (activeTab === 'shifts' || activeTab === 'health') {
    return <Navigate to="/rider/overview" replace />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#18181b] font-sans">
      <RiderSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />

      <div className="rider-content-area">
        <RiderTopBar searchQuery={riderSearchQuery} onSearchChange={setRiderSearchQuery} />

        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen max-w-[1920px]">
          <DashboardBreadcrumbs dashboard="rider" activeTab={tab} />
            {tab === 'overview' && <RiderOverview searchQuery={riderSearchQuery} />}
            {tab === 'hr' && <RiderHR searchQuery={riderSearchQuery} />}
            {tab === 'dispatch' && <DispatchOps searchQuery={riderSearchQuery} />}
            {tab === 'fleet' && <FleetManagement searchQuery={riderSearchQuery} />}
            {tab === 'escalations' && <DeliveryEscalations searchQuery={riderSearchQuery} />}
            {tab === 'alerts' && <RiderAlerts searchQuery={riderSearchQuery} />}
            {tab === 'analytics' && <RiderAnalytics searchQuery={riderSearchQuery} />}
            {tab === 'rider-shifts' && <RiderShiftManagement searchQuery={riderSearchQuery} />}
            {tab === 'communication' && <CommunicationHub searchQuery={riderSearchQuery} />}
            {tab === 'approvals' && <TaskApprovals searchQuery={riderSearchQuery} />}
            {tab === 'training-kit' && <TrainingKitManagement />}
            {tab === 'group-delivery' && <GroupDelivery searchQuery={riderSearchQuery} />}
            {tab === 'live-chat-support' && <RiderLiveChatSupport />}
        </main>
      </div>
    </div>
  );
}
