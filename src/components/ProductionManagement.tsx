import React, { useState } from 'react';
import { ProductionSidebar } from './production/ProductionSidebar';
import { ProductionTopBar } from './production/ProductionTopBar';
import { ProductionOverview } from './screens/production/ProductionOverview';
import { RawMaterials } from './screens/production/RawMaterials';
import { ProductionPlanning } from './screens/production/ProductionPlanning';
import { WorkOrders } from './screens/production/WorkOrders';
import { ProductionQC } from './screens/production/ProductionQC';
import { MaintenanceAssets } from './screens/production/Maintenance';
import { ProductionStaff } from './screens/production/ProductionWorkforce';
import { ProductionAlerts } from './screens/production/ProductionAlerts';
import { ProductionReports } from './screens/production/ProductionReports';
import { ProductionUtilities } from './screens/production/ProductionUtilities';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function ProductionManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <ProductionSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <ProductionTopBar setActiveTab={setActiveTab} onOpenDowntime={() => { setActiveTab('overview'); setShowDowntimeModal(true); }} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {activeTab === 'overview' && <ProductionOverview showDowntimeModal={showDowntimeModal} onCloseDowntimeModal={() => setShowDowntimeModal(false)} />}
            {activeTab === 'raw_materials' && <RawMaterials />}
            {activeTab === 'planning' && <ProductionPlanning />}
            {activeTab === 'work_orders' && <WorkOrders />}
            {activeTab === 'qc' && <ProductionQC />}
            {activeTab === 'maintenance' && <MaintenanceAssets />}
            {activeTab === 'workforce' && <ProductionStaff />}
            {activeTab === 'alerts' && <ProductionAlerts />}
            {activeTab === 'reports' && <ProductionReports />}
            {activeTab === 'utilities' && <ProductionUtilities />}
        </main>
      </div>
    </div>
  );
}
