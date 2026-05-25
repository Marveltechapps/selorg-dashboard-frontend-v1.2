import React from 'react';
import { SKUAllocationPanel } from './allocation/SKUAllocationPanel';
import { ReplenishmentAlertsPanel } from './allocation/ReplenishmentAlertsPanel';

export function AllocationStock({ searchQuery = "" }: { searchQuery?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212121]">Allocation & Stock Control</h1>
        <p className="text-[#757575] text-sm">SKU distribution, replenishment alerts, and rebalancing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
        <SKUAllocationPanel searchQuery={searchQuery} />
        <ReplenishmentAlertsPanel />
      </div>
    </div>
  );
}
