import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight, Bell, BellRing, Search, X, Clock, ShieldCheck, Menu } from 'lucide-react';
import {
  globalSearch,
  getRecentSearches,
  getSearchSuggestions,
  type GlobalSearchResult,
  type SearchItem,
  type SearchSuggestion,
} from '../../api/shared/globalSearchApi';
import { fetchProductionAlerts } from '../../api/productionApi';
import { useProductionFactory } from '../../contexts/ProductionFactoryContext';

const PRODUCTION_TAB_MAP: Record<string, string> = {
  order: 'work_orders',
  orders: 'work_orders',
  product: 'raw_materials',
  products: 'raw_materials',
  user: 'workforce',
  users: 'workforce',
  vendor: 'raw_materials',
  riders: 'work_orders',
  inventory: 'raw_materials',
};

function resultTypeBadgeClass(type: string): string {
  const colors: Record<string, string> = {
    order: 'bg-blue-100 text-blue-800',
    product: 'bg-green-100 text-green-800',
    user: 'bg-purple-100 text-purple-800',
    vendor: 'bg-orange-100 text-orange-800',
    rider: 'bg-yellow-100 text-yellow-800',
    inventory: 'bg-cyan-100 text-cyan-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

interface ProductionNotification {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  status?: string;
  severity?: string;
  timestamp?: string;
  createdAt?: string;
}

async function fetchProductionNotifications(
  factoryId: string | null,
  limit: number = 15
): Promise<ProductionNotification[]> {
  if (!factoryId) return [];
  try {
    const res = await fetchProductionAlerts({
      status: 'active',
      factoryId,
    });
    const alerts = res.alerts ?? [];
    return alerts.slice(0, limit).map((a) => ({
      id: a.id,
      title: a.title ?? 'Notification',
      description: a.description,
      status: a.status,
      severity: a.severity,
      timestamp: a.timestamp,
      createdAt: a.timestamp ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

const DEBOUNCE_MS = 300;

function envBadge(): { label: string; className: string } | null {
  const custom = (import.meta.env.VITE_ENV_LABEL as string | undefined)?.trim();
  if (custom) {
    return {
      label: custom,
      className: 'bg-slate-50 rounded-full border border-slate-200 text-slate-800',
    };
  }
  if (import.meta.env.DEV) {
    return {
      label: 'Development',
      className: 'bg-slate-50 rounded-full border border-slate-200 text-slate-700',
    };
  }
  return {
    label: 'Production',
    className: 'bg-rose-50 rounded-full border border-rose-100 text-rose-900',
  };
}

function formatTimeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export interface ProductionTopBarProps {
  setActiveTab?: (tab: string) => void;
  onOpenDowntime?: () => void;
  onMenuClick?: () => void;
}

export function ProductionTopBar({ setActiveTab, onMenuClick }: ProductionTopBarProps = {}) {
  const navigate = useNavigate();
  const badge = envBadge();
  const { selectedFactoryId } = useProductionFactory();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [notifications, setNotifications] = useState<ProductionNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState('⌘K');
  const [dropdownBox, setDropdownBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownPortalRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q?.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults(null);
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      // Production top bar only supports Work Orders (orders) + Raw Materials (products).
      const [ordersRes, productsRes, sugg] = await Promise.all([
        globalSearch(trimmed, 'orders', 15, { dashboard: 'warehouse' }),
        globalSearch(trimmed, 'products', 15, { dashboard: 'warehouse' }),
        getSearchSuggestions(trimmed, 5, { dashboard: 'warehouse' }),
      ]);

      const merged: GlobalSearchResult = {
        query: trimmed,
        results: {
          orders: ordersRes.results.orders,
          products: productsRes.results.products,
          users: [],
          vendors: [],
          riders: [],
          inventory: [],
        },
        total: ordersRes.results.orders.length + productsRes.results.products.length,
        took: ordersRes.took + productsRes.took,
      };

      setSearchResults(merged);
      setSuggestions(
        Array.isArray(sugg)
          ? sugg.filter((s) => {
              const cat = (s.category ?? '').toLowerCase();
              const type = (s.type ?? '').toLowerCase();
              return cat.includes('order') || cat.includes('product') || type === 'order' || type === 'product';
            })
          : []
      );
    } catch {
      setSearchResults(null);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setShortcutLabel(mac ? '⌘K' : 'Ctrl+K');
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSuggestions([]);
      getRecentSearches(8, { dashboard: 'warehouse' })
        .then(setRecentSearches)
        .catch(() => setRecentSearches([]));
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(searchQuery), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    if (!notificationsOpen || !selectedFactoryId) return;
    setNotificationsLoading(true);
    fetchProductionNotifications(selectedFactoryId, 15)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  }, [notificationsOpen, selectedFactoryId]);

  useEffect(() => {
    if (!selectedFactoryId) {
      setNotifications([]);
      return;
    }
    fetchProductionNotifications(selectedFactoryId, 8).then(setNotifications).catch(() => setNotifications([]));
  }, [selectedFactoryId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const inSearch =
        !!searchWrapRef.current?.contains(target) || !!searchDropdownPortalRef.current?.contains(target);
      if (!inSearch) setSearchOpen(false);

      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const notificationCount = useMemo(() => notifications.length, [notifications]);

  const dismissSearchOverlay = useCallback(() => {
    setSearchOpen(false);
    inputRef.current?.blur();
  }, []);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    setSearchOpen(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const closeSearchUi = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissSearchOverlay();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [searchOpen, dismissSearchOverlay]);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      if (event.repeat) return;
      event.preventDefault();
      inputRef.current?.focus();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showSearchPanel =
    searchOpen &&
    (searchQuery.trim().length >= 2 ||
      (searchQuery.trim().length < 2 && recentSearches.length > 0) ||
      (searchLoading && searchQuery.trim().length >= 2));

  useLayoutEffect(() => {
    if (!showSearchPanel) {
      setDropdownBox(null);
      return;
    }

    const el = searchWrapRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setDropdownBox({ top: r.bottom + 6, left: r.left, width: r.width });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showSearchPanel]);

  const handleSearchResultClick = useCallback(
    (_item: SearchItem) => {
      closeSearchUi();
    },
    [closeSearchUi]
  );

  const handleSuggestionClick = useCallback(
    (_s: SearchSuggestion) => {
      closeSearchUi();
    },
    [closeSearchUi]
  );

  return (
    <>
      {searchOpen &&
        createPortal(
          <div
            role="presentation"
            aria-hidden
            className={cn(
              'fixed inset-0 z-[160] transition-opacity duration-200 motion-reduce:transition-none',
              'bg-gradient-to-b from-[#0f172a]/75 via-[#0f172a]/60 to-[#e11d48]/[0.16]',
              'backdrop-blur-[7px] supports-[backdrop-filter]:backdrop-blur-lg'
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              dismissSearchOverlay();
            }}
          />,
          document.body
        )}
      <div
        className={cn(
          'production-topbar h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-0 right-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0 transition-shadow duration-200',
          searchOpen ? 'z-[170] border-[#f0f0f3] shadow-[0_6px_24px_-8px_rgba(15,23,42,0.08)]' : 'z-40'
        )}
      >
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="production-mobile-only p-2 -ml-1 rounded-lg text-[#52525b] hover:bg-[#f4f4f5]"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        )}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
          <div ref={searchWrapRef} className="relative z-[1] w-full min-w-0">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] shrink-0 pointer-events-none" size={16} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showSearchPanel}
              aria-autocomplete="list"
              autoComplete="off"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') dismissSearchOverlay();
              }}
              className="h-9 sm:h-10 pl-8 sm:pl-10 pr-[4.75rem] sm:pr-[6.25rem] w-full min-w-0 rounded-lg bg-[#f4f4f5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#e11d48] focus:border-transparent transition-all placeholder-[#a1a1aa] text-[#18181b]"
            />
            <div className="pointer-events-none absolute inset-y-0 right-1.5 sm:right-2 flex items-center justify-end gap-0.5 sm:gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="pointer-events-auto p-1 rounded-md text-[#a1a1aa] hover:bg-[#e4e4e7] hover:text-[#52525b]"
                  aria-label="Clear search"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={focusSearch}
                title={`Focus search (${shortcutLabel})`}
                aria-keyshortcuts="Meta+K Control+K"
                className="pointer-events-auto inline-flex shrink-0 items-center justify-center rounded border border-[#d4d4d8] bg-white px-1 py-0.5 text-[9px] font-mono leading-none text-[#71717a] hover:bg-[#f4f4f5] transition-colors sm:px-1.5 sm:text-[10px] sm:py-0.5"
              >
                {shortcutLabel}
              </button>
            </div>

            {showSearchPanel &&
              dropdownBox &&
              createPortal(
                <div
                  ref={searchDropdownPortalRef}
                  role="listbox"
                  className="fixed isolate z-[180] flex max-h-[min(28rem,72vh)] min-w-[min(100%,280px)] flex-col overflow-hidden rounded-xl border border-[#f0f0f3] bg-white shadow-[0_12px_36px_-10px_rgba(15,23,42,0.12)]"
                  style={{
                    top: dropdownBox.top,
                    left: dropdownBox.left,
                    width: dropdownBox.width,
                  }}
                >
                  {searchLoading && searchQuery.trim().length >= 2 && (
                    <div className="shrink-0 border-b border-[#f4f4f5] bg-[#fafafa] px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-[#52525b]">
                        <span
                          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e11d48] border-t-transparent"
                          aria-hidden
                        />
                        Searching…
                      </div>
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth [scrollbar-gutter:stable]">
                    {!searchLoading && searchQuery.trim().length < 2 && recentSearches.length > 0 && (
                      <div className="border-b border-[#f4f4f5] p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#71717a]">
                          <Clock size={12} className="shrink-0" />
                          Recent
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.slice(0, 5).map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => {
                                setSearchQuery(term);
                                runSearch(term);
                              }}
                              className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2 py-1 text-xs text-[#3f3f46] transition-colors hover:border-[#e11d48]/40 hover:bg-rose-50/80"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!searchLoading && suggestions.length > 0 && searchQuery.trim().length >= 2 && (
                      <div className="border-b border-[#f4f4f5] p-3">
                        <div className="mb-1.5 text-xs font-semibold text-[#71717a]">Suggestions</div>
                        <ul className="space-y-0.5">
                          {suggestions.map((s, idx) => (
                            <li key={`${s.text}-${idx}`}>
                              <button
                                type="button"
                                onClick={() => handleSuggestionClick(s)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#18181b] transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#e11d48]/30"
                              >
                                <span className="min-w-0 truncate">{s.text}</span>
                                <ArrowRight size={14} className="shrink-0 text-[#a1a1aa]" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!searchLoading && searchResults && searchQuery.trim().length >= 2 && searchResults.total > 0 && (
                      <>
                        {[
                          { key: 'orders', label: 'Orders', items: searchResults.results.orders },
                          { key: 'products', label: 'Products', items: searchResults.results.products },
                        ].map((section) =>
                          section.items.length > 0 ? (
                            <section key={section.key} className="border-b border-[#f4f4f5] last:border-b-0">
                              <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#f4f4f5] bg-white px-3 py-2">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
                                  {section.label}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-[#64748b]">
                                  {section.items.length}
                                </span>
                              </div>
                              <ul className="divide-y divide-[#f4f4f5] px-1 py-1">
                                {section.items.map((item: SearchItem) => (
                                  <li key={`${section.key}-${item.id}`}>
                                    <button
                                      type="button"
                                      onClick={() => handleSearchResultClick(item)}
                                      className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#e11d48]/30"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="truncate text-sm font-medium text-[#18181b]">{item.title}</span>
                                          <span
                                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${resultTypeBadgeClass(
                                              item.type
                                            )}`}
                                          >
                                            {item.type}
                                          </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-[#71717a]">{item.subtitle}</p>
                                      </div>
                                      <ArrowRight size={14} className="mt-0.5 shrink-0 text-[#a1a1aa]" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ) : null
                        )}
                      </>
                    )}

                    {!searchLoading && searchResults && searchQuery.trim().length >= 2 && searchResults.total === 0 && (
                      <div className="px-4 py-10 text-center text-sm text-[#71717a]">
                        No results for &ldquo;{searchQuery}&rdquo;
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        <div className="relative z-[2] flex shrink-0 min-w-0 items-center gap-1 sm:gap-4 ml-1 sm:ml-6">
          {badge && (
            <div className={cn('hidden sm:flex items-center gap-2 px-3 py-1.5', badge.className)}>
              <ShieldCheck size={14} className={import.meta.env.DEV ? 'text-slate-600' : 'text-[#e11d48]'} />
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          )}

          <div className="h-6 w-px bg-[#e4e4e7] mx-0 sm:mx-2 hidden sm:block shrink-0" />

          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              type="button"
              className="relative p-2 text-[#71717a] hover:bg-[#f4f4f5] rounded-full transition-colors group shrink-0"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              {notificationsOpen ? (
                <BellRing size={20} className="text-[#71717a]" />
              ) : (
                <Bell size={20} className="group-hover:text-[#18181b]" />
              )}
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#e11d48] rounded-full border border-white text-[10px] leading-4 text-white text-center font-bold">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#e4e4e7] rounded-xl shadow-2xl overflow-hidden"
                style={{ width: '460px', maxWidth: 'calc(100vw - 24px)' }}
              >
                <div className="px-4 py-3 border-b border-[#e4e4e7] flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#18181b]">Notifications</h4>
                  <span className="text-xs text-[#71717a]">{notificationCount} latest</span>
                </div>
                <div className="min-h-[300px] max-h-[min(75vh,540px)] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-4 py-6 text-sm text-[#71717a] text-center">Loading notifications...</div>
                  ) : notificationCount === 0 ? (
                    <div className="px-4 py-6 text-sm text-[#71717a] text-center">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id ?? n._id ?? n.title}
                        className="px-4 py-3 border-b border-[#f4f4f5] last:border-b-0 hover:bg-[#fafafa]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#18181b] truncate">{n.title || 'Notification'}</p>
                          {(n.createdAt || n.timestamp) && (
                            <span className="text-[10px] text-[#71717a] shrink-0">
                              {formatTimeAgo(n.createdAt ?? n.timestamp ?? '')}
                            </span>
                          )}
                        </div>
                        {n.description && (
                          <p className="text-xs text-[#52525b] mt-1 line-clamp-2">{n.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10px]">
                          {n.severity && (
                            <span className="px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[#52525b] uppercase">{n.severity}</span>
                          )}
                          {n.status && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 uppercase">{n.status}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
