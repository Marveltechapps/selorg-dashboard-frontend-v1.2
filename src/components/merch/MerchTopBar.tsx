import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, BellRing, Search, X, ArrowRight, Clock, Menu, ShieldCheck } from 'lucide-react';
import {
  globalSearch,
  getSearchSuggestions,
  getRecentSearches,
  type GlobalSearchResult,
  type SearchItem,
  type SearchSuggestion,
} from '@/api/shared/globalSearchApi';
import { fetchHistory, type NotificationHistory } from '@/components/screens/admin/notificationsApi';

interface MerchTopBarProps {
  onMenuClick?: () => void;
  filterQuery?: string;
  onFilterQueryChange?: (value: string) => void;
}

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

const MERCH_TABS = new Set([
  'overview',
  'catalog',
  'pricing',
  'promotions',
  'allocation',
  'geofence',
  'analytics',
  'alerts',
  'compliance',
]);

const DEFAULT_MERCH_TAB_BY_RESULT_CATEGORY: Record<string, string> = {
  orders: 'overview',
  products: 'catalog',
  users: 'overview',
  vendors: 'overview',
  riders: 'overview',
  inventory: 'allocation',
};

function suggestionCategoryToMerchTab(category: string, type: string): string {
  const c = `${category ?? ''} ${type ?? ''}`.toLowerCase();
  if (c.includes('campaign') || c.includes('promo')) return 'promotions';
  if (c.includes('price') || c.includes('markdown')) return 'pricing';
  if (c.includes('allocation') || c.includes('stock')) return 'allocation';
  if (c.includes('geofence') || c.includes('zone')) return 'geofence';
  if (c.includes('warehouse') || c.includes('transfer') || c.includes('replenish') || c.includes('expir')) {
    return 'allocation';
  }
  if (c.includes('alert')) return 'alerts';
  if (c.includes('compliance') || c.includes('approval')) return 'compliance';
  if (c.includes('analytics') || c.includes('forecast')) return 'analytics';
  if (c.includes('vendor')) return 'overview';
  if (c.includes('inventory') || c.includes('sku') || c.includes('transaction')) return 'allocation';
  if (c.includes('catalog') || c.includes('product')) return 'catalog';
  return 'overview';
}

function inferMerchTabFromRecentQuery(q: string): string {
  const t = q.trim();
  if (/^SKU/i.test(t) || /inventory/i.test(t)) return 'allocation';
  if (/campaign|promo/i.test(t)) return 'promotions';
  if (/price|markdown/i.test(t)) return 'pricing';
  if (/vendor/i.test(t)) return 'overview';
  if (/alert/i.test(t)) return 'alerts';
  return 'catalog';
}

function formatResultSectionLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

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

