import React from 'react';
import { Collection } from './types';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { ImageIcon } from 'lucide-react';

interface ActiveCollectionsProps {
  collections: Collection[];
  onSelectCollection: (collection: Collection) => void;
  onViewAll: () => void;
  isLoading?: boolean;
}

export function ActiveCollections({ collections, onSelectCollection, onViewAll, isLoading }: ActiveCollectionsProps) {
  
  if (collections.length === 0 && !isLoading) {
      return (
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Active Collections</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="text-gray-300" size={32} />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No active collections yet</h4>
                <button className="text-[#7C3AED] font-medium hover:underline text-sm">Create your first collection</button>
            </div>
          </div>
      )
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <h3 className="font-bold text-[#212121]">Active Collections</h3>
        <button onClick={onViewAll} className="text-xs font-bold text-[#7C3AED] hover:underline">View All</button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200">
        {isLoading ? (
            // Skeletons
            [1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 border border-[#E0E0E0] rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded-md animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))
        ) : (
            collections.map(col => (
                <div 
                    key={col.id} 
                    className="flex items-center gap-4 p-3 border border-[#E0E0E0] rounded-lg hover:border-[#7C3AED] hover:shadow-md transition-all cursor-pointer group bg-white"
                    onClick={() => onSelectCollection(col)}
                >
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 overflow-hidden relative shrink-0">
                        {col.imageUrl ? (
                             <ImageWithFallback src={col.imageUrl} alt={col.name} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={20} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#212121] text-sm group-hover:text-[#7C3AED] truncate">{col.name}</h4>
                        <p className="text-xs text-[#757575] truncate">{col.skus.length} SKUs • {col.type}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                        col.status === 'Live' ? 'text-green-600 bg-green-50' : 
                        col.status === 'Draft' ? 'text-gray-600 bg-gray-100' :
                        col.status === 'Scheduled' ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'
                    }`}>
                        {col.status}
                    </span>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
