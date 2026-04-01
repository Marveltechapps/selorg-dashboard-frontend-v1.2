import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Search, X, Clock } from 'lucide-react';
import { cn } from "../lib/utils";
import { setPendingOrderSearch } from '../utils/pendingOrderSearch';
import {
  globalSearch,
  getSearchSuggestions,
  getRecentSearches,
  type GlobalSearchResult,
  type SearchItem,
  type SearchSuggestion,
} from '../api/shared/globalSearchApi';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  status?: 'normal' | 'warning' | 'critical';
}

function MetricCard({ label, value, trend, trendUp, status = 'normal' }: MetricCardProps) {
  return (
    <div className={cn(
      "flex flex-col p-3 rounded-xl border shadow-sm transition-all hover:shadow-md",
      status === 'critical' ? "bg-red-50 border-red-200" : 
      status === 'warning' ? "bg-[#FFFBE6] border-[#FFE58F]" : 
      "bg-white border-[#E0E0E0]"
    )}>
      <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-wider">{label}</span>
      <div className="flex items-end justify-between mt-1">
        <span className={cn(
          "text-2xl font-bold tracking-tight",
          status === 'critical' ? "text-[#EF4444]" : 
          status === 'warning' ? "text-[#D48806]" : 
          "text-[#212121]"
        )}>{value}</span>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-full",
            trendUp ? "text-[#22C55E] bg-[#DCFCE7]" : "text-[#EF4444] bg-[#FEE2E2]"
          )}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

const SAMPLE_NOTIFICATIONS = [
  { id: '1', title: 'Order ORD-3001 ready for dispatch', time: '2 min ago', unread: true },
  { id: '2', title: 'Stock low: SKU-101 Organic Milk', time: '15 min ago', unread: true },
  { id: '3', title: 'RTO risk: ORD-4001 - 2 attempts', time: '1 hr ago', unread: false },
  { id: '4', title: 'New batch picklist created', time: '2 hrs ago', unread: false },
];

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

const DARKSTORE_TABS = new Set([
  'overview',
  'liveorders',
  'cancelledorders',
  'pickpack',
  'pickpackops',
  'livepickingmonitor',
  'slamonitor',
  'missingitems',
  'exceptionqueue',
  'livepickerboard',
  'pickerperformance',
  'issues',
  'inventory',
  'inbound',
  'outbound',
  'qc',
  'staff',
  'health',
  'escalations',
  'alerts',
  'ops-alerts',
  'reports',
  'hsd',
  'utilities',
  'settings',
]);

const DEFAULT_TAB_BY_RESULT_CATEGORY: Record<string, string> = {
  orders: 'liveorders',
  products: 'inventory',
  users: 'staff',
  vendors: 'inbound',
  riders: 'livepickerboard',
  inventory: 'inventory',
};

function suggestionCategoryToTab(category: string, type: string): string {
  const c = `${category ?? ''} ${type ?? ''}`.toLowerCase();
  if (c.includes('inbound') || c.includes('po') || c.includes('vendor')) return 'inbound';
  if (c.includes('transfer')) return 'outbound';
  if (c.includes('inventory') || c.includes('sku') || c.includes('bin') || c.includes('product'))
    return 'inventory';
  if (c.includes('order') || c.includes('pick')) return 'liveorders';
  if (c.includes('user') || c.includes('admin')) return 'staff';
  if (c.includes('rider')) return 'livepickerboard';
  return 'inventory';
}

function inferDarkstoreTabFromRecentQuery(q: string): string {
  const t = q.trim();
  if (/^PO[-\d]?/i.test(t)) return 'inbound';
  if (/^TR[F-]?/i.test(t) || /transfer/i.test(t)) return 'outbound';
  if (/^ORD/i.test(t)) return 'liveorders';
  if (/^SKU/i.test(t) || /^BIN/i.test(t)) return 'inventory';
  if (/^USR|^USER/i.test(t)) return 'staff';
  if (/RIDER/i.test(t)) return 'livepickerboard';
  return 'inventory';
}

function formatResultSectionLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

interface TopBarProps {
  setActiveTab?: (tab: string) => void;
}

