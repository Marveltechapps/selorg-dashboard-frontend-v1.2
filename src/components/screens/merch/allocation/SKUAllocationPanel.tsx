import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { ScrollArea } from "../../../ui/scroll-area";
import { AllocationDetailDrawer } from './AllocationDetailDrawer';
import { SKURebalanceModal } from './SKURebalanceModal';
import { TransferOrderModal } from './TransferOrderModal';
import { allocationApi } from './allocationApi';
import { toast } from 'sonner';

export function SKUAllocationPanel({ searchQuery = "" }: { searchQuery?: string }) {
  const [filter, setFilter] = useState('high-priority');
  const [selectedSKU, setSelectedSKU] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRebalanceOpen, setIsRebalanceOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSkus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await allocationApi.fetchSKUAllocations();
      setSkus(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SKU allocations');
      setSkus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkus();
  }, [loadSkus]);

  const handleRebalanceComplete = () => {
    loadSkus();
    if (selectedSKU) {
      const updated = skus.find(s => s.id === selectedSKU.id);
      if (updated) setSelectedSKU(updated);
    }
  };

  const handleTransferComplete = () => {
    loadSkus();
    if (selectedSKU) {
      const updated = skus.find(s => s.id === selectedSKU.id);
      if (updated) setSelectedSKU(updated);
    }
  };

  const handleSKUClick = (sku: any) => {
    setSelectedSKU(sku);
    setIsDrawerOpen(true);
  };

  const filteredSKUs = skus.filter(sku => {
    if (searchQuery && !sku.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(sku.code || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === 'all') return true;
    if (filter === 'high-priority') {
      return sku.locations?.some((loc: any) => (loc.target || 0) > 0 && ((loc.allocated ?? 0) / (loc.target || 1)) < 0.8) ?? false;
    }
    if (filter === 'low-stock') {
      return sku.locations?.some((loc: any) => (loc.target || 0) > 0 && ((loc.allocated ?? 0) / (loc.target || 1)) < 0.5) ?? false;
    }
    if (filter === 'promo') {
      return (sku.category || '').toLowerCase().includes('beverage') || (sku.name || '').toLowerCase().includes('sale');
    }
    if (filter === 'new') {
      return sku.locations?.length === 1;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading SKU allocations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full items-center justify-center">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadSkus}
          className="text-[#7C3AED] text-sm font-medium hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#212121] flex items-center gap-2">
          <Boxes size={18} /> SKU Allocation
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter SKUs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high-priority">High Priority SKUs</SelectItem>
            <SelectItem value="all">All SKUs</SelectItem>
            <SelectItem value="low-stock">Low Stock SKUs</SelectItem>
            <SelectItem value="promo">Promo SKUs</SelectItem>
            <SelectItem value="new">New Launches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {filteredSKUs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 space-y-4">
              <p>No SKUs found. Seed allocation data to get started.</p>
              <button
                onClick={async () => {
                  try {
                    await allocationApi.seedAllocationData();
                    await loadSkus();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to seed');
                  }
                }}
                className="text-[#7C3AED] text-sm font-medium hover:underline"
              >
                Seed Allocation Data
              </button>
            </div>
          ) : filteredSKUs.map((sku) => (
            <div
              key={sku.id}
              className="p-4 border border-[#E0E0E0] rounded-lg hover:border-[#7C3AED] hover:shadow-md transition-all cursor-pointer bg-white group"
              onClick={() => handleSKUClick(sku)}
            >
              <div className="flex justify-between mb-3">
                <div>
                  <span className="font-bold text-[#212121] text-sm group-hover:text-[#7C3AED] transition-colors">{sku.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{sku.packSize || sku.code}</span>
                </div>
                <span className="text-xs font-bold text-[#757575] bg-gray-100 px-2 py-0.5 rounded-full">Total: {(sku.totalStock ?? 0).toLocaleString()}</span>
              </div>
              <div className="space-y-3">
                {(sku.locations ?? []).map((loc: any) => {
                  const target = loc.target || 1;
                  const allocated = loc.allocated ?? 0;
                  const percent = Math.min(100, (allocated / target) * 100);
                  return (
                    <div key={loc.id} className="flex items-center gap-3 text-xs">
                      <span className="w-24 text-[#616161] truncate" title={loc.name}>{loc.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${percent < 50 ? 'bg-red-500' : percent < 80 ? 'bg-yellow-500' : 'bg-[#7C3AED]'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="font-bold w-12 text-right">{allocated.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AllocationDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        sku={selectedSKU}
        onRebalance={() => setIsRebalanceOpen(true)}
        onCreateTransfer={() => setIsTransferOpen(true)}
        onUpdate={handleRebalanceComplete}
      />

      <SKURebalanceModal
        open={isRebalanceOpen}
        onOpenChange={setIsRebalanceOpen}
        sku={selectedSKU}
        onComplete={handleRebalanceComplete}
      />

      <TransferOrderModal
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        sku={selectedSKU}
        onComplete={handleTransferComplete}
      />
    </div>
  );
}
