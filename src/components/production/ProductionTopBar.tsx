import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Activity, X, Package, FileText, Loader2 } from 'lucide-react';
import { globalSearch, getRecentSearches, type GlobalSearchResult, type SearchItem } from '../../api/shared/globalSearchApi';
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

export interface ProductionTopBarProps {
  setActiveTab?: (tab: string) => void;
  onOpenDowntime?: () => void;
}

export function ProductionTopBar({ setActiveTab, onOpenDowntime }: ProductionTopBarProps = {}) {
  const navigate = useNavigate();
  const { selectedFactoryId, factories } = useProductionFactory();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<ProductionNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [mode, setMode] = useState<'production' | 'downtime'>('production');
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await globalSearch(q.trim(), 'all', 15);
      setSearchResults(result);
    } catch {
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      getRecentSearches(8).then(setRecentSearches).catch(() => setRecentSearches(['ORD-1001', 'SKU-101', 'PO-2024-001']));
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
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = useCallback(
    (item: SearchItem) => {
      setSearchOpen(false);
      setSearchQuery('');
      setSearchResults(null);
      const tab = PRODUCTION_TAB_MAP[item.type] ?? 'work_orders';
      setActiveTab?.(tab);
      const search = item.id ? `?highlight=${encodeURIComponent(item.id)}` : '';
      navigate(`/production/${tab}${search}`, { replace: true });
    },
    [navigate, setActiveTab]
  );

  const handleDowntimeClick = () => {
    setMode('downtime');
    onOpenDowntime?.();
  };

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[220px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#212121]">
            {factories.find((f) => f.id === selectedFactoryId)?.name ?? 'Production'}
          </span>
          <span className="bg-[#DCFCE7] text-[#166534] text-xs font-bold px-2 py-0.5 rounded-full border border-[#166534]/20">
            RUNNING
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('production')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors ${
              mode === 'production' ? 'bg-white shadow-sm text-[#16A34A]' : 'text-[#9E9E9E] hover:text-[#212121]'
            }`}
          >
            <Activity size={12} fill="currentColor" />
            Production
          </button>
          <button
            type="button"
            onClick={handleDowntimeClick}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
              mode === 'downtime' ? 'bg-white shadow-sm text-[#F59E0B]' : 'text-[#9E9E9E] hover:text-[#212121]'
            }`}
          >
            Downtime
          </button>
        </div>

        <div className="relative" ref={searchWrapRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input
            type="text"
            placeholder="Search job card #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A] focus:border-transparent w-48 transition-all focus:w-64 placeholder-[#BDBDBD] text-[#212121]"
          />
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E0E0E0] rounded-lg shadow-lg z-50 max-h-[360px] overflow-y-auto">
              {searchLoading && (
                <div className="flex items-center justify-center py-6 text-[#757575]">
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Searching...
                </div>
              )}
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults && (
                <>
                  <div className="p-2 border-b border-[#E0E0E0] text-xs text-[#757575]">
                    {searchResults.total} result(s)
                  </div>
                  {[
                    { key: 'orders', label: 'Orders', items: searchResults.results.orders, icon: FileText },
                    { key: 'products', label: 'Products', items: searchResults.results.products, icon: Package },
                  ].map(
                    (section) =>
                      section.items.length > 0 && (
                        <div key={section.key} className="py-1">
                          <div className="px-3 py-1.5 text-xs font-semibold text-[#757575] flex items-center gap-2">
                            <section.icon size={12} />
                            {section.label}
                          </div>
                          {section.items.map((item: SearchItem) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSearchResultClick(item)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F5F5F5] text-left text-sm"
                            >
                              <span className="font-medium text-[#212121] truncate">{item.title}</span>
                              <span className="text-xs text-[#757575] truncate flex-1">{item.subtitle}</span>
                            </button>
                          ))}
                        </div>
                      )
                  )}
                  {searchResults.total === 0 && (
                    <div className="py-6 text-center text-[#757575] text-sm">No results for &quot;{searchQuery}&quot;</div>
                  )}
                </>
              )}
              {!searchLoading && searchQuery.trim().length < 2 && (
                <div className="p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-[#757575]">Recent searches</div>
                  {recentSearches.slice(0, 5).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        runSearch(term);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-[#F5F5F5] text-left text-sm text-[#212121]"
                    >
                      <Search size={14} className="text-[#9E9E9E]" />
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={notifWrapRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-[#EF4444] rounded-full border-2 border-white">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute top-full right-2 mt-1 w-[320px] bg-white border border-[#E0E0E0] rounded-lg shadow-lg z-50 max-h-[360px] overflow-y-auto">
              <div className="p-3 border-b border-[#E0E0E0] flex justify-between items-center">
                <span className="font-semibold text-[#212121]">Notifications</span>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="p-1 rounded hover:bg-[#F5F5F5] text-[#757575]">
                  <X size={16} />
                </button>
              </div>
              {notificationsLoading && (
                <div className="flex items-center justify-center py-8 text-[#757575]">
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Loading...
                </div>
              )}
              {!notificationsLoading && notifications.length === 0 && (
                <div className="py-8 text-center text-[#757575] text-sm">No notifications</div>
              )}
              {!notificationsLoading &&
                notifications.length > 0 &&
                notifications.map((n) => (
                  <div key={n.id ?? n._id ?? n.title} className="p-3 border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA]">
                    <p className="font-medium text-[#212121] text-sm">{n.title}</p>
                    {n.description && <p className="text-xs text-[#757575] mt-0.5">{n.description}</p>}
                    {(n.createdAt || n.timestamp) && (
                      <p className="text-[10px] text-[#9E9E9E] mt-1">
                        {new Date(n.createdAt ?? n.timestamp ?? '').toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
