import React from 'react';
import { useParams } from 'react-router-dom';
import { WarehouseSidebar } from './warehouse/WarehouseSidebar';
import { WarehouseTopBar } from './warehouse/WarehouseTopBar';
import { WarehouseOverview } from './screens/warehouse/WarehouseOverview';
import { InboundOps } from './screens/warehouse/InboundOps';
import { InventoryStorage } from './screens/warehouse/InventoryStorage';
import { OutboundOps } from './screens/warehouse/OutboundOps';
import { Transfers } from './screens/warehouse/Transfers';
import { QCCompliance } from './screens/warehouse/QCCompliance';
import { WorkforceShifts } from './screens/warehouse/WorkforceShifts';
import { EquipmentAssets } from './screens/warehouse/EquipmentAssets';
import { Exceptions } from './screens/warehouse/Exceptions';
import { ReportsAnalytics } from './screens/warehouse/ReportsAnalytics';
import { WarehouseUtilities } from './screens/warehouse/WarehouseUtilities';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

const TAB_IDS = ['overview', 'inbound', 'inventory', 'outbound', 'transfers', 'qc', 'workforce', 'equipment', 'exceptions', 'analytics', 'utilities'] as const;

export function WarehouseManagement({ onLogout }: { onLogout: () => void }) {
  const { screen } = useParams<{ screen?: string }>();
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const tab = (activeTab || screen) as string;
  const effectiveTab = TAB_IDS.includes(tab as any) ? tab : 'overview';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans">
      <WarehouseSidebar activeTab={effectiveTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[240px]">
        <WarehouseTopBar />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {effectiveTab === 'overview' && <WarehouseOverview />}
            {effectiveTab === 'inbound' && <InboundOps />}
            {effectiveTab === 'inventory' && <InventoryStorage />}
            {effectiveTab === 'outbound' && <OutboundOps />}
            {effectiveTab === 'transfers' && <Transfers />}
            {effectiveTab === 'qc' && <QCCompliance />}
            {effectiveTab === 'workforce' && <WorkforceShifts />}
            {effectiveTab === 'equipment' && <EquipmentAssets />}
            {effectiveTab === 'exceptions' && <Exceptions />}
            {effectiveTab === 'analytics' && <ReportsAnalytics />}
            {effectiveTab === 'utilities' && <WarehouseUtilities />}
        </main>
      </div>
    </div>
  );
}
