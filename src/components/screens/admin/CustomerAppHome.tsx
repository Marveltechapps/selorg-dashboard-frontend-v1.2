import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  fetchBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  fetchSectionDefinitions,
  createSectionDefinition,
  updateSectionDefinition,
  deleteSectionDefinition,
  reorderSectionDefinitions,
  fetchCollectionsForHome,
  fetchLifestyle,
  createLifestyle,
  updateLifestyle,
  deleteLifestyle,
  fetchPromoBlocks,
  createPromoBlock,
  updatePromoBlock,
  deletePromoBlock,
  fetchSections,
  createSection,
  updateSection,
  deleteSection,
  patchSectionProducts,
  type Banner,
  type HomeSectionDefinitionItem,
  type LifestyleItem,
  type PromoBlock,
  type HomeSection,
} from '@/api/customerAppAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Smartphone } from 'lucide-react';
import { SortableList } from '@/components/ui/sortable-list';
import { ProductPicker } from './ProductPicker';
import { CategoryPicker } from './CategoryPicker';
import type { BannerContentItem } from '@/api/customerAppAdminApi';

export type ResourceTab = 'banners' | 'sectionlist' | 'lifestyle' | 'promoblocks' | 'sections';

const TAB_HINTS: Record<ResourceTab, string> = {
  sectionlist: 'Drag to reorder. Section list order is replicated in the customer app home.',
  banners: 'Create banners (image URL, link). Upload elsewhere, paste URL. Supports Main and Sub banner sizes.',
  lifestyle: 'Lifestyle blocks for home screen (image, title, link).',
  promoblocks: 'Promo blocks (greens_banner, section_image, fullwidth_image).',
  sections: 'Home sections with product lists. Map section keys to products.',
};

export interface CustomerAppHomeProps {
  /** Called after data is loaded or after any save/delete so preview can refresh */
  onDataChange?: () => void;
  /** When true, do not render the page title (e.g. when embedded in combined preview+edit page) */
  hideTitle?: boolean;
  /** Controlled tab (use with setActiveTab for "Edit" from preview) */
  activeTab?: ResourceTab;
  setActiveTab?: (tab: ResourceTab) => void;
  /** Callback to navigate to App CMS preview (when embedded in Admin dashboard) */
  onPreview?: () => void;
}

