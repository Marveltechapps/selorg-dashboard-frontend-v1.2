import React, { useState } from 'react';
import { SKU, Region } from './types';
import { Eye, EyeOff, Edit, AlertCircle } from 'lucide-react';
import { Button } from "../../../ui/button";
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
import { toast } from "sonner";

interface SKUVisibilityProps {
  skus: SKU[];
  currentRegion: Region | 'Global';
  onToggleVisibility: (sku: SKU, region: Region | 'Global') => void;
  onEditSKU: (sku: SKU) => void;
  isLoading?: boolean;
}

export function SKUVisibility({ skus, currentRegion, onToggleVisibility, onEditSKU, isLoading }: SKUVisibilityProps) {
  const [skuToToggle, setSkuToToggle] = useState<SKU | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleToggleClick = (sku: SKU) => {
    // Check if we need confirmation
    // For now, let's mock the logic: if stock is low or it's visible, show warning
    const isVisible = isSkuVisible(sku, currentRegion);
    
    if (isVisible) {
      // Mock check for campaigns/collections
      // In a real app, this would be passed down or calculated
      const isInCampaign = Math.random() > 0.7; 
      
      if (isInCampaign) {
        setSkuToToggle(sku);
        setIsAlertOpen(true);
        return;
      }
    }
    
    // Immediate toggle if no warning needed
    onToggleVisibility(sku, currentRegion);
  };

  const confirmToggle = () => {
    if (skuToToggle) {
      onToggleVisibility(skuToToggle, currentRegion);
      setSkuToToggle(null);
      setIsAlertOpen(false);
    }
  };

  const isSkuVisible = (sku: SKU, region: Region | 'Global') => {
    if (region === 'Global') {
       // If global, visible if visible in AT LEAST one region? Or ALL?
       // Prompt says "In Global mode, visibility changes should apply across all regions (with an explicit warning text)"
       // The icon should probably reflect "Mixed" or "All Visible". 
       // For simplicity, let's say visible if visible in 'North America' (primary market) or check all.
       const values = Object.values(sku.visibility);
       return values.includes('Visible');
    }
    return sku.visibility[region] === 'Visible';
  };

  if (skus.length === 0 && !isLoading) {
       return (
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">SKU Visibility</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#757575]">
                <p>No SKUs match the current filters</p>
                <button className="text-[#7C3AED] text-sm mt-2 hover:underline">Clear Filters</button>
            </div>
          </div>
      );
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <h3 className="font-bold text-[#212121]">SKU Visibility</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-center">Visible</th>
                    <th className="px-4 py-2 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
                {isLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                        <tr key={i}>
                             <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" /></td>
                             <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-4 mx-auto animate-pulse" /></td>
                             <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-4 ml-auto animate-pulse" /></td>
                        </tr>
                    ))
                ) : (
                    skus.map(sku => {
                        const visible = isSkuVisible(sku, currentRegion);
                        return (
                            <tr key={sku.id} className="hover:bg-[#FAFAFA]">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-[#212121]">{sku.name}</p>
                                    <p className="text-xs text-[#757575]">SKU: {sku.code}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button 
                                        onClick={() => handleToggleClick(sku)}
                                        className="hover:bg-gray-100 p-1 rounded transition-colors"
                                    >
                                        {visible ? (
                                            <Eye size={16} className="text-green-600 inline-block" />
                                        ) : (
                                            <EyeOff size={16} className="text-gray-400 inline-block" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        className="p-1 hover:bg-gray-100 rounded text-[#757575] hover:text-[#7C3AED]"
                                        onClick={() => onEditSKU(sku)}
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
                This SKU is part of live campaigns and collections. Hiding it may impact those experiences. Do you still want to hide it?
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
