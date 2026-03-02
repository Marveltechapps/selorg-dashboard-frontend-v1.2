/**
 * App CMS – Read-only preview that replicates the customer app home layout.
 * Uses the same section order and visibility as the app (config.sectionOrder + sectionVisibility).
 * Data from GET /api/v1/customer/home. Edit content in Customer App Home.
 * Features: mobile/desktop preview, media library, publish workflow (refresh to sync).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Smartphone,
  Monitor,
  Pencil,
  RefreshCw,
  Loader2,
  Home,
  Search,
  ChevronDown,
  UserCircle,
  Image as ImageIcon,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchCustomerHomePayload,
  type CustomerHomePayload,
} from '@/api/customerAppAdminApi';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

const DEFAULT_SECTION_ORDER = [
  'categories',
  'hero_banner',
  'deals',
  'wellbeing',
  'greens_banner',
  'section_image',
  'lifestyle',
  'new_deals',
  'mid_banner',
  'fresh_juice',
  'deals_2',
  'organic_tagline',
] as const;
const VALID_SECTION_KEYS = new Set<string>(DEFAULT_SECTION_ORDER);

function getOrderedSectionKeys(payload: CustomerHomePayload | null): string[] {
  if (!payload?.config) return [...DEFAULT_SECTION_ORDER];
  const configOrder = payload.config.sectionOrder;
  const visibility = payload.config.sectionVisibility ?? {};
  const ordered: string[] =
    Array.isArray(configOrder) && configOrder.length > 0
      ? [
          ...configOrder.filter((k: string) => VALID_SECTION_KEYS.has(k)),
          ...DEFAULT_SECTION_ORDER.filter((k) => !configOrder.includes(k)),
        ]
      : [...DEFAULT_SECTION_ORDER];
  return ordered.filter((key) => visibility[key] !== false);
}

type PreviewMode = 'mobile' | 'desktop';
type CmsTab = 'preview' | 'media';

interface AppCMSProps {
  onEditContent?: () => void;
}

export function AppCMS({ onEditContent }: AppCMSProps) {
  const [payload, setPayload] = useState<CustomerHomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('mobile');
  const [cmsTab, setCmsTab] = useState<CmsTab>('preview');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerHomePayload();
      setPayload(data);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Failed to load home preview';
      setError(msg);
      toast.error(msg);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orderedSectionKeys = useMemo(
    () => getOrderedSectionKeys(payload),
    [payload]
  );

  const sectionKeyToLabel = useMemo(() => {
    const defs = payload?.config?.sectionDefinitions;
    if (!Array.isArray(defs) || defs.length === 0) return {} as Record<string, string>;
    return defs.reduce<Record<string, string>>((acc, d) => {
      acc[d.key] = d.label || d.key;
      return acc;
    }, {});
  }, [payload?.config?.sectionDefinitions]);

  /** Media library: aggregate all images from payload (real API data, no mocks) */
  const mediaItems = useMemo(() => {
    const items: { url: string; label: string; source: string }[] = [];
    if (!payload) return items;
    for (const c of payload.categories ?? []) {
      if (c.imageUrl) items.push({ url: c.imageUrl, label: c.name, source: 'Category' });
    }
    for (const b of payload.heroBanners ?? []) {
      if (b.imageUrl) items.push({ url: b.imageUrl, label: b.title ?? 'Hero Banner', source: 'Hero Banner' });
    }
    for (const b of payload.midBanners ?? []) {
      if (b.imageUrl) items.push({ url: b.imageUrl, label: b.title ?? 'Mid Banner', source: 'Mid Banner' });
    }
    for (const l of payload.lifestyle ?? []) {
      if (l.imageUrl) items.push({ url: l.imageUrl, label: (l.title ?? l.name) ?? 'Lifestyle', source: 'Lifestyle' });
    }
    const pb = payload.promoBlocks ?? {};
    for (const [key, v] of Object.entries(pb)) {
      if (v?.imageUrl) items.push({ url: v.imageUrl, label: key, source: 'Promo Block' });
    }
    if (payload.config?.organicIconUrl) {
      items.push({ url: payload.config.organicIconUrl, label: 'Organic Icon', source: 'Config' });
    }
    for (const [, s] of Object.entries(payload.sections ?? {})) {
      const prods = (s?.products ?? []) as { name?: string; images?: string[] }[];
      for (const p of prods) {
        for (const img of p.images ?? []) {
          if (img) items.push({ url: img, label: p.name ?? 'Product', source: 'Section Product' });
        }
      }
    }
    return items;
  }, [payload]);

  if (loading && !payload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#71717a]" />
        <p className="text-sm text-[#71717a]">Loading home preview…</p>
      </div>
    );
  }

  const config = payload?.config ?? null;
  const categories = payload?.categories ?? [];
  const heroBanners = payload?.heroBanners ?? [];
  const midBanners = payload?.midBanners ?? [];
  const sections = payload?.sections ?? {};
  const lifestyle = payload?.lifestyle ?? [];
  const promoBlocks = payload?.promoBlocks ?? {};
  const greensBanner = promoBlocks.greens_banner;
  const sectionImage = promoBlocks.section_image;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#18181b] truncate">
            App CMS – Content Management
          </h1>
          <p className="text-sm text-[#71717a] mt-1">
            Preview home layout and browse media. Edit content in Customer App Home.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div className="flex rounded-lg border border-[#e4e4e7] p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                previewMode === 'mobile' ? 'bg-[#18181b] text-white' : 'text-[#71717a] hover:bg-[#f4f4f5]'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                previewMode === 'desktop' ? 'bg-[#18181b] text-white' : 'text-[#71717a] hover:bg-[#f4f4f5]'
              }`}
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Sync Preview</span>
          </Button>
          {onEditContent && (
            <Button
              size="sm"
              onClick={onEditContent}
              className="bg-[#4A7D5B] hover:bg-[#3d684b]"
            >
              <Pencil className="h-4 w-4" />
              <span className="ml-2">Edit home content</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <Tabs value={cmsTab} onValueChange={(v) => setCmsTab(v as CmsTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="preview" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Media Library
            {mediaItems.length > 0 && (
              <span className="ml-1 rounded-full bg-[#e4e4e7] px-1.5 py-0.5 text-xs font-medium">
                {mediaItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-0">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Preview container – mobile (phone frame) or desktop (full-width) */}
        <div
          className={
            previewMode === 'mobile'
              ? 'flex-shrink-0 flex justify-center md:justify-start'
              : 'w-full max-w-2xl'
          }
        >
          <div
            className={
              previewMode === 'mobile'
                ? 'relative shadow-2xl rounded-[2rem] border-[6px] border-[#27272a] overflow-hidden bg-[#F5F5F5]'
                : 'rounded-xl border border-[#e4e4e7] overflow-hidden bg-[#F5F5F5]'
            }
            style={
              previewMode === 'mobile'
                ? { width: '320px', minHeight: '640px' }
                : { minHeight: '640px', width: '100%', maxWidth: '480px' }
            }
          >
            {previewMode === 'mobile' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#27272a] rounded-b-xl z-10" />
            )}
            <div className="overflow-y-auto pt-6 px-0 pb-4 flex flex-col min-h-[600px] max-h-[70vh]">
              {/* ─── Top section (hero + overlay header) – matches TopSection ─── */}
              <div className="relative rounded-t-xl overflow-hidden mb-0">
                {/* Hero area: green bg + optional video placeholder */}
                <div
                  className="w-full h-[180px] bg-[#034703] flex items-center justify-center"
                  style={{ minHeight: '180px' }}
                >
                  {config?.heroVideoUrl ? (
                    <div className="w-full h-full bg-black/30 flex items-center justify-center text-white/80 text-xs">
                      Video
                    </div>
                  ) : (
                    <span className="text-white/60 text-xs">Hero video</span>
                  )}
                </div>
                {/* Overlay: location + profile + search (same order as app) */}
                <div className="absolute top-0 left-0 right-0 p-3 pt-4 space-y-2.5 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-0.5 text-white/90 text-xs">
                        <span>Location</span>
                        <ChevronDown className="w-3 h-3 flex-shrink-0" />
                      </div>
                      <div className="text-white font-medium text-sm truncate">
                        {payload?.defaultAddress ? 'Address set' : 'Set location'}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                    <input
                      readOnly
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#e4e4e7] bg-white text-sm placeholder:text-[#a1a1aa]"
                      placeholder={
                        config?.searchPlaceholder ?? 'Search for "Dal"'
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ─── Sections in app order (same as Home.tsx) ─── */}
              {orderedSectionKeys.map((sectionKey) => {
                switch (sectionKey) {
                  case 'categories':
                    return (
                      <div
                        key="categories"
                        className="px-4 py-4 bg-white rounded-lg mx-2 mb-2"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-base font-medium text-[#222222]">
                            {config?.categorySectionTitle ?? 'Grocery & Kitchen'}
                          </h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-[#797979] to-[#f5f5f5] max-w-[214px]" />
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {categories.slice(0, 6).map((c) => (
                            <div
                              key={c._id}
                              className="flex-shrink-0 w-[104px] flex flex-col items-center gap-2"
                            >
                              <div className="w-[104px] h-[104px] rounded-xl bg-[#f4f4f5] overflow-hidden">
                                {c.imageUrl ? (
                                  <ImageWithFallback
                                    src={c.imageUrl}
                                    alt={c.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">
                                    ?
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-center text-[#52525b] truncate w-full">
                                {c.name}
                              </span>
                            </div>
                          ))}
                        </div>
                        {categories.length === 0 && (
                          <p className="text-xs text-[#71717a]">No categories</p>
                        )}
                      </div>
                    );

                  case 'hero_banner':
                    if (heroBanners.length === 0) return null;
                    return (
                      <div
                        key="hero_banner"
                        className="px-3 py-4 bg-white rounded-lg mx-2 mb-2"
                      >
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {heroBanners.map((b) => (
                            <div
                              key={b._id}
                              className="flex-shrink-0 w-[280px] h-[140px] rounded-xl overflow-hidden bg-[#f4f4f5]"
                            >
                              <ImageWithFallback
                                src={b.imageUrl}
                                alt={b.title ?? 'Banner'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        {heroBanners.length > 1 && (
                          <div className="flex justify-center gap-1 mt-1">
                            {heroBanners.map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i === 0 ? 'bg-[#034703] w-4' : 'bg-[#BABABA]'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );

                  case 'deals':
                  case 'deals_2': {
                    const s =
                      sectionKey === 'deals_2'
                        ? sections.deals_2
                        : sections.deals;
                    const title = s?.title ?? 'Deals';
                    const products = s?.products ?? [];
                    return (
                      <div
                        key={sectionKey}
                        className="px-4 py-3 bg-white rounded-lg mx-2 mb-2"
                      >
                        <h3 className="text-base font-medium text-[#222222] mb-2">
                          {title}
                        </h3>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {(products as { _id?: string; name?: string; images?: string[]; price?: number }[])
                            .slice(0, 4)
                            .map((p) => (
                              <div
                                key={p._id ?? p.name}
                                className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]"
                              >
                                <div className="w-24 h-24 bg-[#f4f4f5]">
                                  {p.images?.[0] ? (
                                    <ImageWithFallback
                                      src={p.images[0]}
                                      alt={p.name ?? ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">
                                      —
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] truncate px-1 py-0.5 text-[#18181b]">
                                  {p.name ?? 'Product'}
                                </p>
                                <p className="text-[10px] text-[#034703] font-medium px-1 pb-1">
                                  ₹{typeof p.price === 'number' ? p.price : '—'}
                                </p>
                              </div>
                            ))}
                        </div>
                        {products.length === 0 && (
                          <p className="text-xs text-[#71717a]">No products</p>
                        )}
                      </div>
                    );
                  }

                  case 'wellbeing': {
                    const s = sections.wellbeing;
                    const products = s?.products ?? [];
                    return (
                      <div
                        key="wellbeing"
                        className="px-4 py-3 bg-white rounded-lg mx-2 mb-2"
                      >
                        <h3 className="text-base font-medium text-[#222222] mb-2">
                          Wellbeing
                        </h3>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {(products as { _id?: string; name?: string; images?: string[] }[])
                            .slice(0, 4)
                            .map((p) => (
                              <div
                                key={p._id ?? p.name}
                                className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]"
                              >
                                <div className="w-24 h-24 bg-[#f4f4f5]">
                                  {p.images?.[0] ? (
                                    <ImageWithFallback
                                      src={p.images[0]}
                                      alt={p.name ?? ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">
                                      —
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] truncate px-1 py-0.5">
                                  {p.name ?? 'Product'}
                                </p>
                              </div>
                            ))}
                        </div>
                        {products.length === 0 && (
                          <p className="text-xs text-[#71717a]">No products</p>
                        )}
                      </div>
                    );
                  }

                  case 'greens_banner':
                    if (!greensBanner?.imageUrl) return null;
                    return (
                      <div
                        key="greens_banner"
                        className="px-4 pt-6 pb-2 bg-transparent mx-2 mb-2"
                      >
                        <div className="w-full h-20 rounded-[10px] overflow-hidden bg-[#f4f4f5]">
                          <ImageWithFallback
                            src={greensBanner.imageUrl}
                            alt="Greens"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    );

                  case 'section_image':
                    if (!sectionImage?.imageUrl) return null;
                    return (
                      <div
                        key="section_image"
                        className="px-4 py-4 bg-white rounded-lg mx-2 mb-2"
                      >
                        <div className="w-full rounded-lg overflow-hidden bg-[#f4f4f5] aspect-[2/1]">
                          <ImageWithFallback
                            src={sectionImage.imageUrl}
                            alt="Section"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    );

                  case 'lifestyle':
                    return (
                      <div
                        key="lifestyle"
                        className="relative mx-2 mb-2 rounded-xl overflow-hidden"
                        style={{ minHeight: '140px', background: '#9DE8F7' }}
                      >
                        <div className="flex gap-3 overflow-x-auto py-4 px-3 scrollbar-hide">
                          {lifestyle.slice(0, 5).map((l) => (
                            <div
                              key={l._id}
                              className="relative flex-shrink-0 w-[152px] rounded-lg overflow-hidden bg-white/80 border border-white shadow-sm"
                            >
                              <div className="w-full h-[100px] bg-[#f4f4f5]">
                                {l.imageUrl ? (
                                  <ImageWithFallback
                                    src={l.imageUrl}
                                    alt={(l.title ?? l.name) ?? ''}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[#71717a]">
                                    {(l.title ?? l.name) ?? '—'}
                                  </div>
                                )}
                              </div>
                              <div className="px-1.5 py-1 bg-white/90">
                                <span className="text-[10px] font-medium text-[#18181b] truncate block">
                                  {(l.title ?? l.name) ?? 'Lifestyle'}
                                </span>
                                <span className="text-[9px] text-[#034703]">
                                  Explore Now
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {lifestyle.length === 0 && (
                          <p className="text-xs text-[#71717a] p-3 absolute inset-0 flex items-center">
                            No lifestyle items
                          </p>
                        )}
                      </div>
                    );

                  case 'new_deals': {
                    const s = sections.new_deals;
                    const title = s?.title ?? 'New Deals';
                    const products = s?.products ?? [];
                    return (
                      <div
                        key="new_deals"
                        className="px-4 py-3 bg-white rounded-lg mx-2 mb-2"
                      >
                        <h3 className="text-base font-medium text-[#222222] mb-2">
                          {title}
                        </h3>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {(products as { _id?: string; name?: string; images?: string[] }[])
                            .slice(0, 4)
                            .map((p) => (
                              <div
                                key={p._id ?? p.name}
                                className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]"
                              >
                                <div className="w-24 h-24 bg-[#f4f4f5]">
                                  {p.images?.[0] ? (
                                    <ImageWithFallback
                                      src={p.images[0]}
                                      alt={p.name ?? ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">
                                      —
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] truncate px-1 py-0.5">
                                  {p.name ?? 'Product'}
                                </p>
                              </div>
                            ))}
                        </div>
                        {products.length === 0 && (
                          <p className="text-xs text-[#71717a]">No products</p>
                        )}
                      </div>
                    );
                  }

                  case 'mid_banner':
                    if (midBanners.length === 0) return null;
                    return (
                      <div
                        key="mid_banner"
                        className="px-4 py-4 bg-white rounded-lg mx-2 mb-2"
                      >
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {midBanners.map((b) => (
                            <div
                              key={b._id}
                              className="flex-shrink-0 w-[272px] h-[120px] rounded-xl overflow-hidden bg-[#f4f4f5]"
                            >
                              <ImageWithFallback
                                src={b.imageUrl}
                                alt={b.title ?? 'Banner'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );

                  case 'fresh_juice': {
                    const s = sections.fresh_juice;
                    const title = s?.title ?? 'Fresh Juice';
                    const products = s?.products ?? [];
                    return (
                      <div
                        key="fresh_juice"
                        className="px-4 py-3 bg-white rounded-lg mx-2 mb-2"
                      >
                        <h3 className="text-base font-medium text-[#222222] mb-2">
                          {title}
                        </h3>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {(products as { _id?: string; name?: string; images?: string[] }[])
                            .slice(0, 4)
                            .map((p) => (
                              <div
                                key={p._id ?? p.name}
                                className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]"
                              >
                                <div className="w-24 h-24 bg-[#f4f4f5]">
                                  {p.images?.[0] ? (
                                    <ImageWithFallback
                                      src={p.images[0]}
                                      alt={p.name ?? ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">
                                      —
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] truncate px-1 py-0.5">
                                  {p.name ?? 'Product'}
                                </p>
                              </div>
                            ))}
                        </div>
                        {products.length === 0 && (
                          <p className="text-xs text-[#71717a]">No products</p>
                        )}
                      </div>
                    );
                  }

                  case 'organic_tagline':
                    if (!config?.organicTagline) return null;
                    return (
                      <div
                        key="organic_tagline"
                        className="px-4 py-4 bg-white rounded-lg mx-2 mb-2"
                      >
                        <div className="relative min-h-[60px]">
                          <p className="text-sm text-[#222222] pr-8">
                            {config.organicTagline}
                          </p>
                          {config.organicIconUrl && (
                            <div className="absolute top-0 right-0 w-6 h-6">
                              <ImageWithFallback
                                src={config.organicIconUrl}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  default:
                    return null;
                }
              })}

              {orderedSectionKeys.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-center text-sm text-[#71717a] px-4 py-8">
                  No sections visible. Edit Config in Customer App Home to set
                  section order and visibility.
                  {Object.keys(sectionKeyToLabel).length > 0 && (
                    <span className="block mt-2 text-xs">
                      Available: {Object.values(sectionKeyToLabel).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side panel: how to add content */}
        <div className="flex-1 max-w-md space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6">
            <h3 className="font-bold text-[#18181b] mb-2">Publish workflow</h3>
            <p className="text-sm text-[#71717a]">
              Edits in <strong>Customer App Home</strong> are saved and live immediately. Use{' '}
              <strong>Sync Preview</strong> to fetch the latest content here. The customer app
              shows updated content on next open.
            </p>
          </div>
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6">
            <h3 className="font-bold text-[#18181b] mb-3">
              How to add things to the home screen
            </h3>
            <ul className="text-sm text-[#71717a] space-y-2 list-disc list-inside">
              <li>
                <strong className="text-[#18181b]">Categories</strong> – Customer App Home → Categories tab → Add category (name, image, order).
              </li>
              <li>
                <strong className="text-[#18181b]">Hero / Mid banners</strong> – Banners tab → Create with slot &quot;hero&quot; or &quot;mid&quot;, image, link.
              </li>
              <li>
                <strong className="text-[#18181b]">Deals, Wellbeing, New Deals, Fresh Juice</strong> – Sections tab → Create or edit section (sectionKey, title, product IDs). Link products in Products tab.
              </li>
              <li>
                <strong className="text-[#18181b]">Greens / Section image</strong> – Promo blocks tab → blockKey <code className="bg-[#f4f4f5] px-1 rounded">greens_banner</code> or <code className="bg-[#f4f4f5] px-1 rounded">section_image</code>, image + link.
              </li>
              <li>
                <strong className="text-[#18181b]">Lifestyle</strong> – Lifestyle tab → Add items (title, imageUrl, link, order).
              </li>
              <li>
                <strong className="text-[#18181b]">Titles, video, search</strong> – Config tab → categorySectionTitle, heroVideoUrl, searchPlaceholder, organicTagline, sectionOrder, sectionVisibility.
              </li>
            </ul>
          </div>
          {onEditContent && (
            <Button
              onClick={onEditContent}
              className="w-full bg-[#4A7D5B] hover:bg-[#3d684b]"
              size="lg"
            >
              <Home className="h-5 w-5 mr-2" />
              Open Customer App Home to edit
            </Button>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6">
            <h3 className="font-bold text-[#18181b] mb-2">Media Library</h3>
            <p className="text-sm text-[#71717a] mb-4">
              Images used across home content (categories, banners, lifestyle, promo blocks, products).
              Managed via Customer App Home when creating/editing each resource.
            </p>
            {mediaItems.length === 0 ? (
              <p className="text-sm text-[#71717a] py-8 text-center">
                No media found. Add categories, banners, lifestyle items, or products in Customer App Home.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaItems.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="group rounded-lg border border-[#e4e4e7] overflow-hidden bg-[#f4f4f5] hover:border-[#a1a1aa] transition-colors"
                  >
                    <div className="aspect-square relative">
                      <ImageWithFallback
                        src={item.url}
                        alt={item.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-[#18181b] truncate">{item.label}</p>
                      <p className="text-[10px] text-[#71717a]">{item.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onEditContent && mediaItems.length > 0 && (
              <Button
                onClick={onEditContent}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit content in Customer App Home
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
