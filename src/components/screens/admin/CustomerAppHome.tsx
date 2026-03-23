import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { BannerContentItem, BannerLeafContentItem } from '@/api/customerAppAdminApi';
import { useAdminDashboardRefresh } from '@/contexts/AdminDashboardContext';

export type ResourceTab = 'banners' | 'sectionlist' | 'lifestyle' | 'promoblocks' | 'sections';

/** Normalize section form when editing banner rows from API (bannerIds or legacy bannerId). */
function normalizeBannerIdsFromFormItem(item: Record<string, unknown>): string[] {
  const raw = item.bannerIds as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => String((x as { _id?: string })?._id ?? x));
  }
  const bid = item.bannerId as string | undefined;
  return bid ? [bid] : [''];
}

function isLegacyBannerSectionType(t: string | undefined) {
  return t === 'banner_main' || t === 'banner_sub';
}
function isBannerSectionType(t: string | undefined) {
  return t === 'banner' || isLegacyBannerSectionType(t);
}
function formatSectionListTypeLabel(t: string | undefined) {
  if (t === 'banner' || t === 'banner_main' || t === 'banner_sub') return 'Banner';
  if (t === 'super_category') return 'Super Category';
  if (t === 'collections') return 'Collections';
  if (t === 'lifestyle') return 'Lifestyle';
  if (t === 'tagline') return 'Tagline';
  return t || '—';
}

/** Stored banner `slot` (API) → display label for admin tables */
function formatBannerTypeLabel(slot: string | undefined) {
  const s = String(slot || '').toLowerCase();
  const labels: Record<string, string> = {
    hero: 'Hero',
    small: 'Small',
    mid: 'Mid',
    large: 'Large',
    info: 'Info',
    category: 'Category',
  };
  return labels[s] || slot || '—';
}

function normalizeBannerSlot(raw: unknown): 'hero' | 'small' | 'mid' | 'large' | 'info' | 'category' {
  const allowed = ['hero', 'small', 'mid', 'large', 'info', 'category'] as const;
  const s = String(raw ?? 'hero')
    .trim()
    .toLowerCase();
  return (allowed.includes(s as (typeof allowed)[number]) ? s : 'hero') as (typeof allowed)[number];
}

function normalizeBannerLeafItem(it: BannerContentItem, idx: number): BannerContentItem {
  const oid = /^[a-f0-9]{24}$/i;
  const base: BannerContentItem = { type: it.type, order: idx };
  if (it._id) base._id = it._id;
  switch (it.type) {
    case 'products':
      base.productIds = (it.productIds ?? []).filter((id) => id && oid.test(String(id)));
      break;
    case 'banner':
    case 'image':
      base.imageUrl = it.imageUrl?.trim() || undefined;
      if (it.link?.trim()) base.link = it.link.trim();
      if (it.isNavigable === false) base.isNavigable = false;
      break;
    case 'video':
      base.videoUrl = it.videoUrl?.trim() || undefined;
      break;
    case 'text':
      base.text = it.text ?? '';
      break;
    default:
      break;
  }
  return base;
}

function normalizeBannerTopItem(it: BannerContentItem, idx: number): BannerContentItem {
  const base = normalizeBannerLeafItem(it, idx);
  if (it.type === 'banner' || it.type === 'image') {
    if (it.blockTitle?.trim()) base.blockTitle = it.blockTitle.trim();
    if (Array.isArray(it.nestedContentItems)) {
      base.nestedContentItems =
        it.nestedContentItems.length > 0
          ? it.nestedContentItems.map((n, i) => normalizeBannerLeafItem(n as BannerContentItem, i))
          : [];
    }
  }
  return base;
}