export function MerchTopBar({ onMenuClick, filterQuery, onFilterQueryChange }: MerchTopBarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const badge = envBadge();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [shortcutLabel, setShortcutLabel] = useState('⌘K');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownPortalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownBox, setDropdownBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setShortcutLabel(mac ? '⌘K' : 'Ctrl+K');
  }, []);

  useEffect(() => {
    getRecentSearches(10)
      .then((r) => setRecentSearches(Array.isArray(r) ? r : []))
      .catch(() => setRecentSearches([]));
  }, []);

  const dismissSearchOverlay = useCallback(() => {
    setSearchOpen(false);
    inputRef.current?.blur();
  }, []);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setResults(null);
      setSuggestions([]);
      (async () => {
        try {
          const [searchResults, sugg] = await Promise.all([
            globalSearch(q, 'all', 10),
            getSearchSuggestions(q, 5),
          ]);
          if (cancelled) return;
          setResults(searchResults);
          setSuggestions(Array.isArray(sugg) ? sugg.filter((s) => s?.text) : []);
        } catch {
          if (!cancelled) {
            setResults(null);
            setSuggestions([]);
          }
        } finally {
          if (!cancelled) setSearchLoading(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setSearchLoading(false);
    };
  }, [query]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchWrapRef.current?.contains(target)) return;
      if (searchDropdownPortalRef.current?.contains(target)) return;
      dismissSearchOverlay();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dismissSearchOverlay]);

  useEffect(() => {
    if (!searchOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      dismissSearchOverlay();
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

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const closeSearchUi = useCallback((preserveQuery?: string) => {
    setSearchOpen(false);
    setQuery(preserveQuery ?? '');
    setResults(null);
    setSuggestions([]);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') ?? '';
    setQuery(q);
    onFilterQueryChange?.(q);
  }, [location.search, onFilterQueryChange]);

  useEffect(() => {
    if (!location.pathname.startsWith('/merch')) return;
    const timer = window.setTimeout(() => {
      const sp = new URLSearchParams(location.search);
      const trimmed = query.trim();
      if (trimmed) sp.set('q', trimmed);
      else sp.delete('q');
      const nextSearch = sp.toString();
      const currentSearch = location.search.replace(/^\?/, '');
      if (nextSearch === currentSearch) return;
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true }
      );
      onFilterQueryChange?.(trimmed);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, location.pathname, location.search, navigate, onFilterQueryChange]);

  const goMerch = useCallback(
    (tab: string, params?: Record<string, string>) => {
      const t = MERCH_TABS.has(tab) ? tab : 'overview';
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && v !== '') sp.set(k, v);
        });
      }
      const qs = sp.toString();
      const q = params?.q?.trim() ?? '';
      navigate(`/merch/${t}${qs ? `?${qs}` : ''}`);
      closeSearchUi(q);
      onFilterQueryChange?.(q);
    },
    [navigate, closeSearchUi, onFilterQueryChange]
  );

  const navigateSearchItem = useCallback(
    (category: string, item: SearchItem) => {
      const m = item.metadata as Record<string, unknown> | undefined;
      if (m && typeof m.href === 'string' && m.href.startsWith('/')) {
        navigate(m.href);
        closeSearchUi();
        return;
      }
      const fromMeta =
        typeof m?.merchTab === 'string' && MERCH_TABS.has(m.merchTab)
          ? m.merchTab
          : typeof m?.tab === 'string' && MERCH_TABS.has(m.tab)
            ? m.tab
            : null;
      const tab = fromMeta ?? DEFAULT_MERCH_TAB_BY_RESULT_CATEGORY[category] ?? 'overview';
      goMerch(tab, { highlight: item.id, kind: item.type });
    },
    [navigate, goMerch, closeSearchUi]
  );

  const navigateSuggestionPick = useCallback(
    (s: SearchSuggestion) => {
      const tab = suggestionCategoryToMerchTab(s.category, s.type);
      goMerch(tab, { q: s.text });
    },
    [goMerch]
  );

  const navigateRecentTerm = useCallback(
    (term: string) => {
      goMerch(inferMerchTabFromRecentQuery(term), { q: term.trim() });
    },
    [goMerch]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const history = await fetchHistory().catch(() => []);
      if (!active) return;
      setItems(Array.isArray(history) ? history.slice(0, 12) : []);
      setLoading(false);
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadLatest = async () => {
      setLoading(true);
      const history = await fetchHistory().catch(() => []);
      if (!active) return;
      setItems(Array.isArray(history) ? history.slice(0, 12) : []);
      setLoading(false);
    };
    loadLatest();
    const timer = window.setInterval(loadLatest, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.status !== 'opened' && item.status !== 'clicked').length,
    [items]
  );

  const formatTimeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const showSearchPanel =
    searchOpen &&
    (query.trim().length >= 2 ||
      (query.trim().length < 2 && recentSearches.length > 0) ||
      (searchLoading && query.trim().length >= 2));

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

  return (
    <>
      {searchOpen &&
        createPortal(
          <div
            role="presentation"
            aria-hidden
            className={cn(
              'fixed inset-0 z-[160] transition-opacity duration-200 motion-reduce:transition-none',
              'bg-gradient-to-b from-[#0f172a]/75 via-[#0f172a]/60 to-[#7C3AED]/[0.18]',
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
          'merch-topbar admin-topbar h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-0 right-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0 transition-shadow duration-200',
          searchOpen ? 'z-[170] border-[#f0f0f3] shadow-[0_6px_24px_-8px_rgba(15,23,42,0.08)]' : 'z-40'
        )}
      >
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="merch-mobile-only p-2 -ml-1 mr-1 shrink-0 text-[#71717a] hover:bg-[#f4f4f5] rounded-lg"
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
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                onFilterQueryChange?.(v);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') dismissSearchOverlay();
              }}
              className="h-9 sm:h-10 pl-8 sm:pl-10 pr-[4.75rem] sm:pr-[6.25rem] w-full min-w-0 rounded-lg bg-[#f4f4f5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all placeholder-[#a1a1aa] text-[#18181b]"
            />
            <div className="pointer-events-none absolute inset-y-0 right-1.5 sm:right-2 flex items-center justify-end gap-0.5 sm:gap-1">
              {query ? (
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
                  {searchLoading && query.trim().length >= 2 && (
                    <div className="shrink-0 border-b border-[#f4f4f5] bg-[#fafafa] px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-[#52525b]">
                        <span
                          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent"
                          aria-hidden
                        />
                        Searching…
                      </div>
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth [scrollbar-gutter:stable]">
                    {!searchLoading && query.trim().length < 2 && recentSearches.length > 0 && (
                      <div className="border-b border-[#f4f4f5] p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#71717a]">
                          <Clock size={12} className="shrink-0" />
                          Recent
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term, idx) => (
                            <button
                              key={`${term}-${idx}`}
                              type="button"
                              onClick={() => navigateRecentTerm(term)}
                              className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2 py-1 text-xs text-[#3f3f46] transition-colors hover:border-[#7C3AED]/40 hover:bg-[#F3E8FF]/80"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!searchLoading && suggestions.length > 0 && query.trim().length >= 2 && (
                      <div className="border-b border-[#f4f4f5] p-3">
                        <div className="mb-1.5 text-xs font-semibold text-[#71717a]">Suggestions</div>
                        <ul className="space-y-0.5">
                          {suggestions.map((suggestion, idx) => (
                            <li key={`${suggestion.text}-${idx}`}>
                              <button
                                type="button"
                                onClick={() => navigateSuggestionPick(suggestion)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#18181b] transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30"
                              >
                                <span className="min-w-0 truncate">{suggestion.text}</span>
                                <ArrowRight size={14} className="shrink-0 text-[#a1a1aa]" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!searchLoading &&
                      results &&
                      query.trim().length >= 2 &&
                      results.total > 0 &&
                      Object.entries(results.results).map(([type, list]) => {
                        if (!list?.length) return null;
                        return (
                          <section key={type} className="border-b border-[#f4f4f5] last:border-b-0">
                            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#f4f4f5] bg-white px-3 py-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
                                {formatResultSectionLabel(type)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-[#64748b]">
                                {list.length}
                              </span>
                            </div>
                            <ul className="divide-y divide-[#f4f4f5] px-1 py-1">
                              {list.map((item) => (
                                <li key={`${type}-${item.id}`}>
                                  <button
                                    type="button"
                                    onClick={() => navigateSearchItem(type, item)}
                                    className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-medium text-[#18181b]">{item.title}</span>
                                        <span
                                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${resultTypeBadgeClass(item.type)}`}
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
                        );
                      })}

                    {!searchLoading &&
                      results &&
                      query.trim().length >= 2 &&
                      results.total === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-[#71717a]">
                          No results for &ldquo;{query.trim()}&rdquo;
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
              <ShieldCheck size={14} className={import.meta.env.DEV ? 'text-slate-600' : 'text-[#7C3AED]'} />
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
              onClick={() => setOpen((prev) => !prev)}
            >
              {open ? (
                <BellRing size={20} className="text-[#71717a]" />
              ) : (
                <Bell size={20} className="group-hover:text-[#18181b]" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#7C3AED] rounded-full border border-white text-[10px] leading-4 text-white text-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {open && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#e4e4e7] rounded-xl shadow-2xl overflow-hidden"
                style={{ width: '460px', maxWidth: 'calc(100vw - 24px)' }}
              >
                <div className="px-4 py-3 border-b border-[#e4e4e7] flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#18181b]">Notifications</h4>
                  <span className="text-xs text-[#71717a]">{items.length} latest</span>
                </div>
                <div className="min-h-[300px] max-h-[min(75vh,540px)] overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-6 text-sm text-[#71717a] text-center">Loading notifications...</div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[#71717a] text-center">No notifications yet</div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="px-4 py-3 border-b border-[#f4f4f5] last:border-b-0 hover:bg-[#fafafa]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#18181b] truncate">
                            {item.title || item.templateName || 'Notification'}
                          </p>
                          <span className="text-[10px] text-[#71717a] shrink-0">{formatTimeAgo(item.sentAt)}</span>
                        </div>
                        <p className="text-xs text-[#52525b] mt-1 line-clamp-2">{item.body || 'No message body'}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[#52525b] uppercase">{item.channel}</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 uppercase">{item.status}</span>
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
