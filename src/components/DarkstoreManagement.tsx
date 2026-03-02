import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardHome } from './screens/DashboardHome';
import { LiveOrders } from './screens/LiveOrders';
import { PickTasks } from './screens/PickTasks';
import { PackStation } from './screens/PackStation';
import { InventoryOps } from './screens/InventoryOps';
import { StaffShifts } from './screens/StaffShifts';
import { HSDManagement } from './screens/HSDManagement';
import { QualityControl } from './screens/QualityControl';
import { StoreHealth } from './screens/StoreHealth';
import { AlertsDashboard } from './screens/AlertsDashboard';
import { ReportsDashboard } from './screens/ReportsDashboard';
import { Utilities } from './screens/Utilities';
import { InboundOps } from './screens/InboundOps';
import { OutboundOps } from './screens/OutboundOps';
import { StoreEscalations } from './screens/StoreEscalations';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function DarkstoreManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <TopBar setActiveTab={setActiveTab} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {activeTab === 'overview' && <DashboardHome setActiveTab={setActiveTab} />}
            {activeTab === 'liveorders' && <LiveOrders />}
            {activeTab === 'pickpack' && (
              <div className="space-y-12">
                <PickTasks />
                <div className="border-t border-[#E0E0E0] pt-12">
                   <PackStation />
                </div>
              </div>
            )}
            {activeTab === 'inventory' && <InventoryOps />}
            {activeTab === 'staff' && <StaffShifts />}
            {activeTab === 'health' && <StoreHealth />}
            {activeTab === 'alerts' && <AlertsDashboard />}
            {activeTab === 'reports' && <ReportsDashboard onNavigateToAudit={() => setActiveTab('qc')} />}
            {activeTab === 'hsd' && <HSDManagement />}
            {activeTab === 'qc' && <QualityControl />}
            {activeTab === 'inbound' && <InboundOps />}
            {activeTab === 'outbound' && <OutboundOps />}
            {activeTab === 'escalations' && <StoreEscalations />}
            {activeTab === 'utilities' && <Utilities />}
            
            {/* Fallbacks for unimplemented screens */}
            {['settings'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-[#9E9E9E]">
                <div className="text-6xl mb-4 grayscale opacity-20">🏗️</div>
                <h2 className="text-2xl font-bold text-[#616161] mb-2">Module Under Construction</h2>
                <p>The {activeTab} dashboard is being built according to the new design specs.</p>
              </div>
            )}
        </main>
      </div>
    </div>
  );
}