export function CustomerAppHome({ onDataChange, hideTitle, activeTab: controlledTab, setActiveTab: setControlledTab, onPreview }: CustomerAppHomeProps = {}) {
  const [internalTab, setInternalTab] = useState<ResourceTab>('sectionlist');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = setControlledTab ?? setInternalTab;
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sectionDefinitionsList, setSectionDefinitionsList] = useState<HomeSectionDefinitionItem[]>([]);
  const [collections, setCollections] = useState<{ _id: string; name: string; slug: string }[]>([]);
  const [lifestyle, setLifestyle] = useState<LifestyleItem[]>([]);
  const [promoBlocks, setPromoBlocks] = useState<PromoBlock[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [savingSectionOrder, setSavingSectionOrder] = useState(false);

  const loadBanners = useCallback(async () => {
    try {
      const data = await fetchBanners();
      setBanners(data);
    } catch (e) {
      toast.error('Failed to load banners');
      setBanners([]);
    }
  }, []);
  const loadSectionDefinitions = useCallback(async () => {
    try {
      const data = await fetchSectionDefinitions();
      setSectionDefinitionsList(data);
    } catch (e) {
      toast.error('Failed to load section list');
      setSectionDefinitionsList([]);
    }
  }, []);
  const loadCollections = useCallback(async () => {
    try {
      const data = await fetchCollectionsForHome();
      setCollections(data);
    } catch {
      setCollections([]);
    }
  }, []);
  const loadLifestyle = useCallback(async () => {
    try {
      const data = await fetchLifestyle();
      setLifestyle(data);
    } catch {
      setLifestyle([]);
    }
  }, []);
  const loadPromoBlocks = useCallback(async () => {
    try {
      const data = await fetchPromoBlocks();
      setPromoBlocks(data);
    } catch {
      setPromoBlocks([]);
    }
  }, []);
  const loadSections = useCallback(async () => {
    try {
      const data = await fetchSections();
      setSections(data);
    } catch {
      setSections([]);
    }
  }, []);

  const loadAll = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      await Promise.all([
        loadBanners(),
        loadSectionDefinitions(),
        loadCollections(),
        loadLifestyle(),
        loadPromoBlocks(),
        loadSections(),
      ]);
      onDataChange?.();
      if (showToast) toast.success('Data refreshed');
    } catch {
      if (showToast) toast.error('Failed to refresh data');
      else toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadBanners, loadSectionDefinitions, loadCollections, loadLifestyle, loadPromoBlocks, loadSections, onDataChange]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openAdd = (tab: ResourceTab) => {
    setActiveTab(tab);
    setEditingId(null);
    setFormData({});
    setDialogOpen(true);
  };
  const openEdit = (tab: ResourceTab, item: Record<string, unknown>) => {
    setActiveTab(tab);
    setEditingId((item._id as string) ?? null);
    setFormData({ ...item });
    setDialogOpen(true);
  };
  const handleDelete = async (tab: ResourceTab, id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      if (tab === 'banners') await deleteBanner(id);
      else if (tab === 'sectionlist') await deleteSectionDefinition(id);
      else if (tab === 'lifestyle') await deleteLifestyle(id);
      else if (tab === 'promoblocks') await deletePromoBlock(id);
      else if (tab === 'sections') await deleteSection(id);
      toast.success('Deleted');
      if (tab === 'banners') loadBanners();
      else if (tab === 'sectionlist') loadSectionDefinitions();
      else if (tab === 'lifestyle') loadLifestyle();
      else if (tab === 'promoblocks') loadPromoBlocks();
      else if (tab === 'sections') loadSections();
      onDataChange?.();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };
  const saveForm = async () => {
    setFormLoading(true);
    try {
      if (activeTab === 'banners') {
        const payload = { ...formData } as Partial<Banner>;
        if (editingId) {
          if (payload.redirectType === 'banner') payload.redirectValue = editingId;
          await updateBanner(editingId, payload);
        } else {
          const created = await createBanner(payload);
          if (payload.redirectType === 'banner' && created?._id) {
            await updateBanner(created._id, { ...payload, redirectValue: created._id });
          }
        }
        loadBanners();
      } else if (activeTab === 'sectionlist') {
        const payload = {
          label: formData.label as string,
          order: editingId ? (formData.order as number) ?? 0 : sectionDefinitionsList.length,
          collectionId: formData.collectionId as string | undefined,
          taglineText: formData.taglineText as string | undefined,
          categoryIds: formData.categoryIds as string[] | undefined,
          bannerId: formData.bannerId as string | undefined,
        };
        if (editingId) {
          await updateSectionDefinition(editingId, payload);
        } else {
          const type = formData.type as string;
          if (type === 'collections' && !payload.collectionId) {
            toast.error('Select a collection for Collections type');
            return;
          }
          if ((type === 'banner_main' || type === 'banner_sub') && !payload.bannerId) {
            toast.error('Select a banner for Banner type');
            return;
          }
          await createSectionDefinition({
            type,
            ...payload,
          });
        }
        loadSectionDefinitions();
      } else if (activeTab === 'lifestyle') {
        const payload = {
          name: formData.name as string,
          title: formData.title as string,
          imageUrl: formData.imageUrl as string,
          link: formData.link as string,
          redirectType: (formData.redirectType as string) || null,
          redirectValue: (formData.redirectValue as string) || null,
          blockKey: formData.blockKey as string,
          order: (formData.order as number) ?? 0,
          isActive: formData.isActive !== false,
        };
        if (editingId) await updateLifestyle(editingId, payload);
        else await createLifestyle(payload);
        loadLifestyle();
      } else if (activeTab === 'promoblocks') {
        const payload = {
          blockKey: formData.blockKey as string,
          type: (formData.type as PromoBlock['type']) ?? 'section_image',
          imageUrl: formData.imageUrl as string,
          link: formData.link as string,
          redirectType: (formData.redirectType as string) || null,
          redirectValue: (formData.redirectValue as string) || null,
          order: (formData.order as number) ?? 0,
          isActive: formData.isActive !== false,
        };
        if (editingId) await updatePromoBlock(editingId, payload);
        else await createPromoBlock(payload);
        loadPromoBlocks();
      } else if (activeTab === 'sections') {
        const payload = {
          sectionKey: formData.sectionKey as string,
          title: formData.title as string,
          productIds: (formData.productIds as string[]) ?? [],
          order: (formData.order as number) ?? 0,
          isActive: formData.isActive !== false,
        };
        if (editingId) {
          await updateSection(editingId, { title: payload.title, order: payload.order, isActive: payload.isActive });
          await patchSectionProducts(editingId, payload.productIds);
        } else await createSection(payload);
        loadSections();
      }
      toast.success(editingId ? 'Updated' : 'Created');
      setDialogOpen(false);
      onDataChange?.();
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {!hideTitle && (
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#18181b] truncate">Customer App Home</h1>
          <p className="text-sm text-[#71717a] mt-1 break-words">
            Section list order is replicated in the customer app. Drag to reorder.
          </p>
        </div>
      )}

      {/* 4 info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">Section definitions</p>
          <p className="text-2xl font-bold text-[#18181b] mt-1">{sectionDefinitionsList.length}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">Banners</p>
          <p className="text-2xl font-bold text-[#18181b] mt-1">{banners.length}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">Lifestyle</p>
          <p className="text-2xl font-bold text-[#18181b] mt-1">{lifestyle.length}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">Promo blocks</p>
          <p className="text-2xl font-bold text-[#18181b] mt-1">{promoBlocks.length}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceTab)} className="w-full min-w-0 max-w-full">
        <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 bg-[#fcfcfc] border-b border-[#e4e4e7] mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <TabsList className="flex flex-wrap gap-1 bg-[#f4f4f5] p-1 rounded-lg flex-1 min-w-0">
            <TabsTrigger value="sectionlist">Section list</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
            <TabsTrigger value="promoblocks">Promo blocks</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            </TabsList>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => loadAll(true)}
                disabled={loading}
                title="Refresh data"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              {onPreview && (
                <Button variant="ghost" size="sm" onClick={onPreview} className="h-8" title="Preview in App CMS">
                  <Smartphone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-[#71717a] mt-1 px-0.5">{TAB_HINTS[activeTab]}</p>
        </div>

        <TabsContent value="banners" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ slot: 'hero', imageUrl: '', link: '', title: '', order: 0, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Banner
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b) => (
                <TableRow key={b._id}>
                  <TableCell>{b.slot}</TableCell>
                  <TableCell>{b.title || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.imageUrl}</TableCell>
                  <TableCell>{b.order ?? 0}</TableCell>
                  <TableCell className="text-xs text-[#71717a]">
                    {b.startDate || b.endDate
                      ? `${b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'} to ${b.endDate ? new Date(b.endDate).toLocaleDateString() : '—'}`
                      : 'Always'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('banners', b as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('banners', b._id, b.title || b._id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="sectionlist" className="mt-4">
          <p className="text-sm text-[#71717a] mb-4">
            Drag to reorder. Section list order is replicated in the customer app home.
          </p>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setFormData({ type: '', label: '', collectionId: '', taglineText: '', categoryIds: [], bannerId: '' });
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add section
            </Button>
          </div>
          <SortableList
            items={sectionDefinitionsList}
            keyFn={(item) => item._id}
            renderItem={(item) => (
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="font-mono text-sm text-[#71717a] shrink-0">{item.key}</span>
                <span className="font-medium text-[#18181b] flex-1 min-w-0 truncate">{item.label || item.key}</span>
                <span className="text-sm text-[#71717a] shrink-0">{item.type || '-'}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit('sectionlist', item as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete('sectionlist', item._id, item.label || item.key)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            onReorder={async (reordered) => {
              const ids = reordered.map((d) => d._id);
              setSavingSectionOrder(true);
              try {
                await reorderSectionDefinitions(ids);
                await loadSectionDefinitions();
                toast.success('Order saved');
                onDataChange?.();
              } catch {
                toast.error('Failed to save order');
              } finally {
                setSavingSectionOrder(false);
              }
            }}
          />
          {sectionDefinitionsList.length === 0 && (
            <p className="text-sm text-[#71717a] py-4">No sections yet. Click Add to create (first load may auto-seed defaults).</p>
          )}
        </TabsContent>

        <TabsContent value="lifestyle" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ name: '', title: '', imageUrl: '', link: '', order: lifestyle.length, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Lifestyle
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lifestyle.map((l) => (
                <TableRow key={l._id}>
                  <TableCell>{l.name || l.title || '-'}</TableCell>
                  <TableCell>{l.title || '-'}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{l.imageUrl || '-'}</TableCell>
                  <TableCell>{l.order ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('lifestyle', l as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('lifestyle', l._id, l.name || l.title || l._id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="promoblocks" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ blockKey: '', type: 'section_image', imageUrl: '', link: '', order: promoBlocks.length, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Promo block
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoBlocks.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-mono text-sm">{p.blockKey}</TableCell>
                  <TableCell>{p.type || 'section_image'}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{p.imageUrl || '-'}</TableCell>
                  <TableCell>{p.order ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('promoblocks', p as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('promoblocks', p._id, p.blockKey)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ sectionKey: '', title: '', productIds: [], order: sections.length, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-mono text-sm">{s.sectionKey}</TableCell>
                  <TableCell>{s.title || '-'}</TableCell>
                  <TableCell>{(s.productIds?.length ?? 0)}</TableCell>
                  <TableCell>{s.order ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('sections', s as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('sections', s._id, s.sectionKey)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

      </Tabs>

      {/* Generic add/edit dialog for list resources */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit' : 'Add'}{' '}
              {activeTab === 'sectionlist' ? 'section' : activeTab === 'lifestyle' ? 'lifestyle' : activeTab === 'promoblocks' ? 'promo block' : activeTab === 'sections' ? 'section' : 'banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTab === 'sectionlist' && (
              <>
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">Type</label>
                  {editingId ? (
                    <p className="text-sm text-[#71717a]">{(formData.type as string) || (formData.key as string) || '-'}</p>
                  ) : (
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value={(formData.type as string) ?? ''}
                      onChange={(e) => {
                        const type = e.target.value;
                        const label = type ? type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                        setFormData({
                          ...formData,
                          type,
                          label: formData.label || label,
                          collectionId: type === 'collections' ? formData.collectionId : undefined,
                          taglineText: type === 'tagline' ? formData.taglineText : undefined,
                          categoryIds: (type === 'super_category' || type === 'lifestyle') ? formData.categoryIds : undefined,
                          bannerId: (type === 'banner_main' || type === 'banner_sub') ? formData.bannerId : undefined,
                        });
                      }}
                    >
                      <option value="">Select type</option>
                      <option value="super_category">Super Category</option>
                      <option value="banner_main">Banner (Main)</option>
                      <option value="banner_sub">Banner (Sub)</option>
                      <option value="collections">Collections</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="tagline">Tagline</option>
                    </select>
                  )}
                </div>
                {(formData.type as string) === 'tagline' && (
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Tagline text</label>
                    <Input
                      placeholder="e.g. Fresh from farm to table"
                      value={(formData.taglineText as string) ?? ''}
                      onChange={(e) => setFormData({ ...formData, taglineText: e.target.value })}
                    />
                  </div>
                )}
                {((formData.type as string) === 'super_category') && (
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Categories</label>
                    <CategoryPicker
                      selectedIds={(formData.categoryIds as string[]) ?? []}
                      onChange={(ids) => setFormData({ ...formData, categoryIds: ids })}
                    />
                  </div>
                )}
                {((formData.type as string) === 'banner_main' || (formData.type as string) === 'banner_sub') && (
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Banner</label>
                    <p className="text-xs text-[#71717a] mb-1">Choose which banner to show. Banner content (images, videos, products) is set in the Banners tab.</p>
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value={(formData.bannerId as string) ?? ''}
                      onChange={(e) => {
                        const id = e.target.value || undefined;
                        const b = banners.find((x) => x._id === id);
                        setFormData({ ...formData, bannerId: id, label: b?.title || formData.label });
                      }}
                    >
                      <option value="">Select banner</option>
                      {banners.map((b) => (
                        <option key={b._id} value={b._id}>{b.title || b.slot || b._id}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(formData.type as string) === 'collections' && (
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Collection *</label>
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value={(formData.collectionId as string) ?? ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const label = collections.find((c) => c._id === id)?.name;
                        setFormData({ ...formData, collectionId: id || undefined, label: label || formData.label });
                      }}
                    >
                      <option value="">Select collection</option>
                      {collections.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(formData.type as string) === 'lifestyle' && (
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Categories</label>
                    <CategoryPicker
                      selectedIds={(formData.categoryIds as string[]) ?? []}
                      onChange={(ids) => setFormData({ ...formData, categoryIds: ids })}
                    />
                  </div>
                )}
                <Input placeholder="Label (display name)" value={(formData.label as string) ?? ''} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
                {editingId && (
                  <p className="text-xs text-[#71717a]">Key: {(formData.key as string) ?? ''}</p>
                )}
              </>
            )}
            {activeTab === 'banners' && (
              <>
                <p className="text-xs text-[#71717a]">Image URL: upload elsewhere, paste URL. On tap: set Redirect, Link, or Landing page.</p>
                <Input placeholder="Slot (hero | mid | category)" value={(formData.slot as string) ?? ''} onChange={(e) => setFormData({ ...formData, slot: e.target.value })} />
                <Input placeholder="Image URL *" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <Input placeholder="Title" value={(formData.title as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">On tap – redirect (typed)</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background mb-2"
                    value={(formData.redirectType as string) ?? ''}
                    onChange={(e) => {
                      const v = e.target.value || null;
                      setFormData({ ...formData, redirectType: v, redirectValue: v === 'banner' && editingId ? editingId : formData.redirectValue });
                    }}
                  >
                    <option value="">— Use link below —</option>
                    <option value="banner">Landing page (content below)</option>
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                    <option value="collection">Collection</option>
                    <option value="page">Page</option>
                    <option value="url">URL</option>
                    <option value="screen">Screen</option>
                  </select>
                  {(formData.redirectType as string) !== 'banner' && (
                    <Input placeholder="Redirect value (ID, URL, or screen param)" value={(formData.redirectValue as string) ?? ''} onChange={(e) => setFormData({ ...formData, redirectValue: e.target.value || null })} />
                  )}
                  {(formData.redirectType as string) === 'banner' && (
                    <p className="text-xs text-[#71717a]">Tapping shows a landing page with the content items below.</p>
                  )}
                </div>
                {(formData.redirectType as string) === 'banner' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#18181b] block">Content items (arrangeable)</label>
                    <p className="text-xs text-[#71717a]">Add banner, video, image, text, or products. Order shown on tap.</p>
                    <SortableList
                      items={((formData.contentItems as BannerContentItem[]) ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))}
                      keyFn={(item, i) => item._id ?? `ci-${i}`}
                      renderItem={(item, i) => (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{item.type}</span>
                          {item.type === 'image' && item.imageUrl && <span className="truncate max-w-[120px] text-[#71717a]">{item.imageUrl}</span>}
                          {item.type === 'video' && item.videoUrl && <span className="truncate max-w-[120px] text-[#71717a]">{item.videoUrl}</span>}
                          {item.type === 'text' && item.text && <span className="truncate max-w-[120px] text-[#71717a]">{item.text}</span>}
                          {item.type === 'products' && Array.isArray(item.productIds) && <span className="text-[#71717a]">{item.productIds.length} products</span>}
                        </div>
                      )}
                      onReorder={(reordered) => setFormData({ ...formData, contentItems: reordered.map((it, idx) => ({ ...it, order: idx })) })}
                    />
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value=""
                      onChange={(e) => {
                        const type = e.target.value as BannerContentItem['type'];
                        if (!type) return;
                        const items = ((formData.contentItems as BannerContentItem[]) ?? []);
                        setFormData({ ...formData, contentItems: [...items, { type, order: items.length }] });
                        e.target.value = '';
                      }}
                    >
                      <option value="">Add item…</option>
                      <option value="banner">Banner image</option>
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                      <option value="text">Text</option>
                      <option value="products">Products</option>
                    </select>
                    {((formData.contentItems as BannerContentItem[]) ?? []).map((item, idx) => (
                      <div key={item._id ?? idx} className="border rounded p-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-sm">{item.type}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => setFormData({ ...formData, contentItems: ((formData.contentItems as BannerContentItem[]) ?? []).filter((_, i) => i !== idx) })}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                        {item.type === 'banner' && <Input placeholder="Image URL" value={item.imageUrl ?? ''} onChange={(e) => { const next = [...((formData.contentItems as BannerContentItem[]) ?? [])]; next[idx] = { ...next[idx], imageUrl: e.target.value }; setFormData({ ...formData, contentItems: next }); }} />}
                        {item.type === 'video' && <Input placeholder="Video URL" value={item.videoUrl ?? ''} onChange={(e) => { const next = [...((formData.contentItems as BannerContentItem[]) ?? [])]; next[idx] = { ...next[idx], videoUrl: e.target.value }; setFormData({ ...formData, contentItems: next }); }} />}
                        {item.type === 'image' && <Input placeholder="Image URL" value={item.imageUrl ?? ''} onChange={(e) => { const next = [...((formData.contentItems as BannerContentItem[]) ?? [])]; next[idx] = { ...next[idx], imageUrl: e.target.value }; setFormData({ ...formData, contentItems: next }); }} />}
                        {item.type === 'text' && <Input placeholder="Text" value={item.text ?? ''} onChange={(e) => { const next = [...((formData.contentItems as BannerContentItem[]) ?? [])]; next[idx] = { ...next[idx], text: e.target.value }; setFormData({ ...formData, contentItems: next }); }} />}
                        {item.type === 'products' && <ProductPicker selectedIds={item.productIds ?? []} onChange={(ids) => { const next = [...((formData.contentItems as BannerContentItem[]) ?? [])]; next[idx] = { ...next[idx], productIds: ids }; setFormData({ ...formData, contentItems: next }); }} />}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">On tap – link (legacy)</label>
                  <Input placeholder="product:ID | category:ID | https://... | ScreenName:param=val" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                  <p className="text-xs text-[#71717a] mt-1">Used when redirect type is empty.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">Start Date (optional)</label>
                    <Input
                      type="date"
                      value={(formData.startDate as string) ? new Date(formData.startDate as string).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#18181b] mb-1 block">End Date (optional)</label>
                    <Input
                      type="date"
                      value={(formData.endDate as string) ? new Date(formData.endDate as string).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'lifestyle' && (
              <>
                <Input placeholder="Name *" value={(formData.name as string) ?? ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <Input placeholder="Title" value={(formData.title as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <Input placeholder="Image URL" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <Input placeholder="Link" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                <Input placeholder="Block key (optional)" value={(formData.blockKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, blockKey: e.target.value })} />
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'promoblocks' && (
              <>
                <Input placeholder="Block key *" value={(formData.blockKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, blockKey: e.target.value })} disabled={!!editingId} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">Type</label>
                  <select
                    className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                    value={(formData.type as string) ?? 'section_image'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PromoBlock['type'] })}
                  >
                    <option value="greens_banner">Greens banner</option>
                    <option value="section_image">Section image</option>
                    <option value="fullwidth_image">Fullwidth image</option>
                  </select>
                </div>
                <Input placeholder="Image URL *" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <Input placeholder="Link" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'sections' && (
              <>
                <Input placeholder="Section key * (e.g. deals, wellbeing)" value={(formData.sectionKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })} disabled={!!editingId} />
                <Input placeholder="Title" value={(formData.title as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">Products</label>
                  <ProductPicker selectedIds={(formData.productIds as string[]) ?? []} onChange={(ids) => setFormData({ ...formData, productIds: ids })} />
                </div>
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {!(activeTab === 'sectionlist' && !editingId && (!formData.type || ((formData.type as string) === 'collections' && !formData.collectionId))) &&
             !(activeTab === 'lifestyle' && !editingId && !(formData.name as string)?.trim()) &&
             !(activeTab === 'promoblocks' && !editingId && (!(formData.blockKey as string)?.trim() || !(formData.imageUrl as string)?.trim())) &&
             !(activeTab === 'sections' && !editingId && !(formData.sectionKey as string)?.trim()) && (
              <Button onClick={saveForm} disabled={formLoading}>{formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