export function TopBar({ setActiveTab }: TopBarProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [shortcutLabel, setShortcutLabel] = useState('⌘K');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownPortalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownBox, setDropdownBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setShortcutLabel(mac ? '⌘K' : 'Ctrl+K');
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getRecentSearches(10, { dashboard: 'warehouse' })
      .then((r) => setRecentSearches(Array.isArray(r) ? r : []))
      .catch(() => setRecentSearches([]));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (setActiveTab) setActiveTab('liveorders');
    if (q) {
      navigate(`/darkstore/liveorders?q=${encodeURIComponent(q)}`, { replace: true });
      setPendingOrderSearch(q);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setResults(null);
    setSuggestions([]);
    inputRef.current?.focus();
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
    const q = searchQuery.trim();
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
            globalSearch(q, 'all', 10, { dashboard: 'warehouse' }),
            getSearchSuggestions(q, 5, { dashboard: 'warehouse' }),
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
  }, [searchQuery]);

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

  const showSearchPanel = useMemo(() => {
    const q = searchQuery.trim();
    return (
      searchOpen &&
      (q.length >= 2 || (q.length < 2 && recentSearches.length > 0) || (searchLoading && q.length >= 2))
    );
  }, [recentSearches.length, searchLoading, searchOpen, searchQuery]);

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

  const goDarkstore = useCallback(
    (tab: string, params?: Record<string, string>) => {
      const t = DARKSTORE_TABS.has(tab) ? tab : 'overview';
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && v !== '') sp.set(k, v);
        });
      }
      const qs = sp.toString();
      navigate(`/darkstore/${t}${qs ? `?${qs}` : ''}`, { replace: true });
      dismissSearchOverlay();
    },
    [navigate, dismissSearchOverlay]
  );

  const navigateSearchItem = useCallback(
    (category: string, item: SearchItem) => {
      const m = item.metadata as Record<string, unknown> | undefined;
      if (m && typeof m.href === 'string' && m.href.startsWith('/')) {
        navigate(m.href);
        dismissSearchOverlay();
        return;
      }

      const tab = DEFAULT_TAB_BY_RESULT_CATEGORY[category] ?? 'overview';
      if (tab === 'liveorders') {
        const q = String(item.id ?? item.title ?? '').trim();
        if (q) setPendingOrderSearch(q);
        goDarkstore('liveorders', q ? { q } : undefined);
        return;
      }
      goDarkstore(tab);
    },
    [dismissSearchOverlay, goDarkstore, navigate]
  );

  const navigateSuggestionPick = useCallback(
    (s: SearchSuggestion) => {
      const tab = suggestionCategoryToTab(s.category, s.type);
      if (tab === 'liveorders') {
        setPendingOrderSearch(s.text);
        goDarkstore('liveorders', { q: s.text });
        return;
      }
      goDarkstore(tab);
    },
    [goDarkstore]
  );

  const navigateRecentTerm = useCallback(
    (term: string) => {
      const tab = inferDarkstoreTabFromRecentQuery(term);
      if (tab === 'liveorders') {
        setPendingOrderSearch(term.trim());
        goDarkstore('liveorders', { q: term.trim() });
        return;
      }
      goDarkstore(tab);
    },
    [goDarkstore]
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
              'bg-gradient-to-b from-[#0f172a]/75 via-[#0f172a]/60 to-[#1677FF]/[0.16]',
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
          'h-[64px] bg-white border-b border-[#e4e4e7] fixed top-0 left-[220px] right-0 z-40 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0 transition-shadow duration-200',
          searchOpen ? 'z-[170] border-[#f0f0f3] shadow-[0_6px_24px_-8px_rgba(15,23,42,0.08)]' : 'z-40'
        )}
      >
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div ref={searchWrapRef} className="relative w-full min-w-0">
              <Search
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] shrink-0 pointer-events-none"
                size={16}
              />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={showSearchPanel}
                aria-autocomplete="list"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') dismissSearchOverlay();
                }}
                className="h-9 sm:h-10 pl-8 sm:pl-10 pr-[4.75rem] sm:pr-[6.25rem] w-full min-w-0 rounded-lg bg-[#f4f4f5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#1677FF] focus:border-transparent transition-all placeholder-[#a1a1aa] text-[#18181b]"
              />

              <div className="pointer-events-none absolute inset-y-0 right-1.5 sm:right-2 flex items-center justify-end gap-0.5 sm:gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    className="pointer-events-auto p-1 rounded-md text-[#a1a1aa] hover:bg-[#e4e4e7] hover:text-[#52525b]"
                    aria-label="Clear search"
                    onClick={clearSearch}
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
            </div>
          </form>

          {showSearchPanel && dropdownBox && (
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
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1677FF] border-t-transparent"
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
                        {recentSearches.map((term, idx) => (
                          <button
                            key={`${term}-${idx}`}
                            type="button"
                            onClick={() => navigateRecentTerm(term)}
                            className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2 py-1 text-xs text-[#3f3f46] transition-colors hover:border-[#1677FF]/40 hover:bg-[#E6F7FF]/60"
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
                        {suggestions.map((suggestion, idx) => (
                          <li key={`${suggestion.text}-${idx}`}>
                            <button
                              type="button"
                              onClick={() => navigateSuggestionPick(suggestion)}
                              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#18181b] transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#1677FF]/30"
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
                    searchQuery.trim().length >= 2 &&
                    results.total > 0 &&
                    Object.entries(results.results).map(([category, list]) => {
                      if (!Array.isArray(list) || list.length === 0) return null;
                      return (
                        <section key={category} className="border-b border-[#f4f4f5] last:border-b-0">
                          <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#f4f4f5] bg-white px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
                              {formatResultSectionLabel(category)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-[#64748b]">
                              {list.length}
                            </span>
                          </div>
                          <ul className="divide-y divide-[#f4f4f5] px-1 py-1">
                            {list.map((item: SearchItem) => (
                              <li key={`${category}-${item.id}`}>
                                <button
                                  type="button"
                                  onClick={() => navigateSearchItem(category, item)}
                                  className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#1677FF]/30"
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
                      );
                    })}

                  {!searchLoading &&
                    results &&
                    searchQuery.trim().length >= 2 &&
                    results.total === 0 && (
                      <div className="px-4 py-10 text-center text-sm text-[#71717a]">
                        No results for &ldquo;{searchQuery.trim()}&rdquo;
                      </div>
                    )}
                </div>
              </div>,
              document.body
            )
          )}

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((o) => !o)}
              className="relative p-2 text-[#71717a] hover:bg-[#f4f4f5] rounded-full transition-colors group"
            >
              <Bell size={20} className="group-hover:text-[#18181b]" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-2 top-full mt-2 w-80 bg-white border border-[#E0E0E0] rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-[#E0E0E0]">
                  <h3 className="font-bold text-sm text-[#212121]">Notifications</h3>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {SAMPLE_NOTIFICATIONS.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-[#F5F5F5] transition-colors",
                        n.unread && "bg-[#E6F7FF]/50"
                      )}
                      onClick={() => {
                        setNotificationsOpen(false);
                        if (setActiveTab) setActiveTab('alerts');
                      }}
                    >
                      <p className="text-sm font-medium text-[#212121]">{n.title}</p>
                      <p className="text-xs text-[#757575] mt-0.5">{n.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
