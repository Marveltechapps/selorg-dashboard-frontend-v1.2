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
import { StaffShifts } from './screens/rider/StaffShifts';
import { RiderShiftManagement } from './screens/rider/RiderShiftManagement';
import { CommunicationHub } from './screens/rider/CommunicationHub';
import { SystemHealth } from './screens/rider/SystemHealth';
import { TaskApprovals } from './screens/rider/TaskApprovals';
import { DeliveryEscalations } from './screens/rider/DeliveryEscalations';
import { TrainingKitManagement } from './screens/rider/TrainingKitManagement';
import { GroupDelivery } from './screens/rider/GroupDelivery';
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
  'shifts',
  'communication',
  'health',
  'approvals',
  'training-kit',
  'group-delivery',
] as const;

export function RiderManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [riderSearchQuery, setRiderSearchQuery] = useState('');
  // UI toggle: hide the Communication Hub screen (but keep code/integration intact).
  const SHOW_COMMUNICATION_HUB = false;
  const requestedTab = RIDER_TABS.includes(activeTab as any) ? activeTab : 'overview';
  const tab = !SHOW_COMMUNICATION_HUB && requestedTab === 'communication' ? 'overview' : requestedTab;

  // If someone navigates directly to `/rider/communication`, redirect them away.
  // Using <Navigate> avoids relying on useEffect (which previously caused a runtime crash).
  if (!SHOW_COMMUNICATION_HUB && activeTab === 'communication') {
    return <Navigate to="/rider/overview" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <RiderSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <RiderTopBar searchQuery={riderSearchQuery} onSearchChange={setRiderSearchQuery} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <DashboardBreadcrumbs dashboard="rider" activeTab={tab} />
            {tab === 'overview' && <RiderOverview searchQuery={riderSearchQuery} />}
            {tab === 'hr' && <RiderHR searchQuery={riderSearchQuery} />}
            {tab === 'dispatch' && <DispatchOps searchQuery={riderSearchQuery} />}
            {tab === 'fleet' && <FleetManagement searchQuery={riderSearchQuery} />}
            {tab === 'escalations' && <DeliveryEscalations searchQuery={riderSearchQuery} />}
            {tab === 'alerts' && <RiderAlerts searchQuery={riderSearchQuery} />}
            {tab === 'analytics' && <RiderAnalytics searchQuery={riderSearchQuery} />}
            {tab === 'rider-shifts' && <RiderShiftManagement searchQuery={riderSearchQuery} />}
            {tab === 'shifts' && <StaffShifts searchQuery={riderSearchQuery} />}
            {tab === 'communication' && <CommunicationHub searchQuery={riderSearchQuery} />}
            {tab === 'health' && <SystemHealth searchQuery={riderSearchQuery} />}
            {tab === 'approvals' && <TaskApprovals searchQuery={riderSearchQuery} />}
            {tab === 'training-kit' && <TrainingKitManagement />}
            {tab === 'group-delivery' && <GroupDelivery searchQuery={riderSearchQuery} />}
        </main>
      </div>
    </div>
  );
}
