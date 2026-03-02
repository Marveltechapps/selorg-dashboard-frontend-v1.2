/**
 * Presentational phone preview of the customer app home.
 * Matches mobile app layout: colors, spacing, and proportions (scaled to phone width).
 */
import React, { useMemo } from 'react';
import { Search, ChevronDown, UserCircle, RefreshCw, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerHomePayload } from '@/api/customerAppAdminApi';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

/** Map section key to edit tab for "Edit" link */
export function sectionToEditTab(sectionKey: string): 'categories' | 'banners' | 'config' | 'sections' | 'lifestyle' | 'promoblocks' | 'products' {
  switch (sectionKey) {
    case 'categories': return 'categories';
    case 'hero_banner': case 'mid_banner': return 'banners';
    case 'deals': case 'wellbeing': case 'new_deals': case 'fresh_juice': case 'deals_2': return 'sections';
    case 'greens_banner': case 'section_image': return 'promoblocks';
    case 'lifestyle': return 'lifestyle';
    case 'organic_tagline': return 'config';
    default: return 'config';
  }
}

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

export function getOrderedSectionKeys(payload: CustomerHomePayload | null): string[] {
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

export type EditTab = 'categories' | 'banners' | 'config' | 'sections' | 'lifestyle' | 'promoblocks' | 'products';

export interface HomePreviewPhoneProps {
  payload: CustomerHomePayload | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  /** If true, show a compact header (title + refresh only) */
  compactHeader?: boolean;
  /** When set, show "Edit" links that switch to this tab in the edit panel */
  onEditSection?: (tab: EditTab) => void;
}

function EditLink({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-0.5 text-[10px] text-[#034703] hover:underline focus:outline-none"
      aria-label={label ?? 'Edit'}
    >
      <Pencil className="w-3 h-3" />
      <span>Edit</span>
    </button>
  );
}

export function HomePreviewPhone({
  payload,
  loading,
  error,
  onRefresh,
  compactHeader = false,
  onEditSection,
}: HomePreviewPhoneProps) {
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

  const config = payload?.config ?? null;
  const categories = payload?.categories ?? [];
  const heroBanners = payload?.heroBanners ?? [];
  const midBanners = payload?.midBanners ?? [];
  const sections = payload?.sections ?? {};
  const lifestyle = payload?.lifestyle ?? [];
  const promoBlocks = payload?.promoBlocks ?? {};
  const greensBanner = promoBlocks.greens_banner;
  const sectionImage = promoBlocks.section_image;

  if (loading && !payload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#71717a]" />
        <p className="text-sm text-[#71717a]">Loading preview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {compactHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#18181b]">App preview</h3>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}
      {/* Phone frame: 320px width, mobile proportions (app design ~375px, scale 320/375) */}
      <div
        className="relative shadow-2xl rounded-[2rem] border-[6px] border-[#27272a] overflow-hidden bg-[#F5F5F5]"
        style={{ width: '320px', minHeight: '640px' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#27272a] rounded-b-xl z-10" />
        <div className="overflow-y-auto pt-6 px-0 pb-4 flex flex-col min-h-[600px] max-h-[70vh]">
          {/* Top section – hero + overlay (app: VIDEO_CONTAINER_HEIGHT 400, green #034703, padding 14/17/20) */}
          <div className="relative rounded-t-xl overflow-hidden mb-0">
            <div
              className="w-full bg-[#034703] flex items-center justify-center"
              style={{ minHeight: '273px' }}
            >
              {config?.heroVideoUrl ? (
                <div className="w-full h-full min-h-[273px] bg-black/30 flex items-center justify-center text-white/80 text-xs">
                  Video
                </div>
              ) : (
                <span className="text-white/60 text-xs">Hero video</span>
              )}
            </div>
            <div className="absolute top-0 left-0 right-0 px-3.5 pt-4 pb-4 space-y-2.5 z-10">
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
                  placeholder={config?.searchPlaceholder ?? 'Search for "Dal"'}
                />
              </div>
              {onEditSection && (
                <div className="flex justify-end">
                  <EditLink onClick={() => onEditSection('config')} label="Edit hero & search" />
                </div>
              )}
            </div>
          </div>

          {/* Sections in app order – match mobile: padding 16/20, title 16px #222222, divider 214px, card 104px */}
          {orderedSectionKeys.map((sectionKey) => {
            switch (sectionKey) {
              case 'categories':
                return (
                  <div key="categories" className="px-4 py-5 bg-white gap-4" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 20, paddingBottom: 20 }}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <h3 className="text-[16px] font-medium leading-6 text-[#222222]" style={{ color: '#222222' }}>
                        {config?.categorySectionTitle ?? 'Grocery & Kitchen'}
                      </h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-[#797979] to-[#f5f5f5]" style={{ maxWidth: 214 }} />
                      {onEditSection && <EditLink onClick={() => onEditSection('categories')} />}
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                      {categories.slice(0, 6).map((c) => (
                        <div key={c._id} className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 104 }}>
                          <div className="rounded-xl bg-[#f4f4f5] overflow-hidden" style={{ width: 104, height: 104 }}>
                            {c.imageUrl ? (
                              <ImageWithFallback src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">?</div>
                            )}
                          </div>
                          <span className="text-[10px] text-center text-[#52525b] truncate w-full">{c.name}</span>
                        </div>
                      ))}
                    </div>
                    {categories.length === 0 && <p className="text-xs text-[#71717a]">No categories</p>}
                  </div>
                );
              case 'hero_banner':
                if (heroBanners.length === 0) return null;
                return (
                  <div key="hero_banner" className="py-5 bg-white" style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 20, paddingBottom: 20 }}>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ paddingLeft: 12 }}>
                      {heroBanners.map((b) => (
                        <div key={b._id} className="flex-shrink-0 overflow-hidden rounded-[12px] bg-[#f4f4f5]" style={{ width: 296, height: 340 * (296 / 351) }}>
                          <ImageWithFallback src={b.imageUrl} alt={b.title ?? 'Banner'} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {heroBanners.length > 1 && (
                      <div className="flex justify-center items-center gap-1 mt-3">
                        {heroBanners.map((_, i) => (
                          <div
                            key={i}
                            className="rounded-[4px] flex-shrink-0"
                            style={{
                              width: i === 0 ? 16 : 8,
                              height: 8,
                              backgroundColor: i === 0 ? '#034703' : '#BABABA',
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {onEditSection && <div className="flex justify-end mt-1"><EditLink onClick={() => onEditSection('banners')} /></div>}
                  </div>
                );
              case 'deals':
              case 'deals_2': {
                const s = sectionKey === 'deals_2' ? sections.deals_2 : sections.deals;
                const title = s?.title ?? 'Deals';
                const products = s?.products ?? [];
                return (
                  <div key={sectionKey} className="px-4 py-4 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-[16px] font-medium text-[#222222]">{title}</h3>
                      {onEditSection && <EditLink onClick={() => onEditSection('sections')} />}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(products as { _id?: string; name?: string; images?: string[]; price?: number }[]).slice(0, 4).map((p) => (
                        <div key={p._id ?? p.name} className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]">
                          <div className="w-24 h-24 bg-[#f4f4f5]">
                            {p.images?.[0] ? (
                              <ImageWithFallback src={p.images[0]} alt={p.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">—</div>
                            )}
                          </div>
                          <p className="text-[10px] truncate px-1 py-0.5 text-[#18181b]">{p.name ?? 'Product'}</p>
                          <p className="text-[10px] text-[#034703] font-medium px-1 pb-1">₹{typeof p.price === 'number' ? p.price : '—'}</p>
                        </div>
                      ))}
                    </div>
                    {products.length === 0 && <p className="text-xs text-[#71717a]">No products</p>}
                  </div>
                );
              }
              case 'wellbeing': {
                const s = sections.wellbeing;
                const products = s?.products ?? [];
                return (
                  <div key="wellbeing" className="px-4 py-4 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-[16px] font-medium text-[#222222]">Wellbeing</h3>
                      {onEditSection && <EditLink onClick={() => onEditSection('sections')} />}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(products as { _id?: string; name?: string; images?: string[] }[]).slice(0, 4).map((p) => (
                        <div key={p._id ?? p.name} className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]">
                          <div className="w-24 h-24 bg-[#f4f4f5]">
                            {p.images?.[0] ? (
                              <ImageWithFallback src={p.images[0]} alt={p.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">—</div>
                            )}
                          </div>
                          <p className="text-[10px] truncate px-1 py-0.5">{p.name ?? 'Product'}</p>
                        </div>
                      ))}
                    </div>
                    {products.length === 0 && <p className="text-xs text-[#71717a]">No products</p>}
                  </div>
                );
              }
              case 'greens_banner':
                if (!greensBanner?.imageUrl) return null;
                return (
                  <div key="greens_banner" className="pt-8 pb-2 bg-transparent" style={{ paddingLeft: 16, paddingRight: 16 }}>
                    <div className="w-full overflow-hidden rounded-[10px] bg-[#f4f4f5]" style={{ height: 96 }}>
                      <ImageWithFallback src={greensBanner.imageUrl} alt="Greens" className="w-full h-full object-cover" />
                    </div>
                    {onEditSection && <div className="flex justify-end mt-1"><EditLink onClick={() => onEditSection('promoblocks')} /></div>}
                  </div>
                );
              case 'section_image':
                if (!sectionImage?.imageUrl) return null;
                return (
                  <div key="section_image" className="px-4 py-5 bg-white" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 20, paddingBottom: 20 }}>
                    <div className="w-full overflow-hidden rounded-none bg-[#f4f4f5]">
                      <ImageWithFallback src={sectionImage.imageUrl} alt="Section" className="w-full h-full object-cover" style={{ aspectRatio: '2/1' }} />
                    </div>
                    {onEditSection && <div className="flex justify-end mt-1"><EditLink onClick={() => onEditSection('promoblocks')} /></div>}
                  </div>
                );
              case 'lifestyle':
                return (
                  <div key="lifestyle" className="relative overflow-hidden" style={{ minHeight: 140, background: '#9DE8F7', paddingTop: 16, paddingBottom: 20 }}>
                    <div className="flex gap-4 overflow-x-auto py-4 scrollbar-hide" style={{ paddingLeft: 8 }}>
                      {lifestyle.slice(0, 5).map((l) => (
                        <div key={l._id} className="relative flex-shrink-0 rounded-lg overflow-hidden bg-white/80 border border-white shadow-sm" style={{ width: 152 }}>
                          <div className="w-full bg-[#f4f4f5]" style={{ height: 111 }}>
                            {l.imageUrl ? (
                              <ImageWithFallback src={l.imageUrl} alt={(l.title ?? l.name) ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#71717a]">{(l.title ?? l.name) ?? '—'}</div>
                            )}
                          </div>
                          <div className="px-1.5 py-1 bg-white/90">
                            <span className="text-[10px] font-medium text-[#18181b] truncate block">{(l.title ?? l.name) ?? 'Lifestyle'}</span>
                            <span className="text-[9px] text-[#034703]">Explore Now</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {onEditSection && <div className="absolute top-2 right-2"><EditLink onClick={() => onEditSection('lifestyle')} /></div>}
                    {lifestyle.length === 0 && (
                      <p className="text-xs text-[#71717a] p-3 absolute inset-0 flex items-center">No lifestyle items</p>
                    )}
                  </div>
                );
              case 'new_deals': {
                const s = sections.new_deals;
                const title = s?.title ?? 'New Deals';
                const products = s?.products ?? [];
                return (
                  <div key="new_deals" className="px-4 py-4 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-[16px] font-medium text-[#222222]">{title}</h3>
                      {onEditSection && <EditLink onClick={() => onEditSection('sections')} />}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(products as { _id?: string; name?: string; images?: string[] }[]).slice(0, 4).map((p) => (
                        <div key={p._id ?? p.name} className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]">
                          <div className="w-24 h-24 bg-[#f4f4f5]">
                            {p.images?.[0] ? (
                              <ImageWithFallback src={p.images[0]} alt={p.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">—</div>
                            )}
                          </div>
                          <p className="text-[10px] truncate px-1 py-0.5">{p.name ?? 'Product'}</p>
                        </div>
                      ))}
                    </div>
                    {products.length === 0 && <p className="text-xs text-[#71717a]">No products</p>}
                  </div>
                );
              }
              case 'mid_banner':
                if (midBanners.length === 0) return null;
                return (
                  <div key="mid_banner" className="py-5 bg-white" style={{ paddingLeft: 16, paddingRight: 16 }}>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {midBanners.map((b) => (
                        <div key={b._id} className="flex-shrink-0 rounded-xl overflow-hidden bg-[#f4f4f5]" style={{ width: 288, height: 120 }}>
                          <ImageWithFallback src={b.imageUrl} alt={b.title ?? 'Banner'} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {onEditSection && <div className="flex justify-end mt-1"><EditLink onClick={() => onEditSection('banners')} /></div>}
                  </div>
                );
              case 'fresh_juice': {
                const s = sections.fresh_juice;
                const title = s?.title ?? 'Fresh Juice';
                const products = s?.products ?? [];
                return (
                  <div key="fresh_juice" className="px-4 py-4 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-[16px] font-medium text-[#222222]">{title}</h3>
                      {onEditSection && <EditLink onClick={() => onEditSection('sections')} />}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(products as { _id?: string; name?: string; images?: string[] }[]).slice(0, 4).map((p) => (
                        <div key={p._id ?? p.name} className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[#e4e4e7]">
                          <div className="w-24 h-24 bg-[#f4f4f5]">
                            {p.images?.[0] ? (
                              <ImageWithFallback src={p.images[0]} alt={p.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a1a1aa]">—</div>
                            )}
                          </div>
                          <p className="text-[10px] truncate px-1 py-0.5">{p.name ?? 'Product'}</p>
                        </div>
                      ))}
                    </div>
                    {products.length === 0 && <p className="text-xs text-[#71717a]">No products</p>}
                  </div>
                );
              }
              case 'organic_tagline':
                if (!config?.organicTagline) return null;
                return (
                  <div key="organic_tagline" className="px-4 py-5 bg-white" style={{ paddingLeft: 16, paddingRight: 16 }}>
                    <div className="relative min-h-[60px]">
                      <p className="text-sm text-[#222222] pr-8">{config.organicTagline}</p>
                      {config.organicIconUrl && (
                        <div className="absolute top-0 right-0 w-6 h-6">
                          <ImageWithFallback src={config.organicIconUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      {onEditSection && <EditLink onClick={() => onEditSection('config')} />}
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })}

          {orderedSectionKeys.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center text-sm text-[#71717a] px-4 py-8">
              No sections visible. Edit Config to set section order and visibility.
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
  );
}
