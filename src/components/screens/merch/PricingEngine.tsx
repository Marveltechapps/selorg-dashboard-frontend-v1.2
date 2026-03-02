import React, { useState, useEffect } from 'react';
import { Tag, TrendingUp, AlertCircle, Edit2, History, ChevronRight, BarChart3, Filter, Loader2 } from 'lucide-react';
import { pricingApi } from './pricing/pricingApi';
import { PriceRuleWizard } from './pricing/PriceRuleWizard';
import { SurgePricingDrawer } from './pricing/SurgePricingDrawer';
import { MarginRiskView } from './pricing/MarginRiskView';
import { PendingUpdatesView } from './pricing/PendingUpdatesView';
import { SKUPriceDetailDrawer } from './pricing/SKUPriceDetailDrawer';
import { BulkPriceEditModal } from './pricing/BulkPriceEditModal';
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "../../ui/dropdown-menu";

let _shouldOpenPendingUpdates = false;

export function setOpenPendingUpdates(v: boolean) {
  _shouldOpenPendingUpdates = v;
}

export function PricingEngine({ searchQuery = "" }: { searchQuery?: string }) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSurgeOpen, setIsSurgeOpen] = useState(false);
  const [isMarginOpen, setIsMarginOpen] = useState(false);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Using Real API
  const [allSkus, setAllSkus] = useState<any[]>([]);
  const [surgeRules, setSurgeRules] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [priceRules, setPriceRules] = useState<any[]>([]);
  const [isRulesViewOpen, setIsRulesViewOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [skusResp, surgeRulesResp, updatesResp, priceRulesResp] = await Promise.all([
        pricingApi.getPricingSKUs(),
        pricingApi.getSurgeRules(),
        pricingApi.getPendingUpdates(),
        pricingApi.getPriceRules()
      ]);
      if (skusResp.success && Array.isArray(skusResp.data)) {
        setAllSkus(skusResp.data);
      }
      if (surgeRulesResp.success && Array.isArray(surgeRulesResp.data)) {
        setSurgeRules(surgeRulesResp.data);
      }
      if (updatesResp.success && Array.isArray(updatesResp.data)) {
        setPendingUpdates(updatesResp.data);
      }
      if (priceRulesResp.success && Array.isArray(priceRulesResp.data)) {
        setPriceRules(priceRulesResp.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load pricing data', err);
      toast.error('Failed to load pricing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadData();
      if (!mounted) return;
    })();
    return () => { mounted = false; };
  }, []);

  // Listen for event to open pending updates
  useEffect(() => {
    const handleOpenPendingUpdates = (event: Event) => {
      console.log('Received openPendingUpdates event');
      setIsPendingOpen(true);
    };
    
    // Use a more reliable event listener
    const eventHandler = handleOpenPendingUpdates as EventListener;
    window.addEventListener('openPendingUpdates', eventHandler);
    
    const checkAndOpen = () => {
      if (_shouldOpenPendingUpdates) {
        _shouldOpenPendingUpdates = false;
        setIsPendingOpen(true);
      }
    };
    
    // Check immediately
    checkAndOpen();
    
    // Also check after a short delay in case component just mounted
    const timeoutId = setTimeout(checkAndOpen, 200);
    
    return () => {
      window.removeEventListener('openPendingUpdates', eventHandler);
      clearTimeout(timeoutId);
    };
  }, []);

  const skusToUse = allSkus;

  const [activeFilters, setActiveFilters] = useState({
    status: 'all'
  });

  const skus = (skusToUse ?? []).filter((sku: any) => {
    const name = (sku.name ?? '').toLowerCase();
    const code = (sku.code ?? sku.sku ?? '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || name.includes(q) || code.includes(q);
    const matchesStatus = activeFilters.status === 'all' || sku.marginStatus === activeFilters.status;
    return matchesSearch && matchesStatus;
  });

  const marginRiskCount = (allSkus ?? []).filter((s: any) => (s.margin ?? 0) < 15 || ['critical', 'warning'].includes((s.marginStatus ?? '').toLowerCase())).length;

  const handleEditSku = (sku: any) => {
    setSelectedSku(sku);
  };

  const handleUpdateSkuPrice = async (updatedSku: any) => {
    try {
      const id = updatedSku.id ?? updatedSku._id;
      const resp = await pricingApi.updateSkuPrice(id, {
        base: updatedSku.base,
        sell: updatedSku.sell,
        margin: updatedSku.margin,
        marginStatus: updatedSku.marginStatus || (updatedSku.margin < 10 ? 'critical' : (updatedSku.margin < 15 ? 'warning' : 'healthy'))
      });
      if (resp.success && resp.data) {
        const normalized = { ...resp.data, id: resp.data.id ?? resp.data._id };
        setAllSkus(prev => prev.map(s => (s.id ?? s._id) === id ? { ...s, ...normalized } : s));
      }
      setSelectedSku(null);
      toast.success(`${updatedSku.name} updated successfully`);
    } catch (err) {
      console.error('Failed to update SKU price', err);
      toast.error('Failed to update price');
    }
  };

  const handleCreateRule = async (rule: any) => {
    try {
      const response = await pricingApi.createPriceRule(rule);
      if (response.success) {
        const priceRulesResp = await pricingApi.getPriceRules();
        if (priceRulesResp.success && Array.isArray(priceRulesResp.data)) {
          setPriceRules(priceRulesResp.data);
        }
        toast.success(`Rule "${rule.name}" created successfully`);
      } else {
        toast.error("Failed to create rule");
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error("Failed to create rule");
    }
    setIsWizardOpen(false);
  };

  if (isLoading && (allSkus ?? []).length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#7C3AED]" />
              <p className="font-medium">Loading pricing data...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Pricing Engine</h1>
          <p className="text-[#757575] text-sm">Base pricing, geo-pricing rules, and competitor benchmarking</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setIsRulesViewOpen(true)}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2 transition-colors"
          >
            <History size={16} />
            View Rules ({priceRules.length})
          </button>
          <button 
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] flex items-center gap-2 transition-colors shadow-sm"
          >
            <Tag size={16} />
            New Price Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setIsSurgeOpen(true)}
            className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
             <div className="flex justify-between items-start">
                 <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                     <TrendingUp size={18} className="text-[#7C3AED]" /> Surge Pricing
                 </h3>
                 <ChevronRight className="text-gray-300 group-hover:text-[#7C3AED] transition-colors" size={20} />
             </div>
             <div className="flex items-end gap-2">
                 <span className="text-4xl font-bold text-[#212121]">{surgeRules.filter((r: any) => r.active !== false).length > 0 ? 'Active' : 'Inactive'}</span>
                 <span className="text-sm text-[#757575] mb-1">in {surgeRules.length} zone{surgeRules.length !== 1 ? 's' : ''}</span>
             </div>
             <p className="text-xs text-[#757575] mt-2 group-hover:text-[#7C3AED] transition-colors">Multiplier: 1.1x - 1.25x</p>
          </div>

           <div 
            onClick={() => setIsMarginOpen(true)}
            className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
           >
             <div className="flex justify-between items-start">
                <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                    <AlertCircle size={18} className="text-[#EF4444]" /> Margin Alert
                </h3>
                <ChevronRight className="text-gray-300 group-hover:text-[#EF4444] transition-colors" size={20} />
             </div>
             <div className="flex items-end gap-2">
                 <span className="text-4xl font-bold text-[#EF4444]">{marginRiskCount}</span>
                 <span className="text-sm text-[#757575] mb-1">SKU{marginRiskCount !== 1 ? 's' : ''}</span>
             </div>
             <p className="text-xs text-[#757575] mt-2 group-hover:text-[#EF4444] transition-colors">Below min. margin threshold</p>
          </div>

           <div 
             onClick={() => setIsPendingOpen(true)}
             className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
           >
             <div className="flex justify-between items-start">
                <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                    <History size={18} className="text-[#3B82F6]" /> Pending Updates
                </h3>
                <ChevronRight className="text-gray-300 group-hover:text-[#3B82F6] transition-colors" size={20} />
             </div>
             <div className="flex items-end gap-2">
                 <span className="text-4xl font-bold text-[#212121]">{pendingUpdates.length}</span>
                 <span className="text-sm text-[#757575] mb-1">Request{pendingUpdates.length !== 1 ? 's' : ''}</span>
             </div>
             <p className="text-xs text-[#757575] mt-2 group-hover:text-[#3B82F6] transition-colors">Waiting for approval</p>
          </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <div className="flex items-center gap-2">
                <BarChart3 className="text-[#757575]" size={20} />
                <h3 className="font-bold text-[#212121]">SKU Price Management</h3>
             </div>
             <div className="flex gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "p-2 text-[#757575] hover:text-[#212121] hover:bg-white rounded-lg border border-transparent hover:border-[#E0E0E0] transition-all",
                            activeFilters.status !== 'all' && "text-[#7C3AED] border-[#E0E0E0] bg-purple-50"
                        )}>
                            <Filter size={16} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            setActiveFilters({status: 'all'});
                        }}>
                            <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full bg-slate-300" /> All SKUs
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            setActiveFilters({status: 'healthy'});
                        }}>
                            <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full bg-green-500" /> Healthy Margin
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            setActiveFilters({status: 'warning'});
                        }}>
                            <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Warning
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            setActiveFilters({status: 'critical'});
                        }}>
                            <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full bg-red-500" /> Critical
                            </div>
                        </DropdownMenuItem>
                        {activeFilters.status !== 'all' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setActiveFilters({status: 'all'})} className="text-[#7C3AED] font-bold">
                                    Clear Filters
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                 </DropdownMenu>
                 <button 
                    type="button"
                    onClick={() => setIsBulkOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-[#E0E0E0] rounded text-[#212121] hover:bg-gray-50 transition-colors"
                 >
                    Bulk Edit
                 </button>
             </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">SKU Name</th>
                <th className="px-6 py-3">Base Price</th>
                <th className="px-6 py-3">Current Selling</th>
                <th className="px-6 py-3">Competitor Avg</th>
                <th className="px-6 py-3">Margin</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {skus.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#757575]">
                    {allSkus.length === 0 ? 'No SKUs yet. Add SKUs in the catalog.' : 'No SKUs match your filters.'}
                  </td>
                </tr>
              ) : skus.map((sku) => (
                <tr key={sku.id ?? sku._id ?? sku.code} className="hover:bg-[#FAFAFA] transition-colors group">
                    <td className="px-6 py-4">
                        <button 
                            type="button"
                            onClick={() => handleEditSku(sku)}
                            className="text-left hover:text-[#7C3AED] transition-colors"
                        >
                            <p className="font-medium text-[#212121] group-hover:text-[#7C3AED]">{sku.name}</p>
                            <p className="text-xs text-[#757575]">{sku.code}</p>
                        </button>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">₹{sku.base.toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-[#212121]">₹{sku.sell.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[#616161]">₹{sku.competitor.toFixed(2)}</td>
                    <td className={`px-6 py-4 font-medium ${
                        sku.marginStatus === 'healthy' ? 'text-[#16A34A]' :
                        sku.marginStatus === 'warning' ? 'text-[#EAB308]' : 'text-[#EF4444]'
                    }`}>
                        {sku.margin}%
                    </td>
                    <td className="px-6 py-4 text-right">
                    <button 
                        type="button"
                        onClick={() => handleEditSku(sku)}
                        className="text-[#7C3AED] hover:text-[#6D28D9] font-medium text-xs flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Edit2 size={12} /> Edit
                    </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* Interactive Components */}
      <PriceRuleWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onSubmit={handleCreateRule} />
      <SurgePricingDrawer open={isSurgeOpen} onOpenChange={setIsSurgeOpen} />
      <MarginRiskView open={isMarginOpen} onOpenChange={setIsMarginOpen} />
      <PendingUpdatesView open={isPendingOpen} onOpenChange={setIsPendingOpen} />
      <SKUPriceDetailDrawer 
        sku={selectedSku} 
        open={!!selectedSku} 
        onOpenChange={(open) => !open && setSelectedSku(null)} 
        onUpdate={handleUpdateSkuPrice}
      />
      <BulkPriceEditModal 
        open={isBulkOpen} 
        onOpenChange={setIsBulkOpen}
        allSkus={skusToUse}
        onBulkUpdate={async (updatedSkus) => {
          const changed = (updatedSkus ?? []).filter((u: any) => {
            const orig = (skusToUse ?? []).find((s: any) => (s.id ?? s._id) === (u.id ?? u._id));
            return orig && (orig.sell !== u.sell || orig.base !== u.base);
          });
          const next = [...(allSkus ?? [])];
          for (const sku of changed) {
            const id = sku.id ?? sku._id;
            try {
              const resp = await pricingApi.updateSkuPrice(id, { base: sku.base, sell: sku.sell, margin: sku.margin, marginStatus: sku.marginStatus });
              if (resp.success && resp.data) {
                const idx = next.findIndex((s: any) => (s.id ?? s._id) === id);
                if (idx >= 0) next[idx] = { ...next[idx], ...resp.data, id: resp.data.id ?? resp.data._id ?? id };
              }
            } catch (e) {
              toast.error(`Failed to update ${sku.name ?? sku.code}`);
            }
          }
          setAllSkus(next);
          if (changed.length > 0) toast.success(`Updated ${changed.length} SKU(s)`);
        }}
      />
      
      {/* Price Rules View Modal */}
      {isRulesViewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsRulesViewOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#212121]">Price Rules</h2>
                <p className="text-sm text-[#757575] mt-1">Manage your pricing rules and configurations</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesViewOpen(false)}
                className="text-[#757575] hover:text-[#212121] text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {priceRules.length === 0 ? (
                <div className="text-center py-12 text-[#757575]">
                  <Tag size={48} className="mx-auto mb-4 text-[#E0E0E0]" />
                  <p className="font-medium">No price rules created yet</p>
                  <p className="text-sm mt-2">Create your first price rule to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {priceRules.map((rule: any) => (
                    <div key={rule.id ?? rule._id ?? rule.name} className="border border-[#E0E0E0] rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-[#212121]">{rule.name || 'Untitled Rule'}</h3>
                          <p className="text-sm text-[#757575] mt-1">{rule.description || 'No description'}</p>
                          <div className="flex gap-2 mt-3">
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                              {rule.type || 'base'}
                            </span>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                              {rule.scope || 'region'}
                            </span>
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">
                              {rule.status || 'pending'}
                            </span>
                          </div>
                          {rule.pricingMethod && (
                            <p className="text-xs text-[#757575] mt-2">
                              Method: {rule.pricingMethod} | Margin: {rule.marginMin || 'N/A'}% - {rule.marginMax || 'N/A'}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRulesViewOpen(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRulesViewOpen(false);
                  setIsWizardOpen(true);
                }}
                className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9]"
              >
                Create New Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
