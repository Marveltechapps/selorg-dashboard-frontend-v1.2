import React, { useState } from 'react';
import { Collection } from './types';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose
} from "../../../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { Separator } from "../../../ui/separator";
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { ImageIcon, Copy, Archive, Edit, CheckCircle, Clock } from 'lucide-react';
import { toast } from "sonner";

interface CollectionDrawerProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (col: Collection) => void;
  onDuplicate: (col: Collection) => void;
  onArchive: (col: Collection) => void;
}

export function CollectionDrawer({ collection, isOpen, onClose, onEdit, onDuplicate, onArchive }: CollectionDrawerProps) {
  if (!collection) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
                <SheetTitle className="text-2xl font-bold text-[#212121]">{collection.name}</SheetTitle>
                <SheetDescription>
                    {collection.description}
                </SheetDescription>
            </div>
            <Badge variant="outline" className={`
                ${collection.status === 'Live' ? 'bg-green-50 text-green-700 border-green-200' : 
                  collection.status === 'Draft' ? 'bg-gray-50 text-gray-600' : 
                  'bg-blue-50 text-blue-700'}
            `}>
                {collection.status}
            </Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start border-b border-[#E0E0E0] rounded-none bg-transparent h-auto p-0 mb-6">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Overview</TabsTrigger>
                <TabsTrigger value="skus" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">SKUs</TabsTrigger>
                <TabsTrigger value="visibility" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">Visibility</TabsTrigger>
                <TabsTrigger value="approvals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-4 py-2">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-[#E0E0E0] relative">
                    {collection.imageUrl ? (
                        <ImageWithFallback src={collection.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                             <ImageIcon size={48} />
                             <span className="text-sm">No cover image</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#757575] uppercase">Type</label>
                        <p className="text-sm font-medium text-[#212121]">{collection.type}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#757575] uppercase">Region</label>
                        <p className="text-sm font-medium text-[#212121]">{collection.region}</p>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-[#757575] uppercase">Total SKUs</label>
                        <p className="text-sm font-medium text-[#212121]">{collection.skus.length}</p>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-[#757575] uppercase">Last Updated</label>
                        <p className="text-sm font-medium text-[#212121]">{collection.updatedAt}</p>
                    </div>
                </div>

                <div className="space-y-2">
                     <label className="text-xs font-medium text-[#757575] uppercase">Tags</label>
                     <div className="flex flex-wrap gap-2">
                        {collection.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="bg-[#F5F5F5] text-[#616161] hover:bg-[#E0E0E0]">
                                {tag}
                            </Badge>
                        ))}
                     </div>
                </div>
            </TabsContent>

            <TabsContent value="skus">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                         <h4 className="font-medium text-sm">Included SKUs</h4>
                         <Button variant="outline" size="sm" onClick={() => onEdit(collection)}>Manage SKUs</Button>
                    </div>
                    <div className="border border-[#E0E0E0] rounded-lg divide-y divide-[#E0E0E0]">
                        {collection.skus.map(skuId => (
                            <div key={skuId} className="p-3 flex items-center justify-between hover:bg-[#FAFAFA]">
                                <span className="text-sm font-medium">SKU-{skuId} (Mock Name)</span>
                                <span className="text-xs text-gray-500">₹5.99</span>
                            </div>
                        ))}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="visibility">
                <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
                        This collection is currently featured on the <strong>Home Screen</strong> of the North America app.
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Placement Settings</h4>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">Home Page Spotlight</span>
                            <CheckCircle size={16} className="text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                             <span className="text-sm">Category Top Banner</span>
                             <span className="text-xs">Inactive</span>
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="approvals">
                 <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-[#E0E0E0] space-y-6">
                        <div className="relative">
                            <span className="absolute -left-[29px] top-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                            <p className="text-sm font-medium">Published to Live</p>
                            <p className="text-xs text-[#757575]">Yesterday by {collection.owner}</p>
                        </div>
                         <div className="relative">
                            <span className="absolute -left-[29px] top-0 w-3 h-3 rounded-full bg-[#E0E0E0] border-2 border-white"></span>
                            <p className="text-sm font-medium">Approved by Merch Lead</p>
                            <p className="text-xs text-[#757575]">2 days ago by Alex M.</p>
                        </div>
                         <div className="relative">
                            <span className="absolute -left-[29px] top-0 w-3 h-3 rounded-full bg-[#E0E0E0] border-2 border-white"></span>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-xs text-[#757575]">3 days ago by {collection.owner}</p>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>

        <div className="mt-8 pt-6 border-t border-[#E0E0E0] flex gap-3">
             <Button className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => onEdit(collection)}>
                <Edit size={16} className="mr-2" /> Edit Collection
             </Button>
             <Button variant="outline" onClick={() => onDuplicate(collection)}>
                <Copy size={16} />
             </Button>
             <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" onClick={() => onArchive(collection)}>
                <Archive size={16} />
             </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
