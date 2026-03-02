import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  fetchHomeConfig,
  upsertHomeConfig,
  updateHomeConfig,
  deleteHomeConfig,
  fetchSections,
  createSection,
  updateSection,
  deleteSection,
  fetchLifestyle,
  createLifestyle,
  updateLifestyle,
  deleteLifestyle,
  fetchPromoBlocks,
  createPromoBlock,
  updatePromoBlock,
  deletePromoBlock,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchSectionDefinitions,
  createSectionDefinition,
  updateSectionDefinition,
  deleteSectionDefinition,
  type Category,
  type Banner,
  type HomeConfig,
  type HomeSection,
  type HomeSectionDefinitionItem,
  type SectionDefinition,
  type LifestyleItem,
  type PromoBlock,
  type Product,
} from '@/api/customerAppAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Smartphone } from 'lucide-react';
import { SortableList } from '@/components/ui/sortable-list';
import { ProductPicker } from './ProductPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ResourceTab = 'categories' | 'banners' | 'config' | 'sectionlist' | 'sections' | 'lifestyle' | 'promoblocks' | 'products';

const DEFAULT_SECTION_ORDER = [
  'categories', 'hero_banner', 'deals', 'wellbeing', 'greens_banner', 'section_image',
  'lifestyle', 'new_deals', 'mid_banner', 'fresh_juice', 'deals_2', 'organic_tagline',
];

const VALID_SECTION_KEYS = [...DEFAULT_SECTION_ORDER];

/** Section types for the Config "Add section" picker: Banner (single), Banners (horizontal), Promo, Product rows, etc. */
const SECTION_TYPE_GROUPS: { typeLabel: string; description?: string; keys: string[] }[] = [
  { typeLabel: 'Banner (single / hero)', description: 'One hero banner or carousel', keys: ['hero_banner'] },
  { typeLabel: 'Banners (horizontal scroll)', description: 'Multiple banners in a row', keys: ['mid_banner'] },
  { typeLabel: 'Promo / full width', description: 'Full-width image blocks', keys: ['greens_banner', 'section_image'] },
  { typeLabel: 'Categories', keys: ['categories'] },
  { typeLabel: 'Product rows', description: 'Deals, Wellbeing, New deals, etc.', keys: ['deals', 'wellbeing', 'new_deals', 'fresh_juice', 'deals_2'] },
  { typeLabel: 'Lifestyle', keys: ['lifestyle'] },
  { typeLabel: 'Other', keys: ['organic_tagline'] },
];

