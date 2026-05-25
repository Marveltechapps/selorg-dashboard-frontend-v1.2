import React, { useState } from 'react';
import { SKU, Region } from './types';
import { Eye, EyeOff, Edit, AlertCircle, Loader2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../ui/alert-dialog";

interface SKUVisibilityProps {
  skus: SKU[];
  currentRegion: Region | 'Global';
  onToggleVisibility: (sku: SKU, region: Region | 'Global') => void | Promise<void>;
  onEditSKU: (sku: SKU) => void;
  isLoading?: boolean;
  togglingSkuId?: string | null;
  liveCollectionSkuIds?: Set<string>;
}

export function SKUVisibility({
  skus,
  currentRegion,
  onToggleVisibility,
  onEditSKU,
  isLoading,
  togglingSkuId = null,
  liveCollectionSkuIds = new Set(),
}: SKUVisibilityProps) {
  const [skuToToggle, setSkuToToggle] = useState<SKU | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isSkuVisible = (sku: SKU, region: Region | 'Global') => {
    if (region === 'Global') {
      return Object.values(sku.visibility).some((v) => v === 'Visible');
    }
    return (sku.visibility[region] ?? 'Hidden') === 'Visible';
  };

  const handleToggleClick = (sku: SKU) => {
    if (togglingSkuId) return;

    const isVisible = isSkuVisible(sku, currentRegion);
    const hiding = isVisible;
    const inLiveCollection = liveCollectionSkuIds.has(sku.id);

    if (hiding && inLiveCollection) {
      setSkuToToggle(sku);
      setIsAlertOpen(true);
      return;
    }

    void onToggleVisibility(sku, currentRegion);
  };

  const confirmToggle = () => {
    if (skuToToggle) {
      void onToggleVisibility(skuToToggle, currentRegion);
      setSkuToToggle(null);
      setIsAlertOpen(false);
    }
  };

  if (skus.length === 0 && !isLoading) {
    return (
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">SKU Visibility</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#757575]">
          <p>No SKUs match the current filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <h3 className="font-bold text-[#212121]">SKU Visibility</h3>
        <span className="text-xs text-[#757575]">{currentRegion}</span>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0] sticky top-0">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-center">Visible</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-4 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-4 ml-auto animate-pulse" /></td>
                </tr>
              ))
            ) : (
              skus.map((sku) => {
                const visible = isSkuVisible(sku, currentRegion);
                const isToggling = togglingSkuId === sku.id;
                return (
                  <tr key={sku.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#212121]">{sku.name}</p>
                      <p className="text-xs text-[#757575]">SKU: {sku.code}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleClick(sku)}
                        disabled={!!togglingSkuId}
                        className="hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-50"
                        aria-label={visible ? 'Hide SKU' : 'Show SKU'}
                      >
                        {isToggling ? (
                          <Loader2 size={16} className="animate-spin text-[#7C3AED] inline-block" />
                        ) : visible ? (
                          <Eye size={16} className="text-green-600 inline-block" />
                        ) : (
                          <EyeOff size={16} className="text-gray-400 inline-block" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-100 rounded text-[#757575] hover:text-[#7C3AED] disabled:opacity-50"
                        onClick={() => onEditSKU(sku)}
                        disabled={isToggling}
                        aria-label="Edit SKU"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle size={20} />
              Confirm Visibility Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              This SKU is in a live collection. Hiding it may affect that collection. Do you still want to hide it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} className="bg-amber-600 hover:bg-amber-700 text-white">
              Yes, Hide SKU
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
