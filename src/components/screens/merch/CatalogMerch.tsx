import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Database } from 'lucide-react';
import { toast } from "sonner";
import { catalogApi } from '../../../api/merch/catalogApi';

import { SearchFilterBar, FilterState } from './catalog/SearchFilterBar';
import { ActiveCollections } from './catalog/ActiveCollections';
import { SKUVisibility } from './catalog/SKUVisibility';
import { CollectionDrawer } from './catalog/CollectionDrawer';
import { CreateCollectionModal } from './catalog/CreateCollectionModal';
import { SKUEditDrawer } from './catalog/SKUEditDrawer';
import { AddSKUModal } from './catalog/AddSKUModal';
import { CollectionsListModal } from './catalog/CollectionsListModal';
import { Collection, SKU, Region, SKUVisibilityStatus } from './catalog/types';

export function CatalogMerch({ searchQuery = "" }: { searchQuery?: string }) {
  // Data State - Using Real API
  const [collections, setCollections] = useState<Collection[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [collectionsResp, skusResp] = await Promise.all([
        catalogApi.getCollections(),
        catalogApi.getSKUs(),
      ]);
      setCollections(collectionsResp.success && collectionsResp.data ? collectionsResp.data : []);
      setSkus(skusResp.success && skusResp.data ? skusResp.data.map((s: any) => ({
        ...s,
        code: s.code ?? s.sku ?? s.id ?? '',
      })) : []);
    } catch (err) {
      console.error('Failed to load catalog data', err);
      toast.error('Failed to load catalog data');
      setCollections([]);
      setSkus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const [isLoading, setIsLoading] = useState(false);

  // UI State
  const [filters, setFilters] = useState<FilterState>({
    collectionStatus: 'All',
    collectionType: 'All',
    skuVisibility: 'All'
  });
  const [currentRegion, setCurrentRegion] = useState<Region>('North America'); 

  // Drawer/Modal State
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [isAddSKUOpen, setIsAddSKUOpen] = useState(false);
  const [isCollectionsListOpen, setIsCollectionsListOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Derived State (Filtering)
  const filteredCollections = collections.filter(col => {
    if (searchQuery && !col.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(col.tags ?? []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    if (filters.collectionStatus !== 'All' && col.status !== filters.collectionStatus) return false;
    if (filters.collectionType !== 'All' && col.type !== filters.collectionType) return false;
    return true;
  });

  const filteredSkus = skus.filter(sku => {
    if (searchQuery && !sku.name.toLowerCase().includes(searchQuery.toLowerCase()) && !sku.code.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }
    const isVisibleInRegion = sku.visibility[currentRegion] === 'Visible';
    if (filters.skuVisibility === 'Visible' && !isVisibleInRegion) return false;
    if (filters.skuVisibility === 'Hidden' && isVisibleInRegion) return false;
    return true;
  });

  const handleCreateCollection = async (data: any) => {
    setIsLoading(true);
    try {
      if (editingCollection) {
        const response = await catalogApi.updateCollection(editingCollection.id, {
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status,
          tags: data.tags,
          skus: data.skus,
          imageUrl: data.media || editingCollection.imageUrl,
          region: data.region,
        });
        if (response.success) {
          toast.success("Collection updated successfully");
          await loadData();
        } else {
          toast.error("Failed to update collection");
        }
        setEditingCollection(null);
      } else {
        const response = await catalogApi.createCollection({
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status,
          tags: data.tags || [],
          skus: data.skus || [],
          region: data.region || 'Global',
          imageUrl: data.media,
          owner: 'You',
        });
        if (response.success) {
          toast.success("Collection created successfully");
          await loadData();
        } else {
          toast.error("Failed to create collection");
        }
      }
    } catch (error) {
      console.error('Error creating/updating collection:', error);
      toast.error("Failed to save collection");
    } finally {
      setIsLoading(false);
      setIsCreateCollectionOpen(false);
    }
  };

  const handleDuplicateCollection = async (col: Collection) => {
    try {
      const response = await catalogApi.createCollection({
        name: `${col.name} (Copy)`,
        description: col.description,
        type: col.type,
        status: col.status,
        tags: col.tags ?? [],
        skus: col.skus ?? [],
        region: col.region ?? 'Global',
        imageUrl: col.imageUrl,
        owner: 'You',
      });
      if (response.success) {
        toast.success(`${col.name} duplicated successfully`);
        await loadData();
      } else {
        toast.error("Failed to duplicate collection");
      }
    } catch (error) {
      console.error('Error duplicating collection:', error);
      toast.error("Failed to duplicate collection");
    }
  };

  const handleArchiveCollection = async (col: Collection) => {
    try {
      const response = await catalogApi.updateCollection(col.id, { status: 'Archived' });
      if (response.success) {
        toast.success(`${col.name} archived successfully`);
        await loadData();
      } else {
        toast.error("Failed to archive collection");
      }
    } catch (error) {
      console.error('Error archiving collection:', error);
      toast.error("Failed to archive collection");
    }
    setSelectedCollection(null);
  };

  const handleAddSKU = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await catalogApi.createSKU({
        code: data.code || `SKU-${Date.now()}`,
        name: data.name || 'New Product',
        category: data.category || 'Uncategorized',
        brand: data.brand || 'Generic',
        price: data.price ?? 0,
        stock: data.stock ?? 0,
        visibility: { 'North America': 'Visible', 'Europe (West)': 'Hidden', 'APAC': 'Hidden' },
        imageUrl: data.images?.[0],
      });
      if (response.success) {
        toast.success("SKU created successfully");
        await loadData();
      } else {
        toast.error("Failed to create SKU");
      }
    } catch (error) {
      console.error('Error creating SKU:', error);
      toast.error("Failed to create SKU");
    } finally {
      setIsLoading(false);
      setIsAddSKUOpen(false);
    }
  };

  const handleToggleVisibility = async (sku: SKU, region: Region | 'Global') => {
    const newStatus: SKUVisibilityStatus = sku.visibility[region as Region] === 'Visible' ? 'Hidden' : 'Visible';
    const newVisibility = { ...sku.visibility, [region as Region]: newStatus };
    setSkus(skus.map(s => (s.id === sku.id ? { ...s, visibility: newVisibility } : s)));
    try {
      const response = await catalogApi.updateSKU(sku.id, { visibility: newVisibility });
      if (response.success) {
        toast.success("SKU visibility updated successfully");
      } else {
        toast.error("Failed to update visibility");
        setSkus(skus);
      }
    } catch (error) {
      console.error('Error updating SKU visibility:', error);
      toast.error("Failed to update visibility");
      setSkus(skus);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Catalog Merchandising</h1>
          <p className="text-[#757575] text-sm">Product visibility, collections, and media assets for <span className="font-semibold text-purple-600">{currentRegion}</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateCollectionOpen(true)}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Create Collection
          </button>
          <button 
            onClick={() => setIsAddSKUOpen(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add SKU
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilterBar 
        onSearch={() => {}} // Internal search disabled as global search is used
        onFilterChange={setFilters}
        recentSearches={['Summer', 'Beverages', 'New Arrivals']}
        allCollections={collections}
        allSkus={skus}
        onSelectCollection={(col) => setSelectedCollection(col)}
        onSelectSKU={(sku) => setSelectedSKU(sku)}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
          {/* Active Collections Panel (Left - 5 cols) */}
          <div className="lg:col-span-5 h-full">
            <ActiveCollections 
                collections={filteredCollections}
                onSelectCollection={setSelectedCollection}
                onViewAll={() => setIsCollectionsListOpen(true)}
                isLoading={isLoading}
            />
          </div>

          {/* SKU Visibility Panel (Right - 7 cols) */}
          <div className="lg:col-span-7 h-full">
            <SKUVisibility 
                skus={filteredSkus}
                currentRegion={currentRegion}
                onToggleVisibility={handleToggleVisibility}
                onEditSKU={setSelectedSKU}
                isLoading={isLoading}
            />
          </div>
      </div>

      {/* Drawers & Modals */}
      <CollectionDrawer 
        collection={selectedCollection}
        isOpen={!!selectedCollection}
        onClose={() => setSelectedCollection(null)}
        onEdit={(col) => {
            setEditingCollection(col);
            setIsCreateCollectionOpen(true);
            setSelectedCollection(null);
        }}
        onDuplicate={handleDuplicateCollection}
        onArchive={handleArchiveCollection}
      />

      <SKUEditDrawer 
        sku={selectedSKU}
        isOpen={!!selectedSKU}
        onClose={() => setSelectedSKU(null)}
        onSave={async (updatedSku) => {
            try {
              const response = await catalogApi.updateSKU(updatedSku.id, {
                code: updatedSku.code,
                name: updatedSku.name,
                category: updatedSku.category,
                price: updatedSku.price,
                stock: updatedSku.stock,
                visibility: updatedSku.visibility,
              });
              if (response.success) {
                toast.success("SKU updated successfully");
                await loadData();
                setSelectedSKU(null);
              } else {
                toast.error("Failed to update SKU");
              }
            } catch (error) {
              console.error('Error updating SKU:', error);
              toast.error("Failed to update SKU");
            }
        }}
      />

      <CreateCollectionModal 
        isOpen={isCreateCollectionOpen}
        onClose={() => {
            setIsCreateCollectionOpen(false);
            setEditingCollection(null);
        }}
        onSubmit={handleCreateCollection}
        initialData={editingCollection}
      />

      <AddSKUModal 
        isOpen={isAddSKUOpen}
        onClose={() => setIsAddSKUOpen(false)}
        onSubmit={handleAddSKU}
      />

      <CollectionsListModal 
        isOpen={isCollectionsListOpen}
        onClose={() => setIsCollectionsListOpen(false)}
        collections={collections}
        onSelectCollection={(col) => {
            setSelectedCollection(col);
            setIsCollectionsListOpen(false);
        }}
        onEdit={(col) => {
            setEditingCollection(col);
            setIsCreateCollectionOpen(true);
            setIsCollectionsListOpen(false);
        }}
        onDuplicate={handleDuplicateCollection}
        onArchive={handleArchiveCollection}
      />
    </div>
  );
}