function humanizeSectionKey(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const TAB_HINTS: Record<ResourceTab, string> = {
  config: 'Take it, arrange it. Set section order & visibility, labels, hero video. Create content in Banners / Lifestyle / Promo; categories & products come from Catalog.',
  sectionlist: 'Create and manage the section list (key + label). Order here defines default order; use Config tab to set home screen order and visibility.',
  banners: 'Create banners here (image URL, link). Upload image elsewhere, paste URL.',
  lifestyle: 'Create lifestyle cards here (image URL, link). Upload image elsewhere, paste URL.',
  promoblocks: 'Create promo blocks here (greens_banner, section_image). Image URL and link.',
  categories: 'From Catalog only. Reorder categories shown on home; do not create here.',
  sections: 'From Catalog only. Pick products for each row (Deals, Wellbeing, etc.); products are in Catalog.',
  products: 'From Catalog. Products are managed in Admin → Catalog; listed here for use in Sections.',
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
  const [internalTab, setInternalTab] = useState<ResourceTab>('config');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = setControlledTab ?? setInternalTab;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [config, setConfig] = useState<HomeConfig | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [lifestyle, setLifestyle] = useState<LifestyleItem[]>([]);
  const [promoBlocks, setPromoBlocks] = useState<PromoBlock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sectionDefinitionsList, setSectionDefinitionsList] = useState<HomeSectionDefinitionItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  /** Ordered category IDs for home (derived from config + catalog, reorderable) */
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([]);
  /** Ordered section keys for config (reorderable) */
  const [sectionOrderList, setSectionOrderList] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteConfigConfirmOpen, setDeleteConfigConfirmOpen] = useState(false);
  const [deleteConfigLoading, setDeleteConfigLoading] = useState(false);
  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (e) {
      toast.error('Failed to load categories');
      setCategories([]);
    }
  }, []);
  const loadBanners = useCallback(async () => {
    try {
      const data = await fetchBanners();
      setBanners(data);
    } catch (e) {
      toast.error('Failed to load banners');
      setBanners([]);
    }
  }, []);
  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchHomeConfig();
      setConfig(data ?? null);
    } catch (e) {
      toast.error('Failed to load config');
      setConfig(null);
    }
  }, []);
  const loadSections = useCallback(async () => {
    try {
      const data = await fetchSections();
      setSections(data);
    } catch (e) {
      toast.error('Failed to load sections');
      setSections([]);
    }
  }, []);
  const loadLifestyle = useCallback(async () => {
    try {
      const data = await fetchLifestyle();
      setLifestyle(data);
    } catch (e) {
      toast.error('Failed to load lifestyle');
      setLifestyle([]);
    }
  }, []);
  const loadPromoBlocks = useCallback(async () => {
    try {
      const data = await fetchPromoBlocks();
      setPromoBlocks(data);
    } catch (e) {
      toast.error('Failed to load promo blocks');
      setPromoBlocks([]);
    }
  }, []);
  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      toast.error('Failed to load products');
      setProducts([]);
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

  const loadAll = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      await Promise.all([
        loadCategories(),
        loadBanners(),
        loadConfig(),
        loadSectionDefinitions(),
        loadSections(),
        loadLifestyle(),
        loadPromoBlocks(),
        loadProducts(),
      ]);
      onDataChange?.();
      if (showToast) toast.success('Data refreshed');
    } catch {
      if (showToast) toast.error('Failed to refresh data');
      else toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadBanners, loadConfig, loadSectionDefinitions, loadSections, loadLifestyle, loadPromoBlocks, loadProducts, onDataChange]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parentId || c.parentId === null || c.parentId === ''), [categories]);
  const orderedCategoriesForHome = useMemo(() => {
    const ordered = categoryOrderIds.map((id) => topLevelCategories.find((c) => c._id === id)).filter(Boolean) as Category[];
    const rest = topLevelCategories.filter((c) => !categoryOrderIds.includes(c._id));
    return [...ordered, ...rest];
  }, [categoryOrderIds, topLevelCategories]);
  useEffect(() => {
    if (config?.categoryIds && config.categoryIds.length > 0) {
      const ids = config.categoryIds;
      const rest = topLevelCategories.filter((c) => !ids.includes(c._id)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setCategoryOrderIds([...ids, ...rest.map((c) => c._id)]);
    } else {
      setCategoryOrderIds(topLevelCategories.map((c) => c._id));
    }
  }, [config?.categoryIds, topLevelCategories]);
  useEffect(() => {
    if (config?.sectionOrder && config.sectionOrder.length > 0) {
      setSectionOrderList(config.sectionOrder);
    } else if (config?.sectionDefinitions && config.sectionDefinitions.length > 0) {
      setSectionOrderList(config.sectionDefinitions.map((d: SectionDefinition) => d.key));
    } else {
      setSectionOrderList([...DEFAULT_SECTION_ORDER]);
    }
  }, [config?.sectionOrder, config?.sectionDefinitions]);

  const sectionKeyToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    if (config?.sectionDefinitions?.length) {
      for (const d of config.sectionDefinitions) {
        map[d.key] = d.label || d.key;
      }
    }
    // Fallback for keys not in definitions (e.g. for Add picker and sortable list)
    for (const key of VALID_SECTION_KEYS) {
      if (!(key in map)) map[key] = humanizeSectionKey(key);
    }
    return map;
  }, [config?.sectionDefinitions]);

  /** Section keys not yet in the current order (for Add section picker) */
  const availableSectionKeys = useMemo(
    () => VALID_SECTION_KEYS.filter((k) => !sectionOrderList.includes(k)),
    [sectionOrderList]
  );

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
      if (tab === 'categories') await deleteCategory(id);
      else if (tab === 'banners') await deleteBanner(id);
      else if (tab === 'sectionlist') await deleteSectionDefinition(id);
      else if (tab === 'sections') await deleteSection(id);
      else if (tab === 'lifestyle') await deleteLifestyle(id);
      else if (tab === 'promoblocks') await deletePromoBlock(id);
      else if (tab === 'products') await deleteProduct(id);
      toast.success('Deleted');
      if (tab === 'categories') loadCategories();
      else if (tab === 'banners') loadBanners();
      else if (tab === 'sectionlist') loadSectionDefinitions();
      else if (tab === 'sections') loadSections();
      else if (tab === 'lifestyle') loadLifestyle();
      else if (tab === 'promoblocks') loadPromoBlocks();
      else if (tab === 'products') loadProducts();
      if (tab === 'sectionlist') loadConfig();
      onDataChange?.();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };
  const saveConfig = async () => {
    const raw = (formData.sectionVisibilityJson as string) ?? '';
    let sectionVisibility: Record<string, boolean> = {};
    if (raw.trim()) {
      try {
        sectionVisibility = JSON.parse(raw);
        if (typeof sectionVisibility !== 'object' || sectionVisibility === null) sectionVisibility = {};
      } catch {
        toast.error('Invalid section visibility JSON');
        return;
      }
    }
    const payload = { ...formData } as Partial<HomeConfig>;
    delete (payload as Record<string, unknown>).sectionVisibilityJson;
    payload.sectionOrder = sectionOrderList.length > 0 ? sectionOrderList : (Array.isArray(formData.sectionOrder) ? formData.sectionOrder : (typeof formData.sectionOrder === 'string' ? formData.sectionOrder.split(',').map((s) => s.trim()).filter(Boolean) : []));
    payload.sectionVisibility = sectionVisibility;
    setFormLoading(true);
    try {
      if (config?._id) {
        await updateHomeConfig(payload);
      } else {
        await upsertHomeConfig({ ...payload, key: 'main' });
      }
      toast.success('Config saved');
      loadConfig();
      setDialogOpen(false);
      onDataChange?.();
    } catch (e) {
      toast.error('Failed to save config');
    } finally {
      setFormLoading(false);
    }
  };
  const handleDeleteConfig = () => {
    setDialogOpen(false);
    setDeleteConfigConfirmOpen(true);
  };
  const runDeleteConfig = async () => {
    setDeleteConfigLoading(true);
    try {
      await deleteHomeConfig();
      toast.success('Config deleted');
      loadConfig();
      setDeleteConfigConfirmOpen(false);
      onDataChange?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete config';
      toast.error(message);
    } finally {
      setDeleteConfigLoading(false);
    }
  };

  const saveForm = async () => {
    setFormLoading(true);
    try {
      if (activeTab === 'categories') {
        if (editingId) await updateCategory(editingId, formData as Partial<Category>);
        else await createCategory(formData as Partial<Category>);
        loadCategories();
      } else if (activeTab === 'banners') {
        if (editingId) await updateBanner(editingId, formData as Partial<Banner>);
        else await createBanner(formData as Partial<Banner>);
        loadBanners();
      } else if (activeTab === 'sections') {
        if (editingId) await updateSection(editingId, formData as Partial<HomeSection>);
        else await createSection(formData as Partial<HomeSection>);
        loadSections();
      } else if (activeTab === 'lifestyle') {
        const lifestylePayload = { ...formData } as Partial<LifestyleItem>;
        const titleVal = (formData.title ?? formData.name) as string | undefined;
        if (titleVal !== undefined) (lifestylePayload as Record<string, unknown>).name = titleVal;
        if (editingId) await updateLifestyle(editingId, lifestylePayload);
        else await createLifestyle(lifestylePayload);
        loadLifestyle();
      } else if (activeTab === 'promoblocks') {
        if (editingId) await updatePromoBlock(editingId, formData as Partial<PromoBlock>);
        else await createPromoBlock(formData as Partial<PromoBlock>);
        loadPromoBlocks();
      } else if (activeTab === 'products') {
        if (editingId) await updateProduct(editingId, formData as Partial<Product>);
        else await createProduct(formData as Partial<Product>);
        loadProducts();
      } else if (activeTab === 'sectionlist') {
        if (editingId) {
          await updateSectionDefinition(editingId, { label: formData.label as string, order: formData.order as number });
        } else {
          await createSectionDefinition({ key: formData.key as string, label: formData.label as string, order: (formData.order as number) ?? 0 });
        }
        loadSectionDefinitions();
        loadConfig();
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
            Manage categories, banners, home config, sections, lifestyle, promo blocks, and products for the customer app.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceTab)} className="w-full min-w-0 max-w-full">
        <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 bg-[#fcfcfc] border-b border-[#e4e4e7] mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <TabsList className="flex flex-wrap gap-1 bg-[#f4f4f5] p-1 rounded-lg flex-1 min-w-0">
            <TabsTrigger value="config" className="text-xs sm:text-sm">Config</TabsTrigger>
            <TabsTrigger value="sectionlist">Section list</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
            <TabsTrigger value="promoblocks">Promo</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
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

        <TabsContent value="categories" className="mt-4">
          <p className="text-sm text-[#71717a] mb-4">
            Categories on the home screen come from the Catalog. Drag to set the order shown in the app. Manage category names and images in the <strong>Catalog</strong> page.
          </p>
          {topLevelCategories.length === 0 ? (
            <p className="text-sm text-[#71717a] py-4">No top-level categories in Catalog. Add categories in the Catalog page first.</p>
          ) : (
            <>
              <SortableList
                items={orderedCategoriesForHome}
                keyFn={(c) => c._id}
                renderItem={(c) => (
                  <span className="font-medium text-[#18181b]">{c.name}</span>
                )}
                onReorder={(reordered) => setCategoryOrderIds(reordered.map((c) => c._id))}
              />
              <div className="mt-4">
                <Button
                  onClick={async () => {
                    setSavingOrder(true);
                    try {
                      await upsertHomeConfig({ categoryIds: categoryOrderIds });
                      toast.success('Category order saved');
                      loadConfig();
                      onDataChange?.();
                    } catch {
                      toast.error('Failed to save order');
                    } finally {
                      setSavingOrder(false);
                    }
                  }}
                  disabled={savingOrder}
                >
                  {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Save order on home</span>
                </Button>
              </div>
            </>
          )}
        </TabsContent>

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
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('banners', b as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('banners', b._id, b.title || b._id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <p className="text-sm font-medium text-[#18181b] mb-1">Take it, arrange it.</p>
          <p className="text-sm text-[#71717a] mb-4">Add section only adds the <strong>section type</strong> (e.g. Hero banner, Banners) to the order — it does not create content. The mobile app gets <strong>sectionOrder</strong> from config and fills each section with data from Banners, Sections, Lifestyle, Promo, and Catalog. Create that content in the tabs below, then add sections here and click &quot;Save section order&quot; to persist.</p>
          <SortableList
            items={sectionOrderList.map((key) => ({ key }))}
            keyFn={(item) => item.key}
            renderItem={(item) => (
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="font-medium text-[#18181b] flex-1 min-w-0 truncate">
                  {sectionKeyToLabel[item.key] ?? item.key}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  aria-label={`Remove ${sectionKeyToLabel[item.key] ?? item.key} from order`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectionOrderList((prev) => prev.filter((k) => k !== item.key));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            onReorder={(reordered) => setSectionOrderList(reordered.map((item) => item.key))}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setAddSectionPickerOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add section
            </Button>
            <Button
              onClick={async () => {
                setSavingOrder(true);
                try {
                  if (config?._id) {
                    await updateHomeConfig({ sectionOrder: sectionOrderList });
                  } else {
                    await upsertHomeConfig({ sectionOrder: sectionOrderList, key: 'main' });
                  }
                  toast.success('Section order saved');
                  loadConfig();
                  onDataChange?.();
                } catch {
                  toast.error('Failed to save order');
                } finally {
                  setSavingOrder(false);
                }
              }}
              disabled={savingOrder}
            >
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Save section order</span>
            </Button>
            {!config ? (
              <Button variant="outline" onClick={() => {
                const sectionDefinitions: SectionDefinition[] = sectionOrderList.map((k) => ({ key: k, label: k }));
                setFormData({ key: 'main', categorySectionTitle: '', searchPlaceholder: '', heroVideoUrl: '', organicTagline: '', organicIconUrl: '', sectionOrder: sectionOrderList, sectionVisibility: {}, sectionVisibilityJson: '{}', sectionDefinitions }); setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" /> Create config
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                const c = config;
                const sectionDefinitions: SectionDefinition[] = sectionOrderList.map((k) =>
                  c?.sectionDefinitions?.find((d) => d.key === k) ?? { key: k, label: k }
                );
                setFormData({ ...c, sectionVisibilityJson: c?.sectionVisibility ? JSON.stringify(c.sectionVisibility, null, 2) : '{}', sectionDefinitions }); setDialogOpen(true);
              }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit config
                </Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfigConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete config
                </Button>
              </>
            )}
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-[#18181b] mb-2">Manage section content (CRUD)</p>
            <p className="text-xs text-[#71717a] mb-3">Each card type is managed in its own tab. Use the buttons below to jump to add, edit, or delete items.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="border border-[#e4e4e7] rounded-lg p-4 bg-[#fafafa]">
                <p className="font-medium text-[#18181b] text-sm">Banners</p>
                <p className="text-xs text-[#71717a] mt-0.5">{banners.length} item{banners.length !== 1 ? 's' : ''}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setActiveTab('banners')}>Manage</Button>
              </div>
              <div className="border border-[#e4e4e7] rounded-lg p-4 bg-[#fafafa]">
                <p className="font-medium text-[#18181b] text-sm">Categories</p>
                <p className="text-xs text-[#71717a] mt-0.5">{categories.length} item{categories.length !== 1 ? 's' : ''}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setActiveTab('categories')}>Manage</Button>
              </div>
              <div className="border border-[#e4e4e7] rounded-lg p-4 bg-[#fafafa]">
                <p className="font-medium text-[#18181b] text-sm">Sections</p>
                <p className="text-xs text-[#71717a] mt-0.5">{sections.length} row{sections.length !== 1 ? 's' : ''}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setActiveTab('sections')}>Manage</Button>
              </div>
              <div className="border border-[#e4e4e7] rounded-lg p-4 bg-[#fafafa]">
                <p className="font-medium text-[#18181b] text-sm">Lifestyle</p>
                <p className="text-xs text-[#71717a] mt-0.5">{lifestyle.length} item{lifestyle.length !== 1 ? 's' : ''}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setActiveTab('lifestyle')}>Manage</Button>
              </div>
              <div className="border border-[#e4e4e7] rounded-lg p-4 bg-[#fafafa]">
                <p className="font-medium text-[#18181b] text-sm">Promo blocks</p>
                <p className="text-xs text-[#71717a] mt-0.5">{promoBlocks.length} block{promoBlocks.length !== 1 ? 's' : ''}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setActiveTab('promoblocks')}>Manage</Button>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 space-y-4 mt-6">
            {config ? (
              <>
                <p><strong>Category section title:</strong> {config.categorySectionTitle ?? '-'}</p>
                <p><strong>Search placeholder:</strong> {config.searchPlaceholder ?? '-'}</p>
                <p><strong>Hero video URL:</strong> {config.heroVideoUrl ? 'Set' : '-'}</p>
                <p><strong>Organic tagline:</strong> {config.organicTagline ?? '-'}</p>
                <p><strong>Organic icon URL:</strong> {config.organicIconUrl ? 'Set' : '-'}</p>
                <p><strong>Section visibility:</strong> {config.sectionVisibility && Object.keys(config.sectionVisibility).length > 0 ? JSON.stringify(config.sectionVisibility) : '-'}</p>
              </>
            ) : (
              <p className="text-[#71717a]">No config yet. Click Edit other config to create.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sectionlist" className="mt-4">
          <p className="text-sm text-[#71717a] mb-2">
            Create and manage the list of sections (key + label) shown in the Config tab. This list is the source for section order and labels on the home screen.
          </p>
          <p className="text-xs text-[#71717a] mb-4">
            There are {VALID_SECTION_KEYS.length} allowed section types. When all are in the list, Add will open a message instead of the form — edit or delete an existing row to free a slot.
          </p>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                const usedKeys = new Set(sectionDefinitionsList.map((d) => d.key));
                const firstUnused = VALID_SECTION_KEYS.find((k) => !usedKeys.has(k));
                setFormData({ key: firstUnused ?? '', label: '', order: sectionDefinitionsList.length });
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add section definition
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionDefinitionsList.map((d) => (
                <TableRow key={d._id}>
                  <TableCell className="font-mono text-sm">{d.key}</TableCell>
                  <TableCell>{d.label || '-'}</TableCell>
                  <TableCell>{d.order ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('sectionlist', d as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('sectionlist', d._id, d.label || d.key)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sectionDefinitionsList.length === 0 && (
            <p className="text-sm text-[#71717a] py-4">No section definitions yet. Click Add to create (first load may auto-seed defaults).</p>
          )}
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ sectionKey: '', title: '', productIds: [], order: 0, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.sectionKey}</TableCell>
                  <TableCell>{s.title || '-'}</TableCell>
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

        <TabsContent value="lifestyle" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ title: '', imageUrl: '', link: '', blockKey: '', order: 0, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Lifestyle
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Block Key</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lifestyle.map((l) => (
                <TableRow key={l._id}>
                  <TableCell>{(l.title ?? l.name) || '-'}</TableCell>
                  <TableCell>{l.blockKey || '-'}</TableCell>
                  <TableCell>{l.order ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('lifestyle', l as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('lifestyle', l._id, (l.title ?? l.name) || l._id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="promoblocks" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ blockKey: '', imageUrl: '', link: '', order: 0, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Promo Block
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block Key</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoBlocks.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{p.blockKey}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.link || '-'}</TableCell>
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

        <TabsContent value="products" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setFormData({ name: '', price: 0, images: [], order: 0, isActive: true }); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>{p.order ?? 0}</TableCell>
                  <TableCell>{p.isActive ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit('products', p as unknown as Record<string, unknown>)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('products', p._id, p.name)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Generic add/edit dialog for list resources */}
      <Dialog open={dialogOpen && activeTab !== 'config'} onOpenChange={setDialogOpen}>
        <DialogContent className={activeTab === 'sections' ? 'max-w-xl' : 'max-w-md'}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit' : 'Add'}{' '}
              {activeTab === 'sectionlist' ? 'section definition' : activeTab === 'sections' ? 'section' : activeTab === 'categories' ? 'category' : activeTab === 'products' ? 'product' : activeTab === 'promoblocks' ? 'promo block' : activeTab.slice(0, -1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTab === 'sectionlist' && (
              <>
                {!editingId && VALID_SECTION_KEYS.every((k) => sectionDefinitionsList.some((d) => d.key === k)) ? (
                  <p className="text-sm text-[#71717a] py-2">
                    All {VALID_SECTION_KEYS.length} section types already have definitions. Edit an existing row to change its label, or delete one to free a key so you can add it again here.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-[#18181b] mb-1 block">Key</label>
                      {editingId ? (
                        <p className="font-mono text-sm text-[#71717a]">{(formData.key as string) ?? ''}</p>
                      ) : (
                        <select
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-sm"
                          value={(formData.key as string) ?? ''}
                          onChange={(e) => {
                            const key = e.target.value;
                            const def = VALID_SECTION_KEYS.find((k) => k === key);
                            setFormData({ ...formData, key, label: formData.label || (def ? def.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '') });
                          }}
                        >
                          <option value="">Select key</option>
                          {VALID_SECTION_KEYS.filter((k) => !sectionDefinitionsList.some((d) => d.key === k)).map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Input placeholder="Label (display name)" value={(formData.label as string) ?? ''} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
                    <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
                  </>
                )}
              </>
            )}
            {activeTab === 'categories' && (
              <>
                <Input placeholder="Name" value={(formData.name as string) ?? ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <Input placeholder="Slug" value={(formData.slug as string) ?? ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'banners' && (
              <>
                <p className="text-xs text-[#71717a]">Image URL: upload elsewhere, paste URL. On tap: set Link so the card navigates (product detail, category, or URL).</p>
                <Input placeholder="Slot (hero | mid)" value={(formData.slot as string) ?? ''} onChange={(e) => setFormData({ ...formData, slot: e.target.value })} />
                <Input placeholder="Image URL" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <Input placeholder="Title" value={(formData.title as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">On tap – navigate to</label>
                  <Input placeholder="product:ID | category:ID | https://... | ScreenName:param=val" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                  <p className="text-xs text-[#71717a] mt-1">product:ID → Product detail, category:ID → Category, https://... → External. Empty = Banner detail.</p>
                </div>
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'sections' && (
              <>
                <Input placeholder="Section Key (e.g. deals, wellbeing, new_deals, fresh_juice)" value={(formData.sectionKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })} />
                <Input placeholder="Title" value={(formData.title as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <ProductPicker
                  selectedIds={Array.isArray(formData.productIds) ? (formData.productIds as string[]) : []}
                  onChange={(ids) => setFormData({ ...formData, productIds: ids })}
                />
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'lifestyle' && (
              <>
                <p className="text-xs text-[#71717a]">Image URL: upload elsewhere, paste URL. Set Link so when user taps the card they go to product/category/URL.</p>
                <Input placeholder="Title" value={((formData.title ?? formData.name) as string) ?? ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <Input placeholder="Block Key" value={(formData.blockKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, blockKey: e.target.value })} />
                <Input placeholder="Image URL" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">On tap – navigate to</label>
                  <Input placeholder="product:ID | category:ID | https://... | ScreenName:param=val" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                  <p className="text-xs text-[#71717a] mt-1">product:ID → Product detail, category:ID → Category, https://... → External.</p>
                </div>
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'promoblocks' && (
              <>
                <p className="text-xs text-[#71717a]">Block key: greens_banner or section_image. Image URL: upload elsewhere, paste URL. Set Link for on-tap navigation.</p>
                <Input placeholder="Block Key (greens_banner | section_image)" value={(formData.blockKey as string) ?? ''} onChange={(e) => setFormData({ ...formData, blockKey: e.target.value })} />
                <Input placeholder="Image URL" value={(formData.imageUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">On tap – navigate to</label>
                  <Input placeholder="product:ID | category:ID | https://... | ScreenName:param=val" value={(formData.link as string) ?? ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} />
                  <p className="text-xs text-[#71717a] mt-1">product:ID → Product detail, category:ID → Category, https://... → External.</p>
                </div>
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
            {activeTab === 'products' && (
              <>
                <Input placeholder="Name" value={(formData.name as string) ?? ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <Input type="number" placeholder="Price" value={(formData.price as number) ?? 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                <Input placeholder="Image URL (first)" value={Array.isArray(formData.images) ? (formData.images[0] as string) : ''} onChange={(e) => setFormData({ ...formData, images: e.target.value ? [e.target.value] : [] })} />
                <Input type="number" placeholder="Order" value={(formData.order as number) ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })} />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {!(activeTab === 'sectionlist' && !editingId && VALID_SECTION_KEYS.every((k) => sectionDefinitionsList.some((d) => d.key === k))) && (
              <Button onClick={saveForm} disabled={formLoading}>{formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config dialog */}
      <Dialog open={dialogOpen && activeTab === 'config'} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Home Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto min-h-0 flex-1 pr-2 -mr-2">
            <Input placeholder="Category section title" value={(formData.categorySectionTitle as string) ?? ''} onChange={(e) => setFormData({ ...formData, categorySectionTitle: e.target.value })} />
            <Input placeholder="Search placeholder" value={(formData.searchPlaceholder as string) ?? ''} onChange={(e) => setFormData({ ...formData, searchPlaceholder: e.target.value })} />
            <Input placeholder="Hero video URL" value={(formData.heroVideoUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, heroVideoUrl: e.target.value })} />
            <Input placeholder="Organic tagline" value={(formData.organicTagline as string) ?? ''} onChange={(e) => setFormData({ ...formData, organicTagline: e.target.value })} />
            <Input placeholder="Organic icon URL" value={(formData.organicIconUrl as string) ?? ''} onChange={(e) => setFormData({ ...formData, organicIconUrl: e.target.value })} />
            <p className="text-xs text-[#71717a]">Section order is set by dragging in the Config tab above. Manage section keys and labels in the <strong>Section list</strong> tab.</p>
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Section visibility (JSON, e.g. {`{"deals": true, "wellbeing": false}`})</label>
              <Input placeholder='{"deals": true}' value={(formData.sectionVisibilityJson as string) ?? (typeof formData.sectionVisibility === 'object' && formData.sectionVisibility !== null ? JSON.stringify(formData.sectionVisibility, null, 2) : '{}')} onChange={(e) => setFormData({ ...formData, sectionVisibilityJson: e.target.value })} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2 shrink-0 pt-2 border-t border-[#e4e4e7]">
            {config?._id && (
              <Button type="button" variant="outline" className="mr-auto text-red-600 hover:text-red-700" onClick={handleDeleteConfig} disabled={formLoading}>
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={formLoading}>{formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add section picker: choose Banner, Banners (horizontal), or other section types to add to the home order */}
      <Dialog open={addSectionPickerOpen} onOpenChange={setAddSectionPickerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add section</DialogTitle>
            <p className="text-sm text-[#71717a] mt-1">
              You are only choosing <strong>which section type</strong> appears on the home screen (e.g. Hero banner, Banners). No image or link is sent yet — the mobile app loads content from the backend: hero/mid banners from Banners tab, product rows from Sections tab, etc. Add content in those tabs first so the section is not empty on mobile.
            </p>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 space-y-4 py-2">
            {availableSectionKeys.length === 0 ? (
              <p className="text-sm text-[#71717a] py-2">
                All section types are already in the order. Remove a section from the list above (trash icon), then you can add it again here.
              </p>
            ) : (
              SECTION_TYPE_GROUPS.map((group) => {
                const availableInGroup = group.keys.filter((k) => availableSectionKeys.includes(k));
                if (availableInGroup.length === 0) return null;
                return (
                  <div key={group.typeLabel} className="space-y-2">
                    <p className="text-sm font-medium text-[#18181b]">{group.typeLabel}</p>
                    {group.description && <p className="text-xs text-[#71717a] -mt-0.5">{group.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      {availableInGroup.map((key) => (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          className="text-left justify-start"
                          onClick={() => {
                            setSectionOrderList((prev) => [...prev, key]);
                            setAddSectionPickerOpen(false);
                          }}
                        >
                          {sectionKeyToLabel[key] ?? humanizeSectionKey(key)}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="shrink-0 border-t border-[#e4e4e7] pt-2">
            <Button variant="outline" onClick={() => setAddSectionPickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete config confirmation — themed UI instead of browser alert */}
      <AlertDialog open={deleteConfigConfirmOpen} onOpenChange={(open) => !deleteConfigLoading && setDeleteConfigConfirmOpen(open)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#18181b]">Delete home config?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-[#71717a]">
              The app will have no config until you create a new one. Section order and labels will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteConfigLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runDeleteConfig(); }}
              disabled={deleteConfigLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
            >
              {deleteConfigLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