const TAB_HINTS: Record<ResourceTab, string> = {
  sectionlist:
    'Drag to reorder. Add Banner = pick one saved banner. Placement (Hero / Small / Mid / …) is set per banner in the Banners tab (type + lane).',
  banners:
    'Create in 3 steps: banner type → single vs carousel → image + landing page. Hero / Large / Info use the top lane; Small / Mid / Category use in-feed — app block heights are unchanged.',
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
  /** Banners tab: 1 = type, 2 = single/carousel, 3 = content */
  const [bannerFormStep, setBannerFormStep] = useState<1 | 2 | 3>(1);
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

  const { bumpDashboardData } = useAdminDashboardRefresh();
  const refreshAllData = useCallback(async () => {
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
    } catch {
      toast.error('Failed to refresh data');
    }
  }, [loadBanners, loadSectionDefinitions, loadCollections, loadLifestyle, loadPromoBlocks, loadSections, onDataChange]);

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
    if (tab === 'banners') {
      setBannerFormStep(3);
    }
    setEditingId((item._id as string) ?? null);
    const t = item.type as string;
    if (tab === 'sectionlist' && isBannerSectionType(t)) {
      let bannerIds = normalizeBannerIdsFromFormItem(item);
      const bannerSelectionMode =
        (item.bannerSelectionMode as string) === 'multiple' || bannerIds.filter(Boolean).length > 1
          ? 'multiple'
          : 'single';
      if (t === 'banner') {
        const filled = bannerIds.filter(Boolean);
        bannerIds = [filled[0] ?? ''];
        setFormData({ ...item, bannerIds, bannerSelectionMode: 'single' });
      } else if (bannerSelectionMode === 'multiple') {
        const filled = bannerIds.filter(Boolean);
        bannerIds = filled.length >= 2 ? filled : filled.length === 1 ? [...filled, ''] : ['', ''];
        setFormData({ ...item, bannerIds, bannerSelectionMode });
      } else {
        bannerIds = [bannerIds.filter(Boolean)[0] ?? ''];
        setFormData({ ...item, bannerIds, bannerSelectionMode });
      }
    } else {
      setFormData({ ...item });
    }
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
      await refreshAllData();
      bumpDashboardData();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };
  const saveForm = async () => {
    setFormLoading(true);
    try {
      if (activeTab === 'banners') {
        const raw = { ...formData } as Partial<Banner>;
        const imageUrl = String(raw.imageUrl ?? '').trim();
        if (!imageUrl) {
          toast.error('Hero image URL is required');
          return;
        }
        const slot = normalizeBannerSlot(raw.slot);
        const pmRaw = String(raw.presentationMode ?? 'single').toLowerCase();
        const presentationMode = pmRaw === 'carousel' ? 'carousel' : 'single';
        const items = (raw.contentItems as BannerContentItem[]) ?? [];
        const normalizedItems = items.map((it, idx) => normalizeBannerTopItem(it, idx));
        // Do not spread raw: avoid _id/createdAt on create, and never send link/startDate/endDate as null (Mongoose rejects null for String paths).
        const payload: Partial<Banner> = {
          slot,
          presentationMode,
          isNavigable: raw.isNavigable !== false,
          title: String(raw.title ?? '').trim() || undefined,
          imageUrl,
          order: Number(raw.order) || 0,
          isActive: raw.isActive !== false,
          redirectType: 'banner',
          contentItems: normalizedItems,
        };
        if (editingId) {
          payload.redirectValue = editingId;
          await updateBanner(editingId, payload);
        } else {
          const created = await createBanner(payload);
          if (created?._id) {
            await updateBanner(created._id, { ...payload, redirectValue: created._id });
          }
        }
      } else if (activeTab === 'sectionlist') {
        const sectionType = (formData.type as string) || '';
        const oid = /^[a-f0-9]{24}$/i;
        const payload: {
          label: string;
          order: number;
          collectionId?: string;
          taglineText?: string;
          categoryIds?: string[];
          bannerId?: string;
          bannerIds?: string[];
          bannerSelectionMode?: 'single' | 'multiple';
          useCarousel?: boolean;
        } = {
          label: formData.label as string,
          order: editingId ? (formData.order as number) ?? 0 : sectionDefinitionsList.length,
          collectionId: formData.collectionId as string | undefined,
          taglineText: formData.taglineText as string | undefined,
          categoryIds: formData.categoryIds as string[] | undefined,
        };
        if (sectionType === 'banner') {
          const rawRows = (formData.bannerIds as string[]) ?? [''];
          const bannerIds = rawRows.map((id) => String(id).trim()).filter((id) => oid.test(id));
          if (bannerIds.length < 1) {
            toast.error('Select a banner');
            return;
          }
          payload.bannerIds = [bannerIds[0]];
          payload.bannerId = bannerIds[0];
          payload.bannerSelectionMode = 'single';
          payload.useCarousel = false;
        } else if (sectionType === 'banner_main' || sectionType === 'banner_sub') {
          const bannerSelectionMode =
            (formData.bannerSelectionMode as string) === 'multiple' ? 'multiple' : 'single';
          const rawRows = (formData.bannerIds as string[]) ?? [''];
          let bannerIds = rawRows.map((id) => String(id).trim()).filter((id) => oid.test(id));
          if (bannerSelectionMode === 'single') {
            if (bannerIds.length < 1) {
              toast.error('Select a banner');
              return;
            }
            bannerIds = [bannerIds[0]];
          } else {
            if (bannerIds.length < 2) {
              toast.error('Multiple mode requires at least two banners');
              return;
            }
          }
          payload.bannerIds = bannerIds;
          payload.bannerId = bannerIds[0];
          payload.bannerSelectionMode = bannerSelectionMode;
          /** Single banner = static image; multiple = carousel (derived — no separate control). */
          payload.useCarousel = bannerIds.length > 1;
        }
        if (editingId) {
          await updateSectionDefinition(editingId, payload);
        } else {
          const type = formData.type as string;
          if (type === 'collections' && !payload.collectionId) {
            toast.error('Select a collection for Collections type');
            return;
          }
          if ((type === 'banner' || type === 'banner_main' || type === 'banner_sub') && (!payload.bannerIds || payload.bannerIds.length < 1)) {
            toast.error('Select at least one banner');
            return;
          }
          await createSectionDefinition({
            type,
            ...payload,
          });
        }
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
      }
      await refreshAllData();
      bumpDashboardData();
      toast.success(editingId ? 'Updated' : 'Created');
      setDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      toast.error(msg);
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
            <Button
              onClick={() => {
                setFormData({
                  slot: 'hero',
                  presentationMode: 'single',
                  isNavigable: true,
                  imageUrl: '',
                  title: '',
                  order: 0,
                  isActive: true,
                  redirectType: 'banner',
                  contentItems: [],
                });
                setEditingId(null);
                setBannerFormStep(1);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Banner
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b) => (
                <TableRow key={b._id}>
                  <TableCell>{formatBannerTypeLabel(b.slot)}</TableCell>
                  <TableCell>{b.title || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.imageUrl}</TableCell>
                  <TableCell>{b.order ?? 0}</TableCell>
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
                setFormData({
                  type: '',
                  label: '',
                  collectionId: '',
                  taglineText: '',
                  categoryIds: [],
                  bannerId: '',
                  bannerIds: [''],
                  bannerSelectionMode: 'single',
                });
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
              <div className="flex w-full min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-medium text-[#18181b] min-w-0 max-w-[12rem] truncate sm:max-w-xs" title={item.label || undefined}>
                      {item.label?.trim() ? item.label : '—'}
                    </span>
                    <span className="text-[#d4d4d8] shrink-0 select-none" aria-hidden>
                      ·
                    </span>
                    <span className="text-sm text-[#71717a] shrink-0">{formatSectionListTypeLabel(item.type)}</span>
                    {isBannerSectionType(item.type) && (
                      <>
                        <span className="text-[#d4d4d8] shrink-0 select-none" aria-hidden>
                          ·
                        </span>
                        <span className="text-xs text-[#71717a] shrink-0 whitespace-nowrap">
                          {Array.isArray(item.bannerIds) && item.bannerIds.length > 0
                            ? `${item.bannerIds.length} banner(s)`
                            : item.bannerId
                              ? '1 banner'
                              : '—'}
                        </span>
                        <span className="text-[#d4d4d8] shrink-0 select-none" aria-hidden>
                          ·
                        </span>
                        <span className="text-xs text-[#71717a] shrink-0 whitespace-nowrap" title="Derived from banner count">
                          {Array.isArray(item.bannerIds) && item.bannerIds.length > 1 ? 'Carousel' : 'Static'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 border-l border-[#e4e4e7] pl-3">
                  <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={() => openEdit('sectionlist', item as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-red-600" onClick={() => handleDelete('sectionlist', item._id, item.label || item.key)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            onReorder={async (reordered) => {
              const ids = reordered.map((d) => d._id);
              setSavingSectionOrder(true);
              try {
                await reorderSectionDefinitions(ids);
                await refreshAllData();
                bumpDashboardData();
                toast.success('Order saved');
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
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setBannerFormStep(1);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                    <div>
                      <p className="text-sm text-[#71717a]">{formatSectionListTypeLabel(formData.type as string)}</p>
                      {isLegacyBannerSectionType(formData.type as string) && (
                        <p className="text-xs text-[#71717a] mt-1">
                          Legacy type <code className="text-[11px] bg-[#f4f4f5] px-1 rounded">{String(formData.type)}</code>
                          — multi-banner carousel is still supported here; new sections use <strong>Banner</strong> with one pick
                          + banner type in the Banners tab.
                        </p>
                      )}
                    </div>
                  ) : (
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value={(formData.type as string) ?? ''}
                      onChange={(e) => {
                        const type = e.target.value;
                        const label = type ? type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                        const isBannerSlot = type === 'banner';
                        setFormData({
                          ...formData,
                          type,
                          label: formData.label || label,
                          collectionId: type === 'collections' ? formData.collectionId : undefined,
                          taglineText: type === 'tagline' ? formData.taglineText : undefined,
                          categoryIds: (type === 'super_category' || type === 'lifestyle') ? formData.categoryIds : undefined,
                          ...(isBannerSlot
                            ? {
                                bannerIds: [''] as string[],
                                bannerSelectionMode: 'single',
                              }
                            : {
                                bannerId: undefined,
                                bannerIds: undefined,
                                bannerSelectionMode: undefined,
                              }),
                        });
                      }}
                    >
                      <option value="">Select type</option>
                      <option value="super_category">Super Category</option>
                      <option value="banner">Banner</option>
                      <option value="collections">Collections</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="tagline">Tagline</option>
                    </select>
                  )}
                </div>
                {(formData.type as string) === 'banner' && (
                  <div className="space-y-3 border border-[#e4e4e7] rounded-lg p-3 bg-[#fafafa]">
                    <div>
                      <label className="text-sm font-medium text-[#18181b] block">Banner</label>
                      <p className="text-xs text-[#71717a] mt-0.5">
                        Choose one banner from the list below. Whether it appears as the large hero or an in-feed banner is
                        controlled by the banner&apos;s <strong>type</strong> in the <strong>Banners</strong> tab (hero vs in-feed lane).
                      </p>
                    </div>
                    <div>
                      <select
                        className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                        value={(formData.bannerIds as string[])?.[0] ?? ''}
                        onChange={(e) => {
                          const id = e.target.value;
                          const b = banners.find((x) => x._id === id);
                          setFormData({
                            ...formData,
                            bannerIds: [id],
                            bannerId: id || undefined,
                            label: b?.title || formData.label,
                          });
                        }}
                      >
                        <option value="">Select banner</option>
                        {banners.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.title || b.slot || b._id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {isLegacyBannerSectionType(formData.type as string) && (
                  <div className="space-y-3 border border-[#e4e4e7] rounded-lg p-3 bg-[#fafafa]">
                    <div>
                      <label className="text-sm font-medium text-[#18181b] block">Banner selection (legacy)</label>
                      <p className="text-xs text-[#71717a] mt-0.5">
                        <strong>Single</strong> = one static banner. <strong>Multiple</strong> = carousel with two or more
                        banners in order. Content for each banner is set in the Banners tab.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="banner-selection-mode"
                          className="accent-[#034703]"
                          checked={(formData.bannerSelectionMode as string) !== 'multiple'}
                          onChange={() => {
                            const rows = (formData.bannerIds as string[]) ?? [''];
                            const first = rows.find((x) => String(x).trim()) ?? '';
                            setFormData({ ...formData, bannerSelectionMode: 'single', bannerIds: [first] });
                          }}
                        />
                        Single
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="banner-selection-mode"
                          className="accent-[#034703]"
                          checked={(formData.bannerSelectionMode as string) === 'multiple'}
                          onChange={() => {
                            const rows = (formData.bannerIds as string[]) ?? [''];
                            const filled = rows.filter((x) => String(x).trim());
                            const next =
                              filled.length >= 2
                                ? rows
                                : filled.length === 1
                                  ? [...filled, '']
                                  : ['', ''];
                            setFormData({ ...formData, bannerSelectionMode: 'multiple', bannerIds: next });
                          }}
                        />
                        Multiple
                      </label>
                    </div>
                    {(formData.bannerSelectionMode as string) === 'multiple' ? (
                      <div className="space-y-2">
                        {((formData.bannerIds as string[]) ?? ['', '']).map((bid, idx) => (
                          <div key={`banner-row-${idx}`} className="flex gap-2 items-center">
                            <span className="text-xs text-[#71717a] w-16 shrink-0">#{idx + 1}</span>
                            <select
                              className="flex-1 rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm min-w-0"
                              value={bid}
                              onChange={(e) => {
                                const id = e.target.value;
                                const next = [...((formData.bannerIds as string[]) ?? [])];
                                next[idx] = id;
                                const b = banners.find((x) => x._id === id);
                                setFormData({
                                  ...formData,
                                  bannerIds: next,
                                  bannerId: next.find((x) => x) || undefined,
                                  label: idx === 0 && b?.title ? b.title : formData.label,
                                });
                              }}
                            >
                              <option value="">Select banner</option>
                              {banners.map((b) => (
                                <option key={b._id} value={b._id}>
                                  {b.title || b.slot || b._id}
                                </option>
                              ))}
                            </select>
                            {((formData.bannerIds as string[]) ?? []).length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-red-600"
                                onClick={() => {
                                  const next = [...((formData.bannerIds as string[]) ?? [])];
                                  next.splice(idx, 1);
                                  setFormData({ ...formData, bannerIds: next.length >= 2 ? next : ['', ''] });
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              bannerIds: [...((formData.bannerIds as string[]) ?? ['', '']), ''],
                            })
                          }
                        >
                          + Add banner
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <select
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                          value={(formData.bannerIds as string[])?.[0] ?? ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            const b = banners.find((x) => x._id === id);
                            setFormData({
                              ...formData,
                              bannerIds: [id],
                              bannerId: id || undefined,
                              label: b?.title || formData.label,
                            });
                          }}
                        >
                          <option value="">Select banner</option>
                          {banners.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.title || b.slot || b._id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717a]">
                  <span>
                    Step {bannerFormStep} of 3:{' '}
                    {bannerFormStep === 1 ? 'Banner type' : bannerFormStep === 2 ? 'Single or carousel' : 'Content'}
                  </span>
                  {editingId && bannerFormStep === 3 && (
                    <button
                      type="button"
                      className="text-[#034703] underline font-medium"
                      onClick={() => setBannerFormStep(1)}
                    >
                      Edit type / presentation
                    </button>
                  )}
                </div>

                {bannerFormStep === 1 && (
                  <div className="rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[#18181b] block">1. Banner type</label>
                      <p className="text-xs text-[#71717a] mt-1">
                        Hero, Large, and Info use the <strong>top</strong> lane. Small, Mid, and Category use the{' '}
                        <strong>in-feed</strong> lane. Customer app block heights are unchanged.
                      </p>
                    </div>
                    <select
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                      value={normalizeBannerSlot(formData.slot)}
                      onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                    >
                      <option value="hero">Hero — top lane, full width</option>
                      <option value="large">Large — same top lane as Hero</option>
                      <option value="info">Info — same visual size as Large (top lane)</option>
                      <option value="small">Small — lowest in-feed height</option>
                      <option value="mid">Mid — in-feed banner row</option>
                      <option value="category">Category — category-area placements</option>
                    </select>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                      Asset guideline: Hero artwork should not exceed ~10% more height than Small; use the same on-device sizes as
                      the live app (no layout resize from this screen).
                    </p>
                  </div>
                )}

                {bannerFormStep === 2 && (
                  <div className="rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[#18181b] block">2. Single or carousel</label>
                      <p className="text-xs text-[#71717a] mt-1">
                        Swipe/dots also appear when multiple banners are selected in a Section list row. This field records intent
                        in the CMS.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="banner-presentation"
                          className="accent-[#034703]"
                          checked={(formData.presentationMode as string) !== 'carousel'}
                          onChange={() => setFormData({ ...formData, presentationMode: 'single' })}
                        />
                        Single
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="banner-presentation"
                          className="accent-[#034703]"
                          checked={(formData.presentationMode as string) === 'carousel'}
                          onChange={() => setFormData({ ...formData, presentationMode: 'carousel' })}
                        />
                        Carousel
                      </label>
                    </div>
                  </div>
                )}

                {bannerFormStep === 3 && (
                  <>
                    <div className="rounded-md border border-dashed border-[#e4e4e7] bg-white px-3 py-2 text-xs text-[#71717a]">
                      <strong className="text-[#18181b]">Summary:</strong> {formatBannerTypeLabel(String(formData.slot))} ·{' '}
                      {(formData.presentationMode as string) === 'carousel' ? 'Carousel' : 'Single'}
                    </div>
                    <p className="text-xs text-[#71717a]">
                      3. Paste an image URL (hosted elsewhere). When the home banner is tappable, customers see the landing page
                      from the blocks below — mix <strong>Products</strong>, <strong>Images</strong>, <strong>Videos</strong>, and{' '}
                      <strong>Text</strong> in any order (drag to reorder).
                    </p>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-[#034703]"
                        checked={formData.isNavigable !== false}
                        onChange={(e) => setFormData({ ...formData, isNavigable: e.target.checked })}
                      />
                      Home banner is tappable (opens landing page)
                    </label>
                    <Input
                      placeholder="Image URL *"
                      value={(formData.imageUrl as string) ?? ''}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                    <Input
                      placeholder="Banner name"
                      value={(formData.title as string) ?? ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#18181b] block">Landing page (on tap)</label>
                      <p className="text-xs text-[#71717a]">
                        Inline banner/image blocks: if <strong>tappable</strong>, either open an external link or a{' '}
                        <strong>sub-page</strong> with the same layout as this screen (hero image + blocks below). Add sub-page
                        blocks in the nested editor when not using only an external URL.
                      </p>
                      <SortableList
                        items={((formData.contentItems as BannerContentItem[]) ?? [])
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))}
                        keyFn={(item, i) => (item._id as string) ?? `ci-${i}`}
                        renderItem={(item, i) => (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium capitalize">{item.type}</span>
                            {item.type === 'image' && item.imageUrl && (
                              <span className="truncate max-w-[120px] text-[#71717a]">{item.imageUrl}</span>
                            )}
                            {item.type === 'banner' && item.imageUrl && (
                              <span className="truncate max-w-[120px] text-[#71717a]">{item.imageUrl}</span>
                            )}
                            {item.type === 'video' && item.videoUrl && (
                              <span className="truncate max-w-[120px] text-[#71717a]">{item.videoUrl}</span>
                            )}
                            {item.type === 'text' && item.text && (
                              <span className="truncate max-w-[120px] text-[#71717a]">{item.text}</span>
                            )}
                            {item.type === 'products' && Array.isArray(item.productIds) && (
                              <span className="text-[#71717a]">{item.productIds.length} product(s)</span>
                            )}
                          </div>
                        )}
                        onReorder={(reordered) =>
                          setFormData({ ...formData, contentItems: reordered.map((it, idx) => ({ ...it, order: idx })) })
                        }
                      />
                      <select
                        className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                        value=""
                        onChange={(e) => {
                          const type = e.target.value as BannerContentItem['type'];
                          if (!type) return;
                          const items = (formData.contentItems as BannerContentItem[]) ?? [];
                          setFormData({ ...formData, contentItems: [...items, { type, order: items.length }] });
                          e.target.value = '';
                        }}
                      >
                        <option value="">Add block…</option>
                        <option value="products">Products</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="text">Text</option>
                        <option value="banner">Banner image (inline)</option>
                      </select>
                      {((formData.contentItems as BannerContentItem[]) ?? []).map((item, idx) => (
                        <div key={item._id ?? idx} className="border rounded p-3 space-y-2 bg-[#fafafa]">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm capitalize">{item.type}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  contentItems: ((formData.contentItems as BannerContentItem[]) ?? []).filter((_, i) => i !== idx),
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {(item.type === 'banner' || item.type === 'image') && (
                            <>
                              <Input
                                placeholder="Image URL"
                                value={item.imageUrl ?? ''}
                                onChange={(e) => {
                                  const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                  next[idx] = { ...next[idx], imageUrl: e.target.value };
                                  setFormData({ ...formData, contentItems: next });
                                }}
                              />
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-[#034703]"
                                  checked={item.isNavigable !== false}
                                  onChange={(e) => {
                                    const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                    next[idx] = { ...next[idx], isNavigable: e.target.checked };
                                    setFormData({ ...formData, contentItems: next });
                                  }}
                                />
                                Tappable (if off, decorative only)
                              </label>
                              <Input
                                placeholder="Sub-page title (optional, shown on next screen)"
                                value={item.blockTitle ?? ''}
                                onChange={(e) => {
                                  const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                  next[idx] = { ...next[idx], blockTitle: e.target.value };
                                  setFormData({ ...formData, contentItems: next });
                                }}
                              />
                              <Input
                                placeholder="External link URL (optional; used if no sub-page blocks)"
                                value={item.link ?? ''}
                                onChange={(e) => {
                                  const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                  next[idx] = { ...next[idx], link: e.target.value };
                                  setFormData({ ...formData, contentItems: next });
                                }}
                              />
                              {item.isNavigable !== false && (
                                <div className="rounded-lg border border-[#e4e4e7] bg-white p-3 space-y-2 mt-1">
                                  <p className="text-xs font-medium text-[#18181b]">Sub-page content (hero = image above)</p>
                                  <p className="text-[11px] text-[#71717a]">
                                    Add images, videos, text, products — same structure as this landing page. No further nesting.
                                  </p>
                                  <SortableList
                                    items={((item.nestedContentItems as BannerLeafContentItem[]) ?? [])
                                      .slice()
                                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))}
                                    keyFn={(n, ni) => (n._id as string) ?? `n-${ni}`}
                                    renderItem={(n) => (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium capitalize">{n.type}</span>
                                        {(n.type === 'image' || n.type === 'banner') && n.imageUrl && (
                                          <span className="truncate max-w-[100px] text-[#71717a]">{n.imageUrl}</span>
                                        )}
                                        {n.type === 'video' && n.videoUrl && (
                                          <span className="truncate max-w-[100px] text-[#71717a]">{n.videoUrl}</span>
                                        )}
                                        {n.type === 'text' && n.text && (
                                          <span className="truncate max-w-[100px] text-[#71717a]">{n.text}</span>
                                        )}
                                        {n.type === 'products' && Array.isArray(n.productIds) && (
                                          <span className="text-[#71717a]">{n.productIds.length} product(s)</span>
                                        )}
                                      </div>
                                    )}
                                    onReorder={(reordered) => {
                                      const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                      next[idx] = {
                                        ...next[idx],
                                        nestedContentItems: reordered.map((it, o) => ({ ...it, order: o })),
                                      };
                                      setFormData({ ...formData, contentItems: next });
                                    }}
                                  />
                                  <select
                                    className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                                    value=""
                                    onChange={(e) => {
                                      const type = e.target.value as BannerLeafContentItem['type'];
                                      if (!type) return;
                                      const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                      const row = parent[idx];
                                      const nested = row.nestedContentItems ?? [];
                                      const nextNested: BannerLeafContentItem[] = [
                                        ...nested,
                                        { type, order: nested.length },
                                      ];
                                      const next = [...parent];
                                      next[idx] = { ...row, nestedContentItems: nextNested };
                                      setFormData({ ...formData, contentItems: next });
                                      e.target.value = '';
                                    }}
                                  >
                                    <option value="">Add sub-page block…</option>
                                    <option value="products">Products</option>
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                    <option value="text">Text</option>
                                    <option value="banner">Banner image (inline)</option>
                                  </select>
                                  {((item.nestedContentItems as BannerLeafContentItem[]) ?? []).map((nestItem, nidx) => (
                                    <div key={nestItem._id ?? `nest-${nidx}`} className="border rounded p-2 space-y-2 bg-[#fafafa]">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium capitalize">{nestItem.type}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-600"
                                          onClick={() => {
                                            const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                            const row = parent[idx];
                                            const nested = (row.nestedContentItems ?? []).filter((_, i) => i !== nidx);
                                            const next = [...parent];
                                            next[idx] = { ...row, nestedContentItems: nested };
                                            setFormData({ ...formData, contentItems: next });
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      {(nestItem.type === 'banner' || nestItem.type === 'image') && (
                                        <Input
                                          placeholder="Image URL"
                                          value={nestItem.imageUrl ?? ''}
                                          onChange={(e) => {
                                            const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                            const row = parent[idx];
                                            const nested = [...(row.nestedContentItems ?? [])];
                                            nested[nidx] = { ...nested[nidx], imageUrl: e.target.value };
                                            const next = [...parent];
                                            next[idx] = { ...row, nestedContentItems: nested };
                                            setFormData({ ...formData, contentItems: next });
                                          }}
                                        />
                                      )}
                                      {nestItem.type === 'video' && (
                                        <Input
                                          placeholder="Video URL"
                                          value={nestItem.videoUrl ?? ''}
                                          onChange={(e) => {
                                            const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                            const row = parent[idx];
                                            const nested = [...(row.nestedContentItems ?? [])];
                                            nested[nidx] = { ...nested[nidx], videoUrl: e.target.value };
                                            const next = [...parent];
                                            next[idx] = { ...row, nestedContentItems: nested };
                                            setFormData({ ...formData, contentItems: next });
                                          }}
                                        />
                                      )}
                                      {nestItem.type === 'text' && (
                                        <Textarea
                                          placeholder="Text"
                                          value={nestItem.text ?? ''}
                                          rows={3}
                                          className="min-h-[72px]"
                                          onChange={(e) => {
                                            const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                            const row = parent[idx];
                                            const nested = [...(row.nestedContentItems ?? [])];
                                            nested[nidx] = { ...nested[nidx], text: e.target.value };
                                            const next = [...parent];
                                            next[idx] = { ...row, nestedContentItems: nested };
                                            setFormData({ ...formData, contentItems: next });
                                          }}
                                        />
                                      )}
                                      {nestItem.type === 'products' && (
                                        <ProductPicker
                                          selectedIds={nestItem.productIds ?? []}
                                          showOrderControls
                                          onChange={(ids) => {
                                            const parent = (formData.contentItems as BannerContentItem[]) ?? [];
                                            const row = parent[idx];
                                            const nested = [...(row.nestedContentItems ?? [])];
                                            nested[nidx] = { ...nested[nidx], productIds: ids };
                                            const next = [...parent];
                                            next[idx] = { ...row, nestedContentItems: nested };
                                            setFormData({ ...formData, contentItems: next });
                                          }}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {item.type === 'video' && (
                            <Input
                              placeholder="Video URL"
                              value={item.videoUrl ?? ''}
                              onChange={(e) => {
                                const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                next[idx] = { ...next[idx], videoUrl: e.target.value };
                                setFormData({ ...formData, contentItems: next });
                              }}
                            />
                          )}
                          {item.type === 'text' && (
                            <Textarea
                              placeholder="Text (paragraphs supported)"
                              value={item.text ?? ''}
                              rows={4}
                              className="min-h-[88px]"
                              onChange={(e) => {
                                const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                next[idx] = { ...next[idx], text: e.target.value };
                                setFormData({ ...formData, contentItems: next });
                              }}
                            />
                          )}
                          {item.type === 'products' && (
                            <ProductPicker
                              selectedIds={item.productIds ?? []}
                              showOrderControls
                              onChange={(ids) => {
                                const next = [...((formData.contentItems as BannerContentItem[]) ?? [])];
                                next[idx] = { ...next[idx], productIds: ids };
                                setFormData({ ...formData, contentItems: next });
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Order"
                      value={(formData.order as number) ?? 0}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                    />
                  </>
                )}
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
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setBannerFormStep(1);
              }}
            >
              Cancel
            </Button>
            {activeTab === 'banners' && bannerFormStep < 3 ? (
              <>
                {bannerFormStep > 1 && (
                  <Button variant="outline" onClick={() => setBannerFormStep((s) => (s - 1) as 1 | 2 | 3)}>
                    Back
                  </Button>
                )}
                <Button onClick={() => setBannerFormStep((s) => Math.min(3, s + 1) as 1 | 2 | 3)}>Next</Button>
              </>
            ) : (
              !(activeTab === 'sectionlist' && !editingId && (!formData.type || ((formData.type as string) === 'collections' && !formData.collectionId) || ((formData.type as string) === 'banner' && !(formData.bannerIds as string[])?.[0]))) &&
              !(activeTab === 'lifestyle' && !editingId && !(formData.name as string)?.trim()) &&
              !(activeTab === 'promoblocks' && !editingId && (!(formData.blockKey as string)?.trim() || !(formData.imageUrl as string)?.trim())) &&
              !(activeTab === 'sections' && !editingId && !(formData.sectionKey as string)?.trim()) && (
                <Button onClick={saveForm} disabled={formLoading}>
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
