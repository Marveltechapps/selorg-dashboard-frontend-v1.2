import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from "../../ui/button";
import { SKUAllocationPanel } from './allocation/SKUAllocationPanel';
import { ReplenishmentAlertsPanel } from './allocation/ReplenishmentAlertsPanel';
import { AutoRebalanceWizard } from './allocation/AutoRebalanceWizard';

export function AllocationStock({ searchQuery = "" }: { searchQuery?: string }) {
  const [isAutoRebalanceOpen, setIsAutoRebalanceOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const onRebalanceComplete = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Allocation & Stock Control</h1>
          <p className="text-[#757575] text-sm">SKU distribution, replenishment alerts, and rebalancing</p>
        </div>
        <Button 
            className="bg-[#212121] text-white font-medium hover:bg-[#000]"
            onClick={() => setIsAutoRebalanceOpen(true)}
        >
          <RefreshCw size={16} className="mr-2" />
          Auto Rebalance
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
         <SKUAllocationPanel key={refreshKey} searchQuery={searchQuery} />
         <ReplenishmentAlertsPanel key={refreshKey} />
      </div>

      <AutoRebalanceWizard 
        open={isAutoRebalanceOpen} 
        onOpenChange={setIsAutoRebalanceOpen} 
        onComplete={onRebalanceComplete}
      />
    </div>
  );
}
