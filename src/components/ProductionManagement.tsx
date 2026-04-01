import React, { useState } from 'react';
import { ProductionSidebar } from './production/ProductionSidebar';
import { ProductionTopBar } from './production/ProductionTopBar';
import { ProductionBreadcrumbs } from './production/ProductionBreadcrumbs';
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
  const TAB_IDS = [
    'overview',
    'raw_materials',
    'planning',
    'work_orders',
    'qc',
    'maintenance',
    'workforce',
    'alerts',
    'reports',
    'utilities',
  ] as const;
  const effectiveTab = (TAB_IDS as readonly string[]).includes(activeTab as any) ? activeTab : 'overview';
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <ProductionSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <ProductionTopBar setActiveTab={setActiveTab} onOpenDowntime={() => { setActiveTab('overview'); setShowDowntimeModal(true); }} />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
          <ProductionBreadcrumbs activeTab={effectiveTab} />
          {effectiveTab === 'overview' && (
            <ProductionOverview
              showDowntimeModal={showDowntimeModal}
              onCloseDowntimeModal={() => setShowDowntimeModal(false)}
            />
          )}
          {effectiveTab === 'raw_materials' && <RawMaterials />}
          {effectiveTab === 'planning' && <ProductionPlanning />}
          {effectiveTab === 'work_orders' && <WorkOrders />}
          {effectiveTab === 'qc' && <ProductionQC />}
          {effectiveTab === 'maintenance' && <MaintenanceAssets />}
          {effectiveTab === 'workforce' && <ProductionStaff />}
          {effectiveTab === 'alerts' && <ProductionAlerts />}
          {effectiveTab === 'reports' && <ProductionReports />}
          {effectiveTab === 'utilities' && <ProductionUtilities />}
        </main>
      </div>
    </div>
  );
}
