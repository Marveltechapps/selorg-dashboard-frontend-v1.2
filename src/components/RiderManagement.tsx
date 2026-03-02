import React, { useState } from 'react';
import { RiderSidebar } from './rider/RiderSidebar';
import { RiderTopBar } from './rider/RiderTopBar';
import { RiderOverview } from './screens/rider/RiderOverview';
import { RiderHR } from './screens/rider/RiderHR';
import { DispatchOps } from './screens/rider/DispatchOps';
import { FleetManagement } from './screens/fleet/FleetManagement';
import { AlertsDashboard as RiderAlerts } from './screens/AlertsDashboard';
import { RiderAnalytics } from './screens/rider/RiderAnalytics';
import { StaffShifts } from './screens/rider/StaffShifts';
import { CommunicationHub } from './screens/rider/CommunicationHub';
import { SystemHealth } from './screens/rider/SystemHealth';
import { TaskApprovals } from './screens/rider/TaskApprovals';
import { DeliveryEscalations } from './screens/rider/DeliveryEscalations';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

const RIDER_TABS = ['overview', 'hr', 'dispatch', 'fleet', 'escalations', 'alerts', 'analytics', 'shifts', 'communication', 'health', 'approvals'] as const;

export function RiderManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [riderSearchQuery, setRiderSearchQuery] = useState('');
  const tab = RIDER_TABS.includes(activeTab as any) ? activeTab : 'overview';

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <RiderSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <RiderTopBar searchQuery={riderSearchQuery} onSearchChange={setRiderSearchQuery} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {tab === 'overview' && <RiderOverview searchQuery={riderSearchQuery} />}
            {tab === 'hr' && <RiderHR searchQuery={riderSearchQuery} />}
            {tab === 'dispatch' && <DispatchOps searchQuery={riderSearchQuery} />}
            {tab === 'fleet' && <FleetManagement searchQuery={riderSearchQuery} />}
            {tab === 'escalations' && <DeliveryEscalations searchQuery={riderSearchQuery} />}
            {tab === 'alerts' && <RiderAlerts searchQuery={riderSearchQuery} />}
            {tab === 'analytics' && <RiderAnalytics searchQuery={riderSearchQuery} />}
            {tab === 'shifts' && <StaffShifts searchQuery={riderSearchQuery} />}
            {tab === 'communication' && <CommunicationHub searchQuery={riderSearchQuery} />}
            {tab === 'health' && <SystemHealth searchQuery={riderSearchQuery} />}
            {tab === 'approvals' && <TaskApprovals searchQuery={riderSearchQuery} />}
        </main>
      </div>
    </div>
  );
}
