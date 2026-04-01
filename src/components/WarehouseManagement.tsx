import React from 'react';
import { useParams } from 'react-router-dom';
import { WarehouseSidebar } from './warehouse/WarehouseSidebar';
import { WarehouseTopBar } from './warehouse/WarehouseTopBar';
import { WarehouseBreadcrumbs } from './warehouse/WarehouseBreadcrumbs';
import { WarehouseOverview } from './screens/warehouse/WarehouseOverview';
import { InboundOps } from './screens/warehouse/InboundOps';
import { InventoryStorage } from './screens/warehouse/InventoryStorage';
import { OutboundOps } from './screens/warehouse/OutboundOps';
import { Transfers } from './screens/warehouse/Transfers';
import { QCCompliance } from './screens/warehouse/QCCompliance';
import { WorkforceShifts } from './screens/warehouse/WorkforceShifts';
import { ShiftMaster } from './screens/warehouse/ShiftMaster';
import { ShiftRoster } from './screens/warehouse/ShiftRoster';
import { EquipmentAssets } from './screens/warehouse/EquipmentAssets';
import { WarehouseDevices } from './screens/warehouse/WarehouseDevices';
import { Exceptions } from './screens/warehouse/Exceptions';
import { ReportsAnalytics } from './screens/warehouse/ReportsAnalytics';
import { WarehouseUtilities } from './screens/warehouse/WarehouseUtilities';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

const TAB_IDS = ['overview', 'inbound', 'inventory', 'outbound', 'transfers', 'qc', 'workforce', 'shift-master', 'shift-roster', 'equipment', 'devices', 'exceptions', 'analytics', 'utilities'] as const;

export function WarehouseManagement({ onLogout }: { onLogout: () => void }) {
  const { screen } = useParams<{ screen?: string }>();
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const tab = (activeTab || screen) as string;
  const effectiveTab = TAB_IDS.includes(tab as any) ? tab : 'overview';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans">
      <WarehouseSidebar activeTab={effectiveTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      {/* Fixed top bar is out of flow — reserve space with a non-shrinking spacer (flex-col). Heights ≥ WarehouseTopBar h-14/h-16 + room for border/shadow/zoom. */}
      <div className="pl-[240px] min-h-screen flex flex-col">
        <WarehouseTopBar />
        <div
          aria-hidden
          className="w-full shrink-0 flex-none h-[72px]"
        />

        <main className="flex-1 min-w-0 px-3 sm:px-6 md:px-8 pb-12 max-w-[1920px] mx-auto w-full pt-1">
            <WarehouseBreadcrumbs activeTab={effectiveTab} />
            {effectiveTab === 'overview' && <WarehouseOverview />}
            {effectiveTab === 'inbound' && <InboundOps />}
            {effectiveTab === 'inventory' && <InventoryStorage />}
            {effectiveTab === 'outbound' && <OutboundOps />}
            {effectiveTab === 'transfers' && <Transfers />}
            {effectiveTab === 'qc' && <QCCompliance />}
            {effectiveTab === 'workforce' && <WorkforceShifts />}
            {effectiveTab === 'shift-master' && <ShiftMaster />}
            {effectiveTab === 'shift-roster' && <ShiftRoster />}
            {effectiveTab === 'equipment' && <EquipmentAssets />}
            {effectiveTab === 'devices' && <WarehouseDevices />}
            {effectiveTab === 'exceptions' && <Exceptions />}
            {effectiveTab === 'analytics' && <ReportsAnalytics />}
            {effectiveTab === 'utilities' && <WarehouseUtilities />}
        </main>
      </div>
    </div>
  );
}
