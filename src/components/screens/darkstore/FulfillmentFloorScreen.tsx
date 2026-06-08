import React, { useState } from 'react';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { DarkstoreTabBar } from '@/components/darkstore/DarkstoreTabBar';
import { PickPackOpsScreen } from '@/components/screens/PickPackOpsScreen';
import { LivePickingMonitor } from '@/components/screens/darkstore/LivePickingMonitor';
import { PackingStationScreen } from '@/components/screens/darkstore/PackingStationScreen';
import { PicklistManagementScreen } from '@/components/screens/darkstore/PicklistManagementScreen';

const TABS = [
  { id: 'pick-pack', label: 'Active Picks' },
  { id: 'packing', label: 'Packing Station' },
  { id: 'live-picking', label: 'Live Monitor' },
  { id: 'picklists', label: 'Picklists' },
] as const;

export type FulfillmentTab = (typeof TABS)[number]['id'];

interface FulfillmentFloorScreenProps {
  setActiveTab?: (tab: string) => void;
  initialTab?: FulfillmentTab;
}

export function FulfillmentFloorScreen({
  setActiveTab,
  initialTab = 'pick-pack',
}: FulfillmentFloorScreenProps) {
  const [activeTab, setTab] = useState<FulfillmentTab>(initialTab);

  return (
    <div className="space-y-4">
      <DarkstoreScreenShell
        title="Fulfillment Floor"
        subtitle="Pick, pack, and monitor floor operations in one place"
      >
        <DarkstoreTabBar tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} active={activeTab} onChange={(id) => setTab(id as FulfillmentTab)} />
        <div className="mt-4">
          {activeTab === 'pick-pack' && <PickPackOpsScreen setActiveTab={setActiveTab} embedded />}
          {activeTab === 'packing' && <PackingStationScreen embedded />}
          {activeTab === 'live-picking' && <LivePickingMonitor setActiveTab={setActiveTab} embedded />}
          {activeTab === 'picklists' && <PicklistManagementScreen embedded />}
        </div>
      </DarkstoreScreenShell>
    </div>
  );
}

/** Map legacy fulfillment tab routes to fulfillment floor sub-tabs */
export function fulfillmentInitialTab(activeTab: string): FulfillmentTab {
  if (activeTab === 'packing-station' || activeTab === 'packing') return 'packing';
  if (activeTab === 'livepickingmonitor') return 'live-picking';
  if (activeTab === 'picklists') return 'picklists';
  return 'pick-pack';
}
